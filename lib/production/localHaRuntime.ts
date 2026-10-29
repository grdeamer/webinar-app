import { mediaHostAllowed } from './hosted/transportPolicy.ts'
import { freshMediaToken } from './freshMediaToken.ts'
import { haRuntimeBudget } from './haSoakPlan.ts'
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdirSync, mkdtempSync, openSync, closeSync, writeFileSync, rmSync, readFileSync, appendFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn, type ChildProcess } from 'node:child_process'
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk'
import { chromium, type BrowserServer } from 'playwright-core'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { LocalSqliteProductionStore } from './localSqliteStore.ts'
import { seedLocalProduction, LOCAL_SCOPE } from './localWorkbench.ts'
import { LocalMediaSession } from './localMediaSession.ts'
import { commitProductionCommand } from './commandService.ts'
import type { ProductionCommand } from './contracts.ts'
import { parseMediaReport } from './mediaHealth.ts'
import { LocalHaAuthority, type HaCandidate } from './localHaAuthority.ts'
import { parityFixtures } from './parityFixtures.ts'
import { writePrivateJson } from './localAtomicFile.ts'

export type HaWorker = 'source-a' | 'source-b' | 'primary' | 'standby' | 'gateway' | 'ha-observer' | `ha-load-${number}`
export function haObserverWorker(worker: string) { return worker === 'ha-observer' || /^ha-load-(?:[2-9]|10)$/.test(worker) }
const roles: HaWorker[] = ['source-a', 'source-b', 'primary', 'standby', 'gateway', 'ha-observer']
export function haGrant(worker: HaWorker, role: string, rooms: { input: string; candidates: string; program: string }, epoch: number) {
  const candidate = worker === 'primary' || worker === 'standby'
  const source = worker === 'source-a' || worker === 'source-b'
  if (!(source && role === worker) && !(candidate && ['renderer-input', 'renderer-output'].includes(role)) && !(worker === 'gateway' && ['gateway-input', 'gateway-output'].includes(role)) && !(haObserverWorker(worker) && role === 'ha-observer')) throw new Error('This worker cannot obtain credentials for that role')
  const publisher = source || role === 'renderer-output' || role === 'gateway-output'
  const room = source || role === 'renderer-input' ? rooms.input : role === 'renderer-output' || role === 'gateway-input' ? rooms.candidates : rooms.program
  const identity = source ? `source-camera-${worker.endsWith('a') ? 'a' : 'b'}` : candidate ? `candidate-${worker}${role.endsWith('input') ? '-input' : ''}` : worker === 'gateway' ? role.endsWith('output') ? `program-engine-${epoch}` : `gateway-input-${epoch}` : worker === 'ha-observer' ? 'ha-independent-observer' : `ha-load-observer-${worker.slice(8)}`
  return { identity, grant: { roomJoin: true as const, room, canPublish: publisher, canSubscribe: !publisher, canPublishData: false, canUpdateOwnMetadata: false, ...(publisher ? { canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE] } : {}) } }
}

