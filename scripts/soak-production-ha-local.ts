import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { spawn, execFileSync, type ChildProcess } from 'node:child_process'
import { mkdirSync, openSync, closeSync, writeSync, fsyncSync, unlinkSync, existsSync, copyFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { freemem } from 'node:os'
import { writePrivateJson } from '../lib/production/localAtomicFile.ts'
import { qualityWindow, type QualityPoint } from '../lib/production/haQualityMetrics.ts'
import { SOAK_OBSERVATION_MS, SOAK_HARD_LIMIT_MS, SOAK_FAULTS, assessSoakWindow } from '../lib/production/haSoakPlan.ts'
import { macMemoryAvailable } from '../lib/production/localScale.ts'
import type { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'

type Status = ReturnType<LocalHaRuntime['status']>
type Receiver = { resolutionChanges: number; gapHistory: { fromMs: number; toMs: number; gapMs: number; generation: number }[]; atMs: number; width: number; height: number; generation: number; revision: number | null; candidate: string | null; contentCandidate: string | null; validFrames: number; presentedFrames: number; presentationDropped: number; lastGoodAtMs: number; audioRms: number; videoTrackSid: string | null; audioTrackSid: string | null; selectionMismatches: number; rtc: { framesDecoded: number; framesDropped: number; packetsLost: number; codec: string } | null; lastSelection: { generation: number; candidate: string; firstDecodedAtMs: number; firstPresentedAtMs: number; videoGapMs: number } | null }
const root = resolve(import.meta.dirname, '..'), directory = resolve(root, '.local/production/ha'), base = 'http://127.0.0.1:4311'
mkdirSync(directory, { recursive: true, mode: 0o700 })
process.umask(0o077)
const lockPath = resolve(directory, 'verification.lock'), lock = openSync(lockPath, 'wx', 0o600)
const path = resolve(directory, 'soak-active.json'), soakId = randomUUID(), controlKey = randomBytes(32).toString('hex')
if (existsSync(path)) copyFileSync(path, resolve(directory, `soak-${Date.now()}.json`))
const samplesPath = resolve(directory, `soak-${soakId}-samples.ndjson`), sampleFd = openSync(samplesPath, 'wx', 0o600)
const result = {
  schemaVersion: 1, soakId, sourceArtifactId: process.env.JUPITER_LOCAL_SOAK_RELEASE_ID ?? null, outcome: 'starting', runtimeRunId: null as string | null, ownerPid: process.pid, ownerBirth: '', hostPid: 0, hostBirth: '', watchdogPid: 0,
  startedAtMs: Date.now(), observationStartedAtMs: null as number | null, expectedFinishAtMs: null as number | null, hardDeadlineAtMs: Date.now() + SOAK_HARD_LIMIT_MS,
  elapsedObservationMs: 0, targetObservationMs: SOAK_OBSERVATION_MS, recordingEnabled: false, cloudDeployed: false, sampleFile: samplesPath,
  sampleCount: 0, measuredSteadyMs: 0, excludedMs: 0, windows: [] as { atMs: number; metrics: ReturnType<typeof qualityWindow> }[],
  events: [] as { kind: string; scheduledMinute: number; beganAtMs: number; recoveredAtMs?: number; pictureGapMs?: number; recoveryMs?: number; restoredAtMs?: number; generation?: number; scopeStartedAtMs?: number; evidence?: unknown }[],
  fragments: [] as { seconds: number; reason: string; metrics?: ReturnType<typeof qualityWindow> }[], resources: [] as unknown[], error: null as string | null, endedAtMs: null as number | null,
  cleanup: null as { workersStopped: boolean; hostStopped: boolean; recordingEnabled: false } | null,
}
let host: ChildProcess | null = null, watchdog: ChildProcess | null = null, awake: ChildProcess | null = null, cancelled = false
let observationMono = 0, points: QualityPoint[] = [], lastSampleMono = 0, lastSampleWall = 0, previousSid: string | null = null, previousAudioSid: string | null = null, resolutionBaseline: number | null = null, expectedGeneration: number | null = null
const hardMono = performance.now() + SOAK_HARD_LIMIT_MS
process.once('SIGINT', () => { cancelled = true }); process.once('SIGTERM', () => { cancelled = true })
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const receiver = (s: Status) => s.observer as Receiver | null
function birth(pid: number) { return execFileSync('/bin/ps', ['-p', String(pid), '-o', 'lstart='], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C', NODE_ENV: 'development' } }).trim() }
function save() { writePrivateJson(path, result) }
function bound() { if (cancelled) throw new Error('Operator cancelled the soak'); if (performance.now() >= hardMono) throw new Error('Soak reached its non-extendable hard deadline') }
async function read(): Promise<Status> {
  const r = await fetch(base + '/api/ha/status', { signal: AbortSignal.timeout(4000) }); assert.equal(r.status, 200)
  const s = await r.json(); if (result.runtimeRunId) assert.equal(s.runId, result.runtimeRunId, 'Do not touch another runtime'); return s
}
async function action(action: string, extra: Record<string, unknown> = {}) {
  if (action !== 'stop') bound()
  const s = await read(); assert.equal(s.runId, result.runtimeRunId)
  const r = await fetch(base + '/api/ha/action', { method: 'POST', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7', 'X-Soak-Capability': controlKey }, body: JSON.stringify({ action, runId: s.runId, expectedGeneration: s.generation, ...extra }) })
  const x = await r.json(); assert.equal(r.status, 200, x.error); return x as Status
}
async function until(predicate: (s: Status) => boolean, message: string, timeout = 15_000) {
  const end = performance.now() + timeout
  while (performance.now() < end) { bound(); const s = await read(); assert.ok(!s.failure, s.failure || 'Runtime failed'); if (predicate(s)) return s; await delay(100) }
  throw new Error(message)
}
function warm(s: Status, candidate: 'primary' | 'standby') {
  const c = s.candidates[candidate], g = s.gateway as { atMs: number; inputs: Record<string, { frames: number; revision: number; ageMs: number }> } | null, input = g?.inputs[`candidate-${candidate}`]
  return Boolean(c && !c.error && c.revision === s.revision && Date.now() - c.progressedAtMs < 600 && g && input && input.revision === s.revision && Date.now() - g.atMs + input.ageMs < 250)
}
function validate(s: Status) {
  assert.equal(s.running, true, 'Runtime stopped before the observation hour finished'); assert.ok(!s.failure, s.failure || 'Runtime failure')
  assert.equal(s.managedSoak, true); assert.equal(s.recordingEnabled, false); assert.equal(s.cloudDeployed, false)
  const output = s.gateway as { outputTransport?: string; outputError?: string | null } | null
  assert.equal(output?.outputTransport, 'video-frame-generator', 'Soak requires the qualified explicit-frame gateway')
  assert.equal(output?.outputError, null, 'Gateway frame writer failed')
  const r = receiver(s); assert.ok(r && r.rtc, 'Missing independent receiver or RTC statistics')
  assert.equal(s.workers.length, 6); assert.ok(s.workers.every(x => !x.exited), 'Unexpected worker exit outside a scheduled fault')
  if (resolutionBaseline !== null) assert.equal(r.resolutionChanges, resolutionBaseline, 'Receiver resolution changed during observation')
  for (const gap of r.gapHistory || []) if (gap.toMs >= (result.observationStartedAtMs ?? Infinity) && gap.gapMs > 500 && !result.events.some(e => e.scopeStartedAtMs !== undefined && gap.fromMs >= e.scopeStartedAtMs - 500 && gap.toMs <= (e.restoredAtMs ?? Date.now()) + 500)) throw new Error(`Unplanned ${gap.gapMs}ms picture interruption`)
  assert.equal(r.width, 1920); assert.equal(r.height, 1080); assert.equal(r.selectionMismatches, 0)
  assert.equal(r.candidate, s.selected); assert.equal(r.contentCandidate, s.selected); assert.equal(r.generation, s.generation); assert.equal(r.revision, s.revision)
  assert.ok(Date.now() - r.atMs < 750 && Date.now() - r.lastGoodAtMs < 500, 'Unplanned stale receiver/picture')
  assert.ok(r.audioRms > .0005, 'Unplanned loss of the synthetic audio signal'); assert.match(r.rtc.codec, /h264/i)
  for (const id of ['source-a', 'source-b']) { assert.equal(s.sourceMedia[id]?.encoding.width, 1920); assert.equal(s.sourceMedia[id]?.encoding.height, 1080); assert.ok(Date.now() - s.sourceMedia[id].atMs < 2500) }
  if (previousSid !== null) assert.equal(r.videoTrackSid, previousSid, 'Unexpected Program publication replacement')
  if (previousAudioSid !== null) assert.equal(r.audioTrackSid, previousAudioSid, 'Unexpected audio publication replacement')
  assert.ok(r.videoTrackSid && r.audioTrackSid)
  previousSid = r.videoTrackSid; previousAudioSid = r.audioTrackSid
  return r
}
function point(r: Receiver): QualityPoint { return { atMs: r.atMs, frames: r.validFrames, decoded: r.rtc!.framesDecoded, presented: r.presentedFrames, width: r.width, height: r.height, generation: r.generation, videoTrackSid: r.videoTrackSid! } }
function fragment(reason: string) {
  if (points.length > 1) {
    const seconds = (points.at(-1)!.atMs - points[0].atMs) / 1000
    const metrics = seconds >= 10 ? qualityWindow(points) : undefined
    result.fragments.push({ seconds, reason, ...(metrics ? { metrics } : {}) })
    if (metrics) { assert.ok(metrics.fullHdThroughout && [metrics.distinctFps, metrics.decodedFps, metrics.presentedFps].every(fps => fps >= 29.5 && fps <= 30.5), 'Steady fragment outside the 29.5–30.5 FPS range'); result.measuredSteadyMs += seconds * 1000 }
  }
  points = []
}
function resourceSample() {
  const text = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,rss=,time='], { encoding: 'utf8' })
  const rows = text.trim().split('\n').map(line => { const [pid, ppid, rss, clock] = line.trim().split(/\s+/); return { pid: +pid, ppid: +ppid, rssBytes: +rss * 1024, cpuSeconds: clock.split(':').map(Number).reduce((n, x) => n * 60 + x, 0) } })
  const owned = new Set([process.pid, result.hostPid]); let changed = true
  while (changed) { changed = false; for (const row of rows) if (owned.has(row.ppid) && !owned.has(row.pid)) { owned.add(row.pid); changed = true } }
  let availableBytes = freemem(), pressure = 'not-applicable'
  if (process.platform === 'darwin') { availableBytes = macMemoryAvailable(execFileSync('/usr/bin/vm_stat', [], { encoding: 'utf8' })); pressure = execFileSync('/usr/sbin/sysctl', ['-n', 'kern.memorystatus_vm_pressure_level'], { encoding: 'utf8' }).trim(); assert.equal(pressure, '1', 'macOS memory pressure safety stop') }
  assert.ok(availableBytes >= 512 * 1024 * 1024, 'Available memory fell below the 512 MiB safety floor')
  const sample = { atMs: Date.now(), availableBytes, pressure, processes: rows.filter(x => owned.has(x.pid)) }; result.resources.push(sample); return sample
}
async function fault(kind: 'stall' | 'crash', scheduledMinute: number) {
  fragment('scheduled failover / controlled failback')
  const scopeStartedAtMs = Date.now()
  if ((await read()).selected !== 'primary') {
    await until(s => warm(s, 'primary'), 'Primary not ready for controlled failback'); await action('promote-primary')
    await until(s => receiver(s)?.candidate === 'primary' && receiver(s)?.generation === s.generation && Date.now() - receiver(s)!.lastGoodAtMs < 300, 'Controlled failback did not display')
  }
  const before = await read(), r = validate(before), beganAtMs = Date.now()
  const event = { kind, scheduledMinute, beganAtMs, scopeStartedAtMs } as typeof result.events[number]; result.events.push(event); save()
  await action(kind === 'stall' ? 'freeze-primary' : 'crash-primary')
  const recovered = await until(s => s.generation > before.generation && receiver(s)?.candidate === 'standby' && receiver(s)?.generation === s.generation && (receiver(s)?.lastSelection?.firstPresentedAtMs ?? 0) >= beganAtMs && Date.now() - receiver(s)!.lastGoodAtMs < 300, 'Scheduled failover did not recover', 10_000)
  const current = receiver(recovered)!, measured = current.lastSelection!
  assert.equal(current.videoTrackSid, r.videoTrackSid); assert.equal(current.audioTrackSid, r.audioTrackSid); assert.equal(current.selectionMismatches, 0)
  assert.ok(measured.videoGapMs < 1000, `Scheduled ${kind} picture gap exceeded one second`)
  if (kind === 'stall') { assert.ok(recovered.candidates.primary!.reportedAtMs > beganAtMs, 'Stall must retain heartbeat'); assert.equal(recovered.workers.find(x => x.role === 'primary')?.exited, false) }
  else { assert.equal(recovered.workers.find(x => x.role === 'primary')?.exited, true) }
  event.evidence = { before: r, recovered: current, primaryHeartbeat: recovered.candidates.primary, workers: recovered.workers }
  writeSync(sampleFd, JSON.stringify({ kind: 'fault-takeover', soakId, event }) + '\n')
  event.recoveredAtMs = measured.firstPresentedAtMs; event.pictureGapMs = measured.videoGapMs; event.recoveryMs = measured.firstPresentedAtMs - beganAtMs; event.generation = recovered.generation
  await action(kind === 'stall' ? 'heal-primary' : 'restart-primary')
  const settled = await until(s => warm(s, 'primary') && warm(s, 'standby') && receiver(s)?.candidate === 'standby' && Date.now() - receiver(s)!.lastGoodAtMs < 300, 'Both candidates did not return to warm readiness', 20_000)
  validate(settled); expectedGeneration = settled.generation; event.restoredAtMs = Date.now(); fsyncSync(sampleFd); save()
  console.log(`FAULT ${kind} at minute ${scheduledMinute}: ${event.pictureGapMs}ms picture gap; both candidates warm again`)
}
async function cleanup() {
  let workersStopped = false, hostStopped = false
  try { if (result.runtimeRunId) { const s = await action('stop'); workersStopped = !s.running && s.workers.length === 0 && !s.sfuRunning } } catch { /* Independent guard remains armed if graceful cleanup cannot be verified. */ }
  if (workersStopped) {
    // Retain only the read-only review host. All browser/SFU work has ended and capabilities are revoked.
    host?.unref()
  } else if (host && host.exitCode === null && host.signalCode === null) {
    host.kill('SIGTERM'); await Promise.race([new Promise(resolve => host!.once('exit', resolve)), delay(12_000)])
    hostStopped = host.exitCode !== null || host.signalCode !== null
  } else hostStopped = true
  awake?.kill('SIGTERM')
  result.cleanup = { workersStopped, hostStopped, recordingEnabled: false }
  if (!workersStopped) { result.outcome = 'failed'; result.error = `${result.error || ''} Cleanup incomplete; independent watchdog retained` }
}

try {
  result.ownerBirth = birth(process.pid); save()
  const output = openSync(resolve(directory, `soak-${soakId}-host.log`), 'a', 0o600)
  host = spawn(process.execPath, ['--experimental-strip-types', resolve(root, 'scripts/production-ha-local.ts'), '--soak-60'], { cwd: root, detached: true, stdio: ['ignore', output, output], env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', TMPDIR: process.env.TMPDIR ?? '/tmp', LANG: 'en_US.UTF-8', NODE_ENV: 'development', JUPITER_LOCAL_SOAK_CONTROL_KEY: controlKey } }); closeSync(output)
  assert.ok(host.pid); result.hostPid = host.pid; result.hostBirth = birth(host.pid); save()
  const python = '/Users/lets-gd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
  watchdog = spawn(python, [resolve(root, 'scripts/production-ha-soak-watchdog.py'), path, soakId, String(process.pid), result.ownerBirth, String(host.pid), result.hostBirth, String(result.hardDeadlineAtMs / 1000)], { detached: true, stdio: 'ignore', env: { PATH: '/usr/bin:/bin', HOME: process.env.HOME ?? '', LANG: 'en_US.UTF-8', NODE_ENV: 'development' } }); watchdog.unref(); assert.ok(watchdog.pid); result.watchdogPid = watchdog.pid
  const guardReadyDeadline = performance.now() + 5000
  while (performance.now() < guardReadyDeadline) {
    try { const armed = JSON.parse(readFileSync(resolve(directory, 'soak-watchdog-result.json'), 'utf8')); if (armed.soakId === soakId && armed.outcome === 'armed') break } catch { /* Bounded watchdog startup. */ }
    await delay(100)
  }
  const armed = JSON.parse(readFileSync(resolve(directory, 'soak-watchdog-result.json'), 'utf8')); assert.equal(armed.soakId, soakId); assert.equal(armed.outcome, 'armed')
  assert.equal(watchdog.exitCode, null, 'Independent watchdog exited before the observation started')
  awake = spawn('/usr/bin/caffeinate', ['-i', '-w', String(process.pid), '-t', '3900'], { stdio: 'ignore' })
  save()
  const bootDeadline = performance.now() + 90_000
  let initial: Status | null = null
  while (performance.now() < bootDeadline) { bound(); if (host.exitCode !== null) throw new Error('Managed host exited during setup'); try { initial = await read(); break } catch { await delay(300) } }
  assert.ok(initial && initial.managedSoak, 'Managed soak host did not start'); assert.equal(initial.hostPid, result.hostPid, 'Refuse another managed runtime'); result.runtimeRunId = initial.runId; save()
  assert.ok(initial.expiresAtMs <= result.hardDeadlineAtMs + 10_000, 'Runtime hard deadline unexpectedly extended')
  await until(s => warm(s, 'primary') && warm(s, 'standby'), 'Both candidates did not warm up', 30_000)
  if ((await read()).selected !== 'primary') await action('promote-primary')
  await until(s => receiver(s)?.candidate === 'primary' && receiver(s)?.generation === s.generation && receiver(s)?.width === 1920 && receiver(s)?.height === 1080, 'Full HD output not ready')
  await delay(3000); validate(await read()); resourceSample()
  const starting = await read(); resolutionBaseline = receiver(starting)!.resolutionChanges; expectedGeneration = starting.generation
  observationMono = performance.now(); result.observationStartedAtMs = Date.now(); result.expectedFinishAtMs = Date.now() + SOAK_OBSERVATION_MS; result.outcome = 'running'; save()
  console.log(`SOAK STARTED ${soakId}; one-hour observation ends ${new Date(result.expectedFinishAtMs).toISOString()}; metadata only`)
  let nextFault = 0, lastResource = 0, lastSave = 0
  while (performance.now() - observationMono < SOAK_OBSERVATION_MS) {
    bound(); const elapsed = performance.now() - observationMono; result.elapsedObservationMs = elapsed
    if (nextFault < SOAK_FAULTS.length && elapsed >= SOAK_FAULTS[nextFault].atMs) { const plan = SOAK_FAULTS[nextFault++]; await fault(plan.kind, plan.atMs / 60_000); lastSampleMono = 0; lastSampleWall = 0; points = []; continue }
    const nowMono = performance.now(), wall = Date.now()
    if (lastSampleMono && (nowMono - lastSampleMono > 3000 || wall - lastSampleWall > 3000)) throw new Error('Unobserved interval / possible sleep interrupted the soak')
    const s = await read(); if (s.operatorStopRequested) { cancelled = true; throw new Error('Operator stopped local media') }; const r = validate(s)
    assert.equal(s.generation, expectedGeneration, 'Unexpected authority generation outside scheduled drills')
    const prior = points.at(-1)
    if (prior && r.generation !== prior.generation) throw new Error('Unexpected authority generation outside a scheduled drill')
    const p = point(r); if (!prior || p.atMs > prior.atMs) points.push(p)
    writeSync(sampleFd, JSON.stringify({ atMs: wall, elapsedMs: elapsed, receiver: r, candidates: s.candidates, candidateMedia: s.candidateMedia, sourceMedia: s.sourceMedia, gateway: s.gateway }) + '\n'); result.sampleCount++
    if (points.length > 1 && p.atMs - points[0].atMs >= 30_000) { const metrics = qualityWindow(points); result.windows.push({ atMs: wall, metrics }); assessSoakWindow(metrics); result.measuredSteadyMs += metrics.seconds * 1000; points = [p] }
    if (nowMono - lastResource >= 5000) { resourceSample(); lastResource = nowMono }
    if (nowMono - lastSave >= 5000) { fsyncSync(sampleFd); save(); lastSave = nowMono }
    lastSampleMono = nowMono; lastSampleWall = wall; await delay(1000)
  }
  assert.equal(result.events.length, 4); assert.ok(result.events.every(x => x.restoredAtMs)); assert.ok(result.windows.length >= 110, 'Insufficient assessed steady-state windows')
  fragment('final sub-window'); result.elapsedObservationMs = performance.now() - observationMono; assert.ok(result.elapsedObservationMs >= SOAK_OBSERVATION_MS)
  result.excludedMs = result.elapsedObservationMs - result.measuredSteadyMs; result.outcome = 'completed'
} catch (error) { result.outcome = cancelled ? 'cancelled' : 'failed'; result.error = error instanceof Error ? error.message : 'Local soak failed'; process.exitCode = 1 }
finally {
  if (observationMono) result.elapsedObservationMs = performance.now() - observationMono
  result.excludedMs = Math.max(0, result.elapsedObservationMs - result.measuredSteadyMs)
  await cleanup(); result.endedAtMs = Date.now(); fsyncSync(sampleFd); closeSync(sampleFd); save(); closeSync(lock)
  if (result.cleanup?.workersStopped) unlinkSync(lockPath)
  if (result.error) console.error(result.error)
  console.log(`SOAK ${result.outcome}; observed ${(result.elapsedObservationMs / 60_000).toFixed(2)} minutes; cleanup ${JSON.stringify(result.cleanup)}`)
}
