import { spawn, type ChildProcess } from "node:child_process"
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, openSync, closeSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from 'node:os'
import { RoomServiceClient } from 'livekit-server-sdk'
import { chromium, type Browser, type BrowserServer } from "playwright-core"
import { LocalMediaSession, type RuntimeRole } from "./localMediaSession.ts"
import { LocalMediaRoutes } from "./localMediaRoutes.ts"
import { mediaIsFresh } from "./mediaHealth.ts"
import { RuntimeSupervisor } from './runtimeSupervisor.ts'
import { writePrivateJson } from './localAtomicFile.ts'

type Worker = { server: BrowserServer; browser: Browser }

/** Local process host, not browser test automation or a production HA service. */
export class LocalMediaRuntime {
  readonly session: LocalMediaSession
  readonly routes: LocalMediaRoutes
  readonly directory: string
  private sfu: ChildProcess | null = null
  private workers = new Map<RuntimeRole, Worker>()
  private timer: ReturnType<typeof setInterval> | null = null
  private stopping = false
  readonly supervisor = new RuntimeSupervisor()
  private ticking = false
  private secretDirectory: string | null = null
  private baseUrl = ""
  private recoveryStartedAtMs: number | null = null
  private lastGoodFrameAtMs = 0
  readonly recoveries: { generation: number; beganAtMs: number; resumedAtMs: number; gapMs: number }[] = []

  constructor(session: LocalMediaSession, directory: string) {
    this.session = session; this.directory = directory
    this.routes = new LocalMediaRoutes(session, join(directory, "recordings"))
    this.routes.restartRenderer = async () => this.crashRenderer()
    this.routes.injectFault = async (role, mode) => this.injectFault(role, mode)
  }