/** Explicit local-only HA drill. Separate candidate publications feed one independently owned gateway. */
export class LocalHaRuntime {
  readonly runId = randomUUID()
  readonly expiresAtMs: number
  readonly managedSoak: boolean
  readonly managedLoad: boolean
  readonly rehearsal: boolean
  readonly receiverCount: number
  readonly receiverReports: Record<string, Record<string, unknown>> = {}
  private readonly activeRoles: HaWorker[]
  private readonly soakControlKey: string | null
  private readonly primaryRestartLimit: number
  operatorStopRequested = false
  readonly directory: string
  readonly store: LocalSqliteProductionStore
  readonly session: LocalMediaSession
  readonly rooms: { input: string; candidates: string; program: string }
  authority: LocalHaAuthority
  sourceMedia: Record<string, { encoding: Record<string, unknown>; atMs: number }> = {}
  candidateMedia: Partial<Record<HaCandidate, Record<string, unknown>>> = {}
  gatewayEpoch = 1
  private frozenPrimary = false
  running = false
  failure: string | null = null
  partition: HaCandidate | null = null
  gatewayReport: Record<string, unknown> | null = null
  observerReport: Record<string, unknown> | null = null
  readonly samples: { atMs: number; role: string; report: Record<string, unknown> }[] = []
  private caps = new Map<HaWorker, string>()
  private workers = new Map<HaWorker, BrowserServer>()
  private sfu: ChildProcess | null = null
  private secretDirectory: string | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private stopping: Promise<void> | null = null
  private resultCache = new Map<string, { mtimeMs: number; value: Record<string, unknown> }>()
  private actionBusy = false
  private gatewayRestarts = 0
  private primaryRestarts = 0
  private candidatePartitionCount = 0
  private readonly transport?: { url: string; apiKey: string; apiSecret: string }
  private readonly bundledBrowser: boolean
  private readonly apiKey: string = 'jupiter-local-ha'
  private readonly apiSecret = randomBytes(32).toString('hex')
  constructor(directory: string, options: { soak?: boolean; controlKey?: string; receivers?: number; rehearsal?: boolean; rehearsalDeadlineAtMs?: number; transport?: { url: string; apiKey: string; apiSecret: string }; bundledBrowser?: boolean } = {}) {
    if (options.transport && (!options.rehearsal || !/^wss:\/\//.test(options.transport.url) || !options.transport.apiKey || options.transport.apiSecret.length < 32)) throw new Error('Hosted rehearsal requires secure SFU credentials')
    this.transport = options.transport; this.bundledBrowser = options.bundledBrowser === true
    if (this.transport) { this.apiKey = this.transport.apiKey; this.apiSecret = this.transport.apiSecret }
    this.rehearsal = options.rehearsal === true
    if (options.rehearsalDeadlineAtMs !== undefined && (!this.rehearsal || !Number.isSafeInteger(options.rehearsalDeadlineAtMs) || options.rehearsalDeadlineAtMs <= Date.now() || options.rehearsalDeadlineAtMs > Date.now() + 30 * 60_000)) throw new Error('Rehearsal deadline must be within thirty minutes')
    if (this.rehearsal && (options.soak || (options.receivers ?? 1) !== 1)) throw new Error('Rehearsal cannot run automated soak/load mode')
    this.receiverCount = options.receivers ?? 1
    if (![1, 3, 5, 10].includes(this.receiverCount)) throw new Error('Supported local receiver counts: 1, 3, 5, 10')
    this.managedLoad = this.receiverCount > 1
    if (this.managedLoad && (options.soak || !/^[a-f0-9]{64}$/.test(options.controlKey ?? ''))) throw new Error('Receiver load requires a private control capability and ten-minute mode')
    this.activeRoles = [...roles, ...Array.from({ length: this.receiverCount - 1 }, (_, i) => `ha-load-${i + 2}` as HaWorker)]
    const budget = haRuntimeBudget(options.soak === true, options.controlKey)
    this.managedSoak = options.soak === true; this.soakControlKey = options.controlKey ?? null
    this.expiresAtMs = options.rehearsalDeadlineAtMs ?? Date.now() + (this.rehearsal ? 30 * 60_000 : budget.durationMs); this.primaryRestartLimit = budget.primaryRestarts
    this.directory = directory; mkdirSync(directory, { recursive: true, mode: 0o700 })
    this.store = new LocalSqliteProductionStore(join(directory, 'control.sqlite')); seedLocalProduction(this.store, this.rehearsal ? 'slate' : 'hold-last')
    this.session = new LocalMediaSession(this.store, 600_000)
    this.rooms = { input: `ha-input-${this.runId}`, candidates: `ha-candidates-${this.runId}`, program: `ha-program-${this.runId}` }
    this.authority = new LocalHaAuthority(join(directory, 'authority.json'), this.runId, Date.now(), true)
  }
  private api() { return new RoomServiceClient(this.transport ? this.transport.url.replace(/^wss:/, 'https:') : 'http://127.0.0.1:7980', this.apiKey, this.apiSecret, { requestTimeout: 3 }) }
  private command(command: ProductionCommand) {
    const state = this.store.read(LOCAL_SCOPE)
    return commitProductionCommand(this.store, { schemaVersion: 1, scope: LOCAL_SCOPE, commandId: randomUUID(), expectedRevision: state.revision, command }, { actorId: 'local-ha-drill', scope: LOCAL_SCOPE })
  }
  scene(source: 'a' | 'b' | 'clip') {
    const sourceId = source === 'b' ? 'camera-b' : 'camera-a'
    const composition = source === 'clip' ? parityFixtures().find(x => x.id === 'motion-asset')!.composition : { sceneId: null, layers: [
      { id: 'camera', kind: 'camera' as const, sourceId, props: { x: 0, y: 0, width: 640, height: 360 } },
      { id: 'logo', kind: 'image' as const, sourceId: null, props: { x: 535, y: 25, width: 80, height: 48, assetId: 'brand-mark' } },
      { id: 'title', kind: 'text' as const, sourceId: null, props: { x: 24, y: 275, width: 450, height: 48, content: 'JUPITER / LOCAL FENCED FAILOVER', fontSize: 16 } },
    ] }
    this.command({ type: 'SET_PREVIEW', composition })
    this.command({ type: 'SET_AUDIO', bus: 'preview', audio: { masterGainDb: -6, muted: false, channels: [{ sourceId, gainDb: -12, muted: false, solo: false }] } })
    this.command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } })
    if (source === 'clip') this.command({ type: 'SET_PLAYBACK', bus: 'program', layerId: 'clip', positionMs: 900, paused: true, loop: true })
    this.command({ type: 'SET_LIVE', live: true })
  }
  async start() {
    this.running = true; if (this.rehearsal) this.command({ type: 'SET_LIVE', live: false }); else this.scene('a')
    if (!this.transport) {
    this.secretDirectory = mkdtempSync(join(tmpdir(), 'jupiter-ha-'))
    const path = join(this.secretDirectory, 'livekit.yaml')
    writeFileSync(path, ['port: 7980', 'bind_addresses: [127.0.0.1]', 'rtc:', '  node_ip: 127.0.0.1', '  use_external_ip: false', '  enable_loopback_candidate: true', '  tcp_port: 0', '  udp_port: 7982', '  port_range_start: 0', '  port_range_end: 0', '  stun_servers: []', `  interfaces:\n    includes: [${process.platform === 'darwin' ? 'lo0' : 'lo'}]`, '  ips:\n    includes: [127.0.0.1/32]', 'keys:', `  ${this.apiKey}: ${this.apiSecret}`, 'logging:\n  level: warn'].join('\n'), { mode: 0o600 })
    const log = openSync(join(this.directory, 'livekit.log'), 'a', 0o600)
    this.sfu = spawn('/opt/homebrew/bin/livekit-server', ['--config', path], { stdio: ['ignore', log, log], env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: 'development' } }); closeSync(log)
    this.sfu.once('error', () => { this.failure = 'Local HA SFU failed'; void this.stop() })
    this.sfu.once('exit', () => { if (this.running) { this.failure = 'Local HA SFU exited'; void this.stop() } })
    }
    let ready = false
    for (let n = 0; n < 80; n++) { try { await this.api().listRooms(); ready = true; break } catch { await new Promise(resolve => setTimeout(resolve, 100)) } }
    if (!ready) throw new Error('Local HA SFU did not become ready')
    for (const role of this.activeRoles) await this.launch(role)
    this.timer = setInterval(() => {
      if (Date.now() >= this.expiresAtMs) { void this.stop(); return }
      try { this.authority.reconcile(this.store.read(LOCAL_SCOPE).revision); this.persist() } catch { this.failure = 'Authority persistence failed; output permission withdrawn'; this.authority.available = false; void this.stop() }
    }, 100)
  }
  private async launch(role: HaWorker) {
    if (!this.running || Date.now() >= this.expiresAtMs) throw new Error('Local HA run ended')
    this.caps.set(role, randomBytes(32).toString('hex'))
    const server = await chromium.launchServer({ ...(this.bundledBrowser ? {} : { channel: 'chrome' }), headless: true, host: '127.0.0.1', chromiumSandbox: true, timeout: 20_000,
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', TMPDIR: process.env.TMPDIR ?? tmpdir(), LANG: 'en_US.UTF-8', NODE_ENV: 'development' },
      args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] })
    if (!this.running || Date.now() >= this.expiresAtMs) { await server.close(); throw new Error('HA run ended during worker launch') }
    this.workers.set(role, server)
    const browser = await chromium.connect(server.wsEndpoint(), { timeout: 10_000 }), context = await browser.newContext({ serviceWorkers: 'block' })
    await context.route('**/*', route => mediaHostAllowed(new URL(route.request().url()).hostname, this.transport?.url) ? route.continue() : route.abort())
    browser.on('disconnected', () => {
      if (this.running && this.workers.get(role) === server && (role === 'primary' || role === 'standby')) {
        this.authority.unavailable(role, 'Candidate process/transport disconnected')
        this.authority.reconcile(this.store.read(LOCAL_SCOPE).revision)
      }
    })
    const page = await context.newPage(); await page.goto(`http://127.0.0.1:4311/runtime/${role}#${this.caps.get(role)}`, { timeout: 15_000 })
  }
  async replaceDemoSource(role: 'source-a' | 'source-b') {
    if (!this.rehearsal || !this.running) throw new Error('Active local rehearsal required')
    await this.stopWorker(role)
    const identity = role === 'source-a' ? 'source-camera-a' : 'source-camera-b'
    const api = this.api()
    if ((await api.listParticipants(this.rooms.input)).some(p => p.identity === identity)) await api.removeParticipant(this.rooms.input, identity)
    if ((await api.listParticipants(this.rooms.input)).some(p => p.identity === identity)) throw new Error('Previous source has not left the private input room')
  }
  async restoreDemoSource(role: 'source-a' | 'source-b') { await this.replaceDemoSource(role); await this.launch(role) }
  async rehearsalViewerToken(room: 'input' | 'program') {
    if (!this.rehearsal || !this.running || Date.now() >= this.expiresAtMs) throw new Error('Active local rehearsal required')
    const token = new AccessToken(this.apiKey, this.apiSecret, { identity: `producer-${room}-${randomUUID()}`, ttl: Math.max(1, Math.min(120, Math.floor((this.expiresAtMs - Date.now()) / 1000))) })
    token.addGrant({ roomJoin: true, room: this.rooms[room], canPublish: false, canSubscribe: true, canPublishData: false, canUpdateOwnMetadata: false })
    return { token: await token.toJwt(), url: this.transport?.url ?? 'ws://127.0.0.1:7980', runId: this.runId, expiresAtMs: this.expiresAtMs }
  }
  async sourcePublication(role: 'source-a' | 'source-b', sid: string) {
    const identity = role === 'source-a' ? 'source-camera-a' : 'source-camera-b'
    return (await this.api().getParticipant(this.rooms.input, identity)).tracks.some(t => t.sid === sid && t.type === 1)
  }
  private workerFor(cap: unknown): HaWorker | null {
    if (typeof cap !== 'string' || !this.running || Date.now() >= this.expiresAtMs) return null
    const actual = Buffer.from(cap)
    for (const [role, value] of this.caps) { const expected = Buffer.from(value); if (actual.length === expected.length && timingSafeEqual(actual, expected)) return role }
    return null
  }
  async token(worker: HaWorker, role: string) {
    const x = haGrant(worker, role, this.rooms, this.gatewayEpoch)
    const token = new AccessToken(this.apiKey, this.apiSecret, { identity: x.identity, ttl: Math.max(1, Math.min(120, Math.floor((this.expiresAtMs - Date.now()) / 1000))) }); token.addGrant(x.grant)
    return { token: freshMediaToken(await token.toJwt(), this.apiSecret), url: this.transport?.url ?? 'ws://127.0.0.1:7980', identity: x.identity, runId: this.runId, sourceId: worker === 'source-a' ? 'camera-a' : worker === 'source-b' ? 'camera-b' : null }
  }
  status() {
    return { runId: this.runId, hostPid: process.pid, managedSoak: this.managedSoak, managedLoad: this.managedLoad, rehearsal: this.rehearsal, receiverCount: this.receiverCount, receivers: this.receiverReports, operatorStopRequested: this.operatorStopRequested, sfuPid: this.sfu?.pid ?? null, sfuRunning: Boolean(this.sfu && this.sfu.exitCode === null && this.sfu.signalCode === null), running: this.running, expiresAtMs: this.expiresAtMs, failure: this.failure, selected: this.authority.selected, generation: this.authority.generation, authorityAvailable: this.authority.available, partition: this.partition,
      sourceMedia: this.sourceMedia, candidateMedia: this.candidateMedia, revision: this.store.read(LOCAL_SCOPE).revision, candidates: this.authority.candidates, gateway: this.gatewayReport, observer: this.observerReport, boundaries: this.authority.boundaries,
      gatewayEpoch: this.gatewayEpoch, workers: [...this.workers].map(([role, server]) => ({ role, pid: server.process().pid, exited: server.process().exitCode !== null || server.process().signalCode !== null })),
      videoProfile: { width: 1920, height: 1080, fps: 30, codec: 'h264', maxBitrate: 6_000_000 }, cloudDeployed: Boolean(this.transport), separateHosts: false, recordingEnabled: false }
  }
  private persist() { writePrivateJson(join(this.directory, 'status.json'), this.status()) }
  async participants() {
    const values: Record<string, { identity: string; tracks: number }[]> = {}
    for (const [kind, room] of Object.entries(this.rooms)) values[kind] = (await this.api().listParticipants(room)).map(p => ({ identity: p.identity, tracks: p.tracks.length }))
    return values
  }
  async action(value: unknown) {
    const x = value as { action: string; runId: string; expectedGeneration: number; scene?: 'a' | 'b' | 'clip' }
    if (!x || x.runId !== this.runId || !this.running) throw new Error('Current running local HA run required')
    if (this.actionBusy || x.expectedGeneration !== this.authority.generation) throw new Error('Stale fencing generation or another action in progress')
    this.actionBusy = true
    try {
      const revision = this.store.read(LOCAL_SCOPE).revision
      switch (x.action) {
        case 'partition-primary': if (++this.candidatePartitionCount > 2) throw new Error('Local partition drill budget exhausted'); this.partition = 'primary'; break
        case 'freeze-primary': this.frozenPrimary = true; break
        case 'heal-primary': this.frozenPrimary = false; this.partition = null; break
        case 'promote-primary': this.authority.select('primary', x.expectedGeneration, revision, 'operator promotion'); break
        case 'promote-standby': this.authority.select('standby', x.expectedGeneration, revision, 'operator promotion'); break
        case 'scene': if (this.rehearsal) throw new Error('Use producer commands; synthetic clip recording is disabled in rehearsal'); if (!['a', 'b', 'clip'].includes(x.scene!)) throw new Error('Unknown synthetic scene'); this.scene(x.scene!); break
        case 'crash-primary': { const worker = this.workers.get('primary'); if (!worker || worker.process().exitCode !== null || worker.process().signalCode !== null) throw new Error('Primary already stopped'); worker.process().kill('SIGKILL'); break }
        case 'restart-primary': if (++this.primaryRestarts > this.primaryRestartLimit) throw new Error('Local primary restart budget exhausted'); await this.stopWorker('primary'); delete this.authority.candidates.primary; this.partition = null; await this.launch('primary'); break
        case 'authority-off': this.authority.available = false; break
        case 'authority-on': this.authority.available = true; break
        case 'reload-authority': this.authority = new LocalHaAuthority(join(this.directory, 'authority.json'), this.runId, Date.now(), true); break
        case 'crash-gateway': {
          if (++this.gatewayRestarts > 1) throw new Error('Local gateway restart budget exhausted')
          this.workers.get('gateway')?.process().kill('SIGKILL'); await this.stopWorker('gateway')
          const identity = `program-engine-${this.gatewayEpoch}`, api = this.api()
          if ((await api.listParticipants(this.rooms.program)).some(p => p.identity === identity)) await api.removeParticipant(this.rooms.program, identity)
          if ((await api.listParticipants(this.rooms.program)).some(p => p.identity === identity)) throw new Error('Old gateway remains; replacement blocked')
          this.gatewayEpoch++; this.authority.invalidate('gateway process interrupted: new publication required'); this.gatewayReport = null; await this.launch('gateway'); break
        }
        case 'stop': await this.stop(); break
        default: throw new Error('Unknown local HA action')
      }
      this.persist(); return this.status()
    } finally { this.actionBusy = false }
  }
  async handle(request: IncomingMessage, response: ServerResponse) {
    const send = (status: number, value: unknown) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(value)) }
    try {
      if (request.socket.localAddress !== '127.0.0.1' || request.headers['sec-fetch-site'] === 'cross-site' || request.headers.host !== '127.0.0.1:4311' || (request.headers.origin && request.headers.origin !== 'http://127.0.0.1:4311')) throw new Error('Loopback origin required')
      const url = new URL(request.url || '/', 'http://127.0.0.1:4311'), worker = this.workerFor(request.headers['x-runtime-capability'])
      const readBody = async () => {
        if (!request.headers['content-type']?.startsWith('application/json')) throw new Error('JSON body required')
        let text = ''; for await (const chunk of request) { text += String(chunk); if (text.length > 80_000) throw new Error('Local report too large') }
        return JSON.parse(text)
      }
      if (url.pathname === '/api/ha/status' && request.method === 'GET') { send(200, this.status()); return }
      if (['/api/ha/result', '/api/ha/quality-result', '/api/ha/soak-result'].includes(url.pathname) && request.method === 'GET') {
        try {
          const file = join(this.directory, url.pathname.endsWith('soak-result') ? 'soak-active.json' : url.pathname.endsWith('quality-result') ? 'quality-verification.json' : 'verification.json'), mtimeMs = statSync(file).mtimeMs
          let cached = this.resultCache.get(file)
          if (!cached || cached.mtimeMs !== mtimeMs) { cached = { mtimeMs, value: JSON.parse(readFileSync(file, 'utf8')) }; this.resultCache.set(file, cached) }
          const value = { ...cached.value }
          if (url.searchParams.get('summary') === '1') {
            delete value.resources; delete value.observations
            if (Array.isArray(value.measurements)) value.measurements = value.measurements.map(item => ({ label: item.label, metrics: item.metrics }))
          }
          send(200, value)
        } catch { send(200, null) }
        return
      }
      if (url.pathname === '/api/ha/participants' && request.method === 'GET') { send(200, await this.participants()); return }
      if (url.pathname === '/api/ha/action' && request.method === 'POST') { if (request.headers['x-jupiter-local'] !== 'phase7') throw new Error('Local phase7 control header required')
        const value = await readBody(), actual = request.headers['x-soak-capability']
        const authorized = typeof actual === 'string' && this.soakControlKey !== null && actual.length === this.soakControlKey.length && timingSafeEqual(Buffer.from(actual), Buffer.from(this.soakControlKey))
        if ((this.managedSoak || this.managedLoad) && !authorized && value.action !== 'stop') throw new Error('The managed soak owns fault controls; Stop remains available')
        if ((this.managedSoak || this.managedLoad) && !authorized && value.action === 'stop') this.operatorStopRequested = true
        send(200, await this.action(value)); return }
      if (url.pathname === '/api/ha/authority' && request.method === 'GET') { if (worker !== 'gateway') throw new Error('Gateway capability required'); if (!this.authority.available) { send(503, { error: 'Authority link unavailable' }); return }; send(200, this.authority.grant(this.store.read(LOCAL_SCOPE).revision)); return }
      if (url.pathname === '/api/state' && request.method === 'GET') {
        if (worker !== 'primary' && worker !== 'standby') throw new Error('Candidate capability required')
        if (worker === this.partition) { send(503, { error: 'Injected candidate control partition' }); return }
        send(200, { state: this.store.read(LOCAL_SCOPE), sourceReports: this.session.sources }); return
      }
      if (url.pathname === '/api/media/encoding' && request.method === 'GET') { send(200, { profile: 'ha-fullhd', encoding: { maxBitrate: 6_000_000, maxFramerate: 60, scaleResolutionDownBy: 1 } }); return }
      if (url.pathname === '/api/media/token' && request.method === 'POST') { if (!worker) throw new Error('Current worker capability required'); const x = await readBody(); send(200, await this.token(worker, x.role)); return }
      if (url.pathname === '/api/media/report' && request.method === 'POST') {
        if (!worker) throw new Error('Current worker capability required')
        const x = await readBody()
        if (worker === 'source-a' || worker === 'source-b') { this.session.sourceReady(worker, x); this.sourceMedia[worker] = { encoding: x.encoding, atMs: Date.now() } }
        else if (worker === 'primary' || worker === 'standby') {
          if (worker === this.partition) { send(503, { error: 'Injected candidate report partition' }); return }
          const report = parseMediaReport(x)
          this.authority.observe(worker, report, this.store.read(LOCAL_SCOPE).revision)
          this.candidateMedia[worker] = { width: report.width, height: report.height, rendered: report.framesRendered, frames: report.framesSent, capture: x.capture, inputFrames: report.inputFrames, sourceWarnings: report.sourceWarnings, encoding: x.encoding, atMs: Date.now() }
        } else throw new Error('Candidate/source report capability required')
        send(200, { recording: null, stopRecording: true, paused: false, fault: worker === 'primary' && this.frozenPrimary }); return
      }
      if (url.pathname === '/api/ha/report' && request.method === 'POST') {
        if (worker !== 'gateway' && !haObserverWorker(worker ?? '')) throw new Error('Gateway/observer capability required')
        const x = await readBody() as Record<string, unknown>
        if (x.role !== (worker === 'gateway' ? 'gateway' : 'observer')) throw new Error('Report role mismatch')
        const saved = { ...x, atMs: Date.now() }
        if (worker === 'gateway') { this.gatewayReport = saved; this.authority.observeGateway(x.inputs) } else { this.receiverReports[worker!] = saved; if (worker === 'ha-observer') this.observerReport = saved }
        this.samples.push({ atMs: Date.now(), role: worker, report: saved }); if (this.samples.length > 8000) this.samples.shift()
        send(200, { ok: true }); return
      }
      if (request.method === 'GET') {
        let file = '', contentType = 'text/javascript'
        const root = resolve(import.meta.dirname, '../../tools/production-local')
        if (url.pathname === '/') { file = join(root, 'ha.html'); contentType = 'text/html' }
        else if (url.pathname === '/ha-panel.js') file = join(root, 'ha-panel.js')
        else if (url.pathname === '/style.css') { file = join(root, 'style.css'); contentType = 'text/css' }
        else if (url.pathname === '/vendor/livekit-client.js') file = resolve(root, '../../node_modules/livekit-client/dist/livekit-client.umd.js')
        else if (this.activeRoles.some(role => url.pathname === `/runtime/${role}`)) { file = join(root, 'runtime/ha-runtime.html'); contentType = 'text/html' }
        else if (['common.js', 'ha-boot.js', 'ha-gateway.js', 'ha-observer.js', 'ha-fence.js', 'frame-writer.js', 'ha-provenance.js', 'marker.js', 'source.js', 'compositor.js', 'assets.js', 'scene-renderer.js', 'layout.js'].some(name => url.pathname === `/runtime/${name}`)) file = join(root, 'runtime', url.pathname.split('/').at(-1)!)
        else if (url.pathname === '/runtime/assets/brand.svg') { file = join(root, 'runtime/assets/brand.svg'); contentType = 'image/svg+xml' }
        if (file) { const contents = readFileSync(file); response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(contents); return }
      }
      send(404, { error: 'Unknown local HA route' })
    } catch (error) { send(400, { error: error instanceof Error ? error.message : 'Local HA request failed' }) }
  }
  private async stopWorker(role: HaWorker) {
    const worker = this.workers.get(role); if (!worker) return
    this.caps.delete(role)
    await Promise.race([worker.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 2500))])
    const child = worker.process(); if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    for (let n = 0; n < 30 && child.exitCode === null && child.signalCode === null; n++) await new Promise(resolve => setTimeout(resolve, 100))
    if (child.exitCode === null && child.signalCode === null) throw new Error('Owned HA worker did not stop')
    this.workers.delete(role)
  }
  stop(): Promise<void> {
    if (this.stopping) return this.stopping
    this.running = false; this.authority.running = false; if (this.timer) clearInterval(this.timer)
    this.stopping = (async () => {
      const results = await Promise.allSettled([...this.workers.keys()].map(role => this.stopWorker(role)))
      if (results.some(x => x.status === 'rejected')) this.failure = 'Owned worker cleanup incomplete'
      this.caps.clear()
      const sfu = this.sfu
      if (sfu && sfu.exitCode === null && sfu.signalCode === null) {
        const exited = new Promise<void>(resolve => sfu.once('exit', () => resolve())); sfu.kill('SIGTERM')
        await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 3000))]); if (sfu.exitCode === null && sfu.signalCode === null) sfu.kill('SIGKILL'); await exited
      }
      if (this.transport) {
        const cleanup = await Promise.allSettled(Object.values(this.rooms).map(room => this.api().deleteRoom(room)))
        if (cleanup.some(x => x.status === 'rejected')) this.failure = 'Hosted room cleanup requires verification'
      }
      if (this.secretDirectory) rmSync(this.secretDirectory, { recursive: true, force: true })
      writePrivateJson(join(this.directory, 'samples.json'), { runId: this.runId, samples: this.samples })
      appendFileSync(join(this.directory, 'events.ndjson'), JSON.stringify({ runId: this.runId, endedAtMs: Date.now(), failure: this.failure, workersRemaining: this.workers.size }) + '\n', { mode: 0o600 })
      this.persist()
    })()
    return this.stopping
  }
}
