import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { freemem, totalmem } from 'node:os'
import { mkdirSync, writeFileSync, openSync, closeSync, unlinkSync, existsSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium, type BrowserContext, type BrowserServer, type Page } from 'playwright-core'
import { counterRate, validateScalePlan, macMemoryAvailable, type LocalProfile } from '../lib/production/localScale.ts'

const base = 'http://127.0.0.1:4310', directory = resolve(import.meta.dirname, '../.local/production/media')
mkdirSync(directory, { recursive: true, mode: 0o700 })
const lock = resolve(directory, 'scale-test.lock'), descriptor = openSync(lock, 'wx', 0o600)
if (existsSync(resolve(directory, 'scale-verification.json'))) copyFileSync(resolve(directory, 'scale-verification.json'), resolve(directory, `scale-verification-${Date.now()}.json`))
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
async function read(path: string) { const r = await fetch(base + path, { signal: AbortSignal.timeout(5000) }); assert.equal(r.status, 200); return r.json() }
async function post(path: string, value: unknown, phase = 'phase6') {
  const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': phase }, body: JSON.stringify(value), signal: AbortSignal.timeout(5000) })
  const x = await r.json(); assert.equal(r.status, 200, x.error); return x
}
function memory() {
  if (process.platform !== 'darwin') return { availableBytes: freemem(), pressureNormal: true }
  const availableBytes = macMemoryAvailable(execFileSync('/usr/bin/vm_stat', [], { encoding: 'utf8' }))
  const pressureNormal = execFileSync('/usr/sbin/sysctl', ['-n', 'kern.memorystatus_vm_pressure_level'], { encoding: 'utf8' }).trim() === '1'
  return { availableBytes, pressureNormal }
}
function memorySafe() { const state = memory(); return state.pressureNormal && state.availableBytes >= 512 * 1024 * 1024 }
// Process metadata only. No command arguments or process memory are inspected.
function resources() {
  const rows = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,rss=,time='], { encoding: 'utf8' }).trim().split('\n').map(line => {
    const [pid, ppid, rss, clock] = line.trim().split(/\s+/), parts = clock.split(':').map(Number)
    return { pid: +pid, ppid: +ppid, rss: +rss * 1024, cpuSeconds: parts.reduce((sum, n) => sum * 60 + n, 0) }
  })
  const owned = new Set([process.pid, hostPid]); let changed = true
  while (changed) { changed = false; for (const row of rows) if (owned.has(row.ppid) && !owned.has(row.pid)) { owned.add(row.pid); changed = true } }
  return { atMs: Date.now(), freeBytes: freemem(), ...memory(), processes: rows.filter(row => owned.has(row.pid)) }
}
type Receiver = { atMs: number; frames: number; unique: number; firstFrameMs: number | null; width: number; height: number; sid: string | null; publisher: string | null; bytes: number; packets: number; lost: number; jitter: number | null; freezes: number; lastFrameMs: number; state: string }
const sample = (page: Page) => page.evaluate('window.scaleSample()') as Promise<Receiver>
let server: BrowserServer | null = null, contexts: BrowserContext[] = [], cancelled = false, hostPid = 0
const result: { startedAt: string; completedAt?: string; outcome: string; error?: string; cleanup?: unknown; environment: unknown; stages: unknown[]; limitations: string[] } = {
  startedAt: new Date().toISOString(), outcome: 'running', environment: { totalMemoryBytes: totalmem(), platform: process.platform, architecture: process.arch, maximumReceivers: 4 }, stages: [],
  limitations: ['Loopback only; not AWS or Zoom capacity, regional latency or Internet packet-loss testing.', 'Independent WebRTC subscribers share one Chrome process tree and this Mac with the sender/SFU.', 'macOS availability is free + inactive + speculative pages (reclaimable estimate), with a separate normal-pressure requirement; raw free RAM is also retained.',
    'CPU is interval CPU time / wall time across owned surviving PIDs; 100% equals one core. RSS sums may double-count shared pages.', 'Bitrates and frame rates are measured, not inferred from configured caps. Control-delay stage delays HTTP only; RTP is not shaped.', 'Metadata only. No recording, media files, audio playback or cloud calls. Short stages do not prove event-length stability.'],
}
function save() { writeFileSync(resolve(directory, 'scale-verification.json'), JSON.stringify(result, null, 2), { mode: 0o600 }) }
process.once('SIGINT', () => { cancelled = true }); process.once('SIGTERM', () => { cancelled = true })
const deadline = Date.now() + 300_000
const watchdog = setTimeout(() => { cancelled = true; server?.process().kill('SIGTERM') }, 300_000)
let original: { profile: string; runId: string; scope: unknown } | null = null
try {
  original = await read('/api/media/encoding')
  const delivery = await read('/api/media/delivery')
  assert.equal(delivery.mode, 'program', 'Select a healthy synthetic Program locally before measuring')
  const status = await read('/api/media/status')
  assert.equal(status.running, true); assert.equal(status.syntheticOnly, true, 'Only built-in synthetic fixtures may be benchmarked')
  assert.notEqual(status.recording?.status, 'recording', 'Stop recording before load testing')
  hostPid = Number(execFileSync('/usr/sbin/lsof', ['-t', '-iTCP:4310', '-sTCP:LISTEN'], { encoding: 'utf8' }).trim())
  assert.ok(hostPid > 0)
  save()
  const stages: { profile: LocalProfile; viewers: number; delayMs: number }[] = [
    { profile: 'standard', viewers: 1, delayMs: 0 }, { profile: 'standard', viewers: 2, delayMs: 0 }, { profile: 'standard', viewers: 4, delayMs: 0 },
    { profile: 'balanced', viewers: 2, delayMs: 0 }, { profile: 'economy', viewers: 2, delayMs: 0 }, { profile: 'standard', viewers: 1, delayMs: 150 },
  ]
  for (const stage of stages) {
    validateScalePlan(stage.viewers, 20, stage.delayMs)
    if (cancelled || Date.now() > deadline || !memorySafe()) throw new Error('Local test cancelled, expired or memory pressure/availability safety guard')
    server = await chromium.launchServer({ channel: 'chrome', host: '127.0.0.1', headless: true, chromiumSandbox: true, timeout: 15_000,
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', TMPDIR: process.env.TMPDIR ?? '/tmp', LANG: 'en_US.UTF-8', NODE_ENV: 'development' },
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] })
    const browser = await chromium.connect(server.wsEndpoint(), { timeout: 10_000 })

    await post('/api/media/encoding', { ...original, profile: stage.profile })
    const encodingDeadline = Date.now() + 8000
    while (true) {
      const selected = await read('/api/media/encoding')
      if (selected.applied?.profile === stage.profile && Date.now() - selected.applied.atMs < 3000) break
      if (Date.now() > encodingDeadline) throw new Error('Renderer did not confirm applied encoder profile')
      await wait(500)
    }
    await wait(2000)
    const pages: Page[] = []
    for (let index = 0; index < stage.viewers; index++) {
      const context = await browser.newContext({ serviceWorkers: 'block' }); contexts.push(context)
      await context.route('**/*', async route => {
        const url = new URL(route.request().url())
        if (url.hostname !== '127.0.0.1') { await route.abort(); return }
        if (stage.delayMs && ['/api/media/delivery', '/api/media/audience-token'].includes(url.pathname)) await wait(stage.delayMs)
        await route.continue()
      })
      const page = await context.newPage(); pages.push(page)
      await page.goto(base + '/audience', { timeout: 10_000 })
      // This is an owned application measurement receiver, not automation of the user's browser.
      await page.evaluate(`(async () => {
        const { ProgramPlayer } = await import('/runtime/program-player.js')
        const { MARKER_SIZE, MARKER_WIDTH, readMarker } = await import('/runtime/marker.js')
        const video = document.createElement('video'); document.body.replaceChildren(video)
        const surface = document.createElement('canvas'); surface.width = MARKER_WIDTH; surface.height = MARKER_SIZE
        const ctx = surface.getContext('2d', { willReadFrequently: true })
        const started = performance.now(); let unique = 0, previous = null, first = null, last = 0, remote = null
        const player = new ProgramPlayer(video, () => {}, track => { if (track.kind === 'video') remote = track })
        function frame() {
          if (video.videoWidth) {
            first ??= performance.now() - started; last = performance.now()
            const scale = video.videoWidth / 1280
            ctx.drawImage(video, 0, video.videoHeight - MARKER_SIZE * scale, MARKER_WIDTH * scale, MARKER_SIZE * scale, 0, 0, MARKER_WIDTH, MARKER_SIZE)
            const marker = readMarker(ctx), key = marker && marker.revision + ':' + marker.frame
            if (key && key !== previous) { unique++; previous = key }
          }
          video.requestVideoFrameCallback(frame)
        }
        video.requestVideoFrameCallback(frame)
        window.scaleSample = async () => {
          let bytes = 0, packets = 0, lost = 0, jitter = null, freezes = 0
          const stats = await remote?.getRTCStatsReport()
          stats?.forEach(s => { if (s.type === 'inbound-rtp' && (s.kind === 'video' || s.mediaType === 'video')) { bytes += s.bytesReceived || 0; packets += s.packetsReceived || 0; lost += s.packetsLost || 0; jitter = s.jitter ?? null; freezes += s.freezeCount || 0 } })
          const info = player.info()
          return { atMs: performance.now(), frames: info.frames, unique, firstFrameMs: first, width: video.videoWidth, height: video.videoHeight, sid: info.videoTrackSid, publisher: info.publisherIdentity, bytes, packets, lost, jitter, freezes, lastFrameMs: performance.now() - last, state: info.state }
        }
        await player.start()
      })()`)
    }
    const readyDeadline = Date.now() + 20_000
    while ((await Promise.all(pages.map(sample))).some(x => x.state !== 'live' || x.unique < 10)) {
      if (cancelled || Date.now() > readyDeadline || Date.now() > deadline) throw new Error('Receiver startup did not produce fresh decoded Program markers')
      await wait(500)
    }
    const before = await Promise.all(pages.map(sample)), resourceBefore = resources(), samples = []
    for (let second = 0; second < 20; second++) {
      await wait(1000)
      if (cancelled) throw new Error('Operator cancelled the local load test')
      if (Date.now() > deadline) throw new Error('Local load test reached its five-minute deadline')
      if (!memorySafe()) throw new Error('Local load test reached memory pressure/512 MiB availability guard')
      const receivers = await Promise.all(pages.map(sample))
      const configuration = await read('/api/media/encoding')
      if (configuration.profile !== stage.profile || configuration.applied?.profile !== stage.profile || Date.now() - configuration.applied.atMs > 4000) throw new Error('Encoding changed or renderer confirmation became stale during measurement')
      if (receivers.some(x => x.state !== 'live' || x.lastFrameMs > 4000)) throw new Error('Receiver stalled during measurement')
      samples.push({ receivers, resources: resources() })
    }
    const after = samples.at(-1)!, worker = await read('/api/media/status')
    const receiverResults = after.receivers.map((x, index) => {
      const b = before[index], elapsed = x.atMs - b.atMs
      assert.equal(x.sid, b.sid, 'Publication changed during load stage'); assert.ok(x.unique > b.unique)
      assert.equal(x.width, stage.profile === 'economy' ? 640 : 1280, 'Decoded resolution differs from selected profile')
      assert.equal(x.height, stage.profile === 'economy' ? 360 : 720)
      return { ...x, decodedCallbackFps: counterRate(b.frames, x.frames, elapsed), distinctMarkerFps: counterRate(b.unique, x.unique, elapsed), receivedVideoBitsPerSecond: counterRate(b.bytes, x.bytes, elapsed)! * 8, packetLossDelta: x.lost - b.lost, freezeDelta: x.freezes - b.freezes }
    })
    const cpuSeconds = after.resources.processes.reduce((sum, p) => {
      const prior = resourceBefore.processes.find(x => x.pid === p.pid)
      return sum + (prior ? Math.max(0, p.cpuSeconds - prior.cpuSeconds) : 0)
    }, 0)
    const evidence = { ...stage, measuredSeconds: (after.resources.atMs - resourceBefore.atMs) / 1000, receivers: receiverResults,
      ownedCpuCorePercent: cpuSeconds * 100_000 / (after.resources.atMs - resourceBefore.atMs),
      peakOwnedRssBytes: Math.max(...samples.map(s => s.resources.processes.reduce((sum, p) => sum + p.rss, 0))),
      minimumFreeBytes: Math.min(...samples.map(s => s.resources.freeBytes)), minimumAvailableBytes: Math.min(...samples.map(s => s.resources.availableBytes)), rendererFps: worker.renderer?.fps, observerFps: worker.observer?.fps, samples }
    result.stages.push(evidence); save()
    console.log(`MEASURED ${stage.profile}, ${stage.viewers} receivers, ${stage.delayMs}ms HTTP delay: ${receiverResults.map(x => x.distinctMarkerFps?.toFixed(2)).join('/')} distinct fps`)
    await Promise.all(contexts.map(context => context.close())); contexts = []
    await server.close(); server = null
  }
  result.outcome = 'completed'
} catch (error) { result.outcome = 'failed'; result.error = error instanceof Error ? error.message : 'Local load failed'; process.exitCode = 1 }
finally {
  await Promise.allSettled(contexts.map(context => context.close()))
  if (server) { await Promise.race([server.close().catch(() => {}), wait(3000)]); if (server.process().exitCode === null && server.process().signalCode === null) server.process().kill('SIGKILL') }
  let profileRestored = false
  try {
    if (original) {
      await post('/api/media/encoding', original)
      const restoreDeadline = Date.now() + 6000
      while (Date.now() < restoreDeadline) {
        const selected = await read('/api/media/encoding')
        if (selected.profile === original.profile && selected.applied?.profile === original.profile && Date.now() - selected.applied.atMs < 3000) { profileRestored = true; break }
        await wait(250)
      }
    }
  } catch { process.exitCode = 1 }
  if (!profileRestored) { result.outcome = 'failed'; result.error = 'Original encoder profile could not be confirmed after cleanup'; process.exitCode = 1 }
  result.cleanup = { subscribersClosed: !server || server.process().exitCode !== null || server.process().signalCode !== null, profileRestored }
  clearTimeout(watchdog)
  result.completedAt = new Date().toISOString(); save(); closeSync(descriptor); unlinkSync(lock)
  if (result.error) console.error(result.error)
}