  async start(baseUrl: string, binary = "/opt/homebrew/bin/livekit-server"): Promise<void> {
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl)) throw new Error("Media runtime requires a loopback control server")
    this.baseUrl = baseUrl
    mkdirSync(this.directory, { recursive: true, mode: 0o700 })
    this.secretDirectory = mkdtempSync(join(tmpdir(), 'jupiter-runtime-'))
    const config = join(this.secretDirectory, "livekit-local.yaml")
    writeFileSync(config, [
      "port: 7880", "bind_addresses: [127.0.0.1]", "rtc:",
      "  node_ip: 127.0.0.1", "  use_external_ip: false", "  enable_loopback_candidate: true",
      "  tcp_port: 0", "  force_tcp: false", "  udp_port: 7882", "  port_range_start: 0", "  port_range_end: 0", "  stun_servers: []",
      `  interfaces:\n    includes: [${process.platform === "darwin" ? "lo0" : "lo"}]`,
      "  ips:\n    includes: [127.0.0.1/32]", "keys:", `  ${this.session.apiKey}: ${this.session.apiSecret}`,
      "logging:\n  level: warn", "room:\n  empty_timeout: 30\n  departure_timeout: 5",
    ].join("\n"), { mode: 0o600 })
    const log = openSync(join(this.directory, "livekit.log"), "a", 0o600)
    this.sfu = spawn(binary, ["--config", config, "--bind", "127.0.0.1"], {
      stdio: ["ignore", log, log], env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: "development" },
    })
    closeSync(log)
    this.sfu.once('exit', () => { if (!this.stopping) { this.session.failure = 'Local LiveKit exited; media stopped'; void this.stop() } })
    let launchError: Error | null = null
    this.sfu.once("error", error => { launchError = error })
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      if (launchError || this.sfu.exitCode !== null) throw new Error("Local LiveKit failed to start; inspect the private local log")
      try { ready = (await fetch("http://127.0.0.1:7880", { signal: AbortSignal.timeout(250) })).ok } catch { /* bounded startup */ }
      if (ready) break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (!ready) throw new Error("Local LiveKit readiness timed out")
    await new RoomServiceClient('http://127.0.0.1:7880', this.session.apiKey, this.session.apiSecret, { requestTimeout: 3 }).listRooms()
    rmSync(join(this.directory, 'livekit-local.yaml'), { force: true })
    for (const role of ["source-a", "source-b", "renderer", "observer"] as RuntimeRole[]) await this.launch(role)
    this.timer = setInterval(() => { void this.tick().catch(() => { this.session.failure = 'Local supervisor failed'; void this.stop() }) }, 1000)
    this.event('host', 'started')
  }

  private event(role: string, event: string) {
    const item = { atMs: Date.now(), role, event }
    this.session.supervisor.events.push(item)
    if (this.session.supervisor.events.length > 100) this.session.supervisor.events.shift()
    this.session.supervisor.attempts = this.supervisor.attempts
    appendFileSync(join(this.directory, 'supervisor-events.ndjson'), JSON.stringify({ runId: this.session.runId, ...item }) + '\n', { mode: 0o600 })
  }

  private async tick() {
    if (this.ticking || this.stopping) return
    this.ticking = true
    try {
      if (Date.now() >= this.session.expiresAtMs) { void this.stop(); return }
      if (this.routes.recording.job?.status === "recording" && Date.now() - this.routes.recording.job.startedAtMs > 185_000) this.routes.recording.fail()
      if (this.recoveryStartedAtMs && this.session.observer?.report.generation === this.session.generation && mediaIsFresh(this.session.observer, Date.now()) && mediaIsFresh(this.session.renderer, Date.now())) {
        const first = this.session.observer.report.firstDecodedAtMs
        this.recoveries.push({ generation: this.session.generation, beganAtMs: this.recoveryStartedAtMs, resumedAtMs: first, gapMs: Math.max(0, first - this.lastGoodFrameAtMs) })
        this.recoveryStartedAtMs = null
      }
      if (this.supervisor.stale('renderer', this.session.renderer)) await this.recover('renderer', 'media-stalled')
      else if (mediaIsFresh(this.session.renderer, Date.now()) && this.supervisor.stale('observer', this.session.observer)) await this.recover('observer', 'decoder-stalled')
      writePrivateJson(join(this.directory, "runtime-report.json"), { ...this.session.publicStatus(), recoveries: this.recoveries, recording: this.routes.recording.job, host: { pid: process.pid, rssBytes: process.memoryUsage().rss, uptimeSeconds: Math.floor(process.uptime()) } })
    } finally { this.ticking = false }
  }

  private async launch(role: RuntimeRole): Promise<void> {
    const server = await chromium.launchServer({ ...(process.env.JUPITER_LOCAL_BUNDLED_BROWSER === '1' ? {} : { channel: 'chrome' }), host: "127.0.0.1", headless: true, chromiumSandbox: true,
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', TMPDIR: process.env.TMPDIR ?? tmpdir(), LANG: 'en_US.UTF-8', NODE_ENV: 'development' },
      args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"], timeout: 30_000 })
    const browser = await chromium.connect(server.wsEndpoint())
    this.workers.set(role, { server, browser })
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" })
    await context.route("**/*", route => {
      const url = new URL(route.request().url())
      return url.hostname === "127.0.0.1" ? route.continue() : route.abort()
    })
    const page = await context.newPage()
    page.on("pageerror", () => { if (!this.stopping) void this.recover(role, 'page-error') })
    browser.on("disconnected", () => {
      if (this.stopping || this.supervisor.recovering.has(role) || this.workers.get(role)?.server !== server) return
      void this.recover(role, 'process-exit')
    })
    await page.goto(`${this.baseUrl}/runtime/${role}#${this.session.caps[role]}`)
    this.supervisor.launched(role)
  }

  async crashRenderer(): Promise<void> {
    await this.injectFault('renderer', 'exit')
  }

  async injectFault(role: RuntimeRole, mode: 'exit' | 'freeze') {
    if (this.stopping || this.supervisor.recovering.has(role)) throw new Error('Worker is not available for a local fault test')
    if (this.supervisor.attempts.length >= 6 || this.supervisor.attempts.filter(item => item.role === role && Date.now() - item.atMs < 300_000).length >= 2) throw new Error('Local recovery budget exhausted')
    const worker = this.workers.get(role)
    if (!worker || (mode === 'freeze' && !['renderer', 'observer'].includes(role))) throw new Error('Unsupported local fault')
    this.event(role, `injected-${mode}`)
    if (mode === 'freeze') this.session.faults[role] = true
    else worker.server.process().kill('SIGKILL')
  }

  private async stopWorker(role: RuntimeRole) {
    const worker = this.workers.get(role)
    if (!worker) return
    await Promise.race([worker.server.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))])
    const child = worker.server.process()
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    for (let n = 0; n < 50 && child.exitCode === null && child.signalCode === null; n++) await new Promise(resolve => setTimeout(resolve, 100))
    if (child.exitCode === null && child.signalCode === null) throw new Error('Old local worker could not be stopped')
    this.workers.delete(role)
  }

  private async fenceRenderer() {
    const client = new RoomServiceClient('http://127.0.0.1:7880', this.session.apiKey, this.session.apiSecret, { requestTimeout: 3 })
    if (!(await client.listRooms([this.session.programRoom])).length) return
    const identity = `program-engine-${this.session.generation}`
    if ((await client.listParticipants(this.session.programRoom)).some(p => p.identity === identity)) await client.removeParticipant(this.session.programRoom, identity)
    if ((await client.listParticipants(this.session.programRoom)).some(p => p.identity === identity)) throw new Error('Old local Program publisher remains active')
  }

  private async recover(role: RuntimeRole, reason: string) {
    if (this.stopping || this.supervisor.recovering.has(role)) return
    try {
      const delay = this.supervisor.begin(role, reason)
      this.event(role, `recovery-${reason}`)
      if (role === 'renderer' || role === 'observer') this.routes.recording.fail(`${role} interrupted received Program`)
      if (role === 'renderer') {
        this.recoveryStartedAtMs = Date.now(); this.lastGoodFrameAtMs = this.session.observer?.report.lastDecodedAtMs ?? this.recoveryStartedAtMs
      }
      await this.stopWorker(role)
      if (role === 'renderer') { await this.fenceRenderer(); this.session.generation++; this.session.restarts++; this.session.renderer = null }
      if (role === 'observer') this.session.observer = null
      this.session.rotateCapability(role); delete this.session.faults[role]
      await new Promise(resolve => setTimeout(resolve, delay))
      if (this.stopping || Date.now() >= this.session.expiresAtMs) return
      await this.launch(role); this.event(role, 'replacement-launched')
    } catch { this.session.failure = `Local ${role} recovery failed or exhausted its budget`; await this.stop() }
    finally { this.supervisor.end(role) }
  }

  async stop(): Promise<void> {
    if (this.stopping) return
    this.stopping = true; this.session.running = false
    for (const role of ['source-a', 'source-b', 'renderer', 'observer'] as RuntimeRole[]) this.session.rotateCapability(role)
    if (this.timer) clearInterval(this.timer)
    this.routes.recording.fail()
    await this.routes.delivery.probe.stop()
    const cleanup = await Promise.allSettled([...this.workers.keys()].map(role => this.stopWorker(role)))
    if (cleanup.some(result => result.status === 'rejected')) this.session.failure = 'Owned local worker cleanup incomplete'
    if (this.sfu?.exitCode === null) {
      const child = this.sfu
      const exited = new Promise<void>(resolve => child.once("exit", () => resolve()))
      child.kill("SIGTERM")
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 4000))])
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL")
      await exited
    }
    if (this.secretDirectory) rmSync(this.secretDirectory, { recursive: true, force: true })
    this.event('host', this.session.failure ? 'failed-stopped' : 'stopped')
    writePrivateJson(join(this.directory, "runtime-report.json"), { ...this.session.publicStatus(), recoveries: this.recoveries, recording: this.routes.recording.job, cleanupComplete: this.workers.size === 0 })
  }
}
