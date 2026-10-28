import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { spawn, execFileSync, type ChildProcess } from 'node:child_process'
import { mkdirSync, openSync, closeSync, writeSync, fsyncSync, unlinkSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { writePrivateJson } from '../lib/production/localAtomicFile.ts'
import { qualityWindow, type QualityPoint } from '../lib/production/haQualityMetrics.ts'
import { assessSoakWindow } from '../lib/production/haSoakPlan.ts'
import { macMemoryAvailable } from '../lib/production/localScale.ts'
import type { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'

type Status = ReturnType<LocalHaRuntime['status']>
type Receiver = { atMs: number; lastGoodAtMs: number; validFrames: number; presentedFrames: number; width: number; height: number; resolutionChanges: number; generation: number; revision: number; candidate: string; contentCandidate: string; selectionMismatches: number; audioRms: number; videoTrackSid: string; audioTrackSid: string; gapHistory: { fromMs: number; toMs: number; gapMs: number }[]; rtc: { framesDecoded: number; packetsLost: number; codec: string }; lastSelection: { firstPresentedAtMs: number; videoGapMs: number } }
const root = resolve(import.meta.dirname, '..'), baseDirectory = resolve(root, '.local/production/ha'), directory = resolve(baseDirectory, 'receiver-load'), base = 'http://127.0.0.1:4311'
mkdirSync(directory, { recursive: true, mode: 0o700 }); process.umask(0o077)
const lockPath = resolve(baseDirectory, 'verification.lock'), lock = openSync(lockPath, 'wx', 0o600)
const prior = JSON.parse(readFileSync(resolve(baseDirectory, 'soak-passed-3b2aac1e-9187-4c85-be51-a4d32bd6a440.json'), 'utf8'))
assert.equal(prior.soakId, '3b2aac1e-9187-4c85-be51-a4d32bd6a440'); assert.equal(prior.outcome, 'completed'); assert.ok(prior.elapsedObservationMs >= 3_600_000 && prior.cleanup?.workersStopped && prior.events.length === 4 && prior.events.every((x: { restoredAtMs?: number }) => x.restoredAtMs))
const seriesId = randomUUID(), seriesPath = resolve(baseDirectory, 'receiver-load-active.json')
if (existsSync(seriesPath)) { const old = JSON.parse(readFileSync(seriesPath, 'utf8')); assert.ok(['completed', 'failed'].includes(old.outcome), 'Another receiver series owns the lab') }
const result = { seriesId, ownerPid: process.pid, ownerBirth: '', sourceArtifactId: process.env.JUPITER_LOCAL_SOAK_RELEASE_ID ?? null, prerequisiteSoakId: prior.soakId, outcome: 'starting', startedAtMs: Date.now(), endedAtMs: null as number | null, currentStage: null as string | null, stages: [] as string[], error: null as string | null, recordingEnabled: false, cloudDeployed: false }
let cancelled = false
process.once('SIGINT', () => { cancelled = true }); process.once('SIGTERM', () => { cancelled = true })
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
function birth(pid: number) { return execFileSync('/bin/ps', ['-p', String(pid), '-o', 'lstart='], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C', NODE_ENV: 'development' } }).trim() }
function saveSeries() { writePrivateJson(seriesPath, result) }
function resourceSample(hostPid: number) {
  const availableBytes = macMemoryAvailable(execFileSync('/usr/bin/vm_stat', [], { encoding: 'utf8' })), pressure = execFileSync('/usr/sbin/sysctl', ['-n', 'kern.memorystatus_vm_pressure_level'], { encoding: 'utf8' }).trim()
  assert.equal(pressure, '1', 'Memory pressure safety stop'); assert.ok(availableBytes >= 512 * 1024 * 1024, '512 MiB memory safety stop')
  const rows = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,rss=,time='], { encoding: 'utf8' }).trim().split('\n').map(line => { const [pid, ppid, rss, clock] = line.trim().split(/\s+/); return { pid: +pid, ppid: +ppid, rssBytes: +rss * 1024, cpuSeconds: clock.split(':').map(Number).reduce((n, x) => n * 60 + x, 0) } })
  const owned = new Set([process.pid, hostPid]); let changed = true
  while (changed) { changed = false; for (const row of rows) if (owned.has(row.ppid) && !owned.has(row.pid)) { owned.add(row.pid); changed = true } }
  return { atMs: Date.now(), availableBytes, pressure, processes: rows.filter(row => owned.has(row.pid)) }
}
async function stage(receiverCount: number) {
  const soakId = randomUUID(), key = randomBytes(32).toString('hex'), stageDirectory = resolve(directory, `${receiverCount}-${soakId}`); mkdirSync(stageDirectory, { mode: 0o700 })
  const path = resolve(stageDirectory, 'stage.json'), sampleFd = openSync(resolve(stageDirectory, 'samples.ndjson'), 'wx', 0o600)
  const state = { soakId, seriesId, receiverCount, ownerPid: process.pid, ownerBirth: result.ownerBirth, hostPid: 0, hostBirth: '', watchdogPid: 0, runtimeRunId: null as string | null, sourceArtifactId: result.sourceArtifactId, outcome: 'starting', startedAtMs: Date.now(), hardDeadlineAtMs: Date.now() + 600_000, endedAtMs: null as number | null, sampleCount: 0, windows: [] as { phase: string; client: string; metrics: ReturnType<typeof qualityWindow> }[], events: [] as { kind: string; beganAtMs: number; restoredAtMs?: number; clients?: Record<string, { pictureGapMs: number; recoveryMs: number }>; evidence?: unknown }[], resources: [] as ReturnType<typeof resourceSample>[], cleanup: null as { workersStopped: boolean; hostStopped: boolean } | null, error: null as string | null, recordingEnabled: false, cloudDeployed: false }
  result.currentStage = path; result.stages.push(path); saveSeries()
  const hardMono = performance.now() + 600_000, identities = ['ha-observer', ...Array.from({ length: receiverCount - 1 }, (_, i) => `ha-load-${i + 2}`)]
  let host: ChildProcess | null = null, awake: ChildProcess | null = null, lastResource = 0, expectedGeneration: number | null = null
  const sids = new Map<string, { video: string; audio: string; resolutionChanges: number }>()
  const save = () => writePrivateJson(path, state)
  function bound() { if (cancelled || performance.now() >= hardMono) throw new Error('Receiver stage cancelled or ten-minute deadline reached') }
  async function read(): Promise<Status> { const r = await fetch(base + '/api/ha/status', { signal: AbortSignal.timeout(4000) }); assert.equal(r.status, 200); const s = await r.json(); if (state.runtimeRunId) assert.equal(s.runId, state.runtimeRunId); return s }
  const receivers = (s: Status) => s.receivers as unknown as Record<string, Receiver>
  async function action(action: string) { if (action !== 'stop') bound(); const s = await read(); const r = await fetch(base + '/api/ha/action', { method: 'POST', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7', 'X-Soak-Capability': key }, body: JSON.stringify({ action, runId: state.runtimeRunId, expectedGeneration: s.generation }) }); const value = await r.json(); assert.equal(r.status, 200, value.error); return value as Status }
  function live(s: Status, candidate = s.selected) { const all = receivers(s); return identities.every(id => { const r = all[id]; return r && r.rtc && r.candidate === candidate && r.generation === s.generation && r.revision === s.revision && r.width === 1920 && r.height === 1080 && Date.now() - r.atMs < 750 && Date.now() - r.lastGoodAtMs < 500 && r.audioRms > .0005 }) }
  function warm(s: Status) { const g = s.gateway as { atMs: number; inputs: Record<string, { revision: number; ageMs: number }> } | null; return (['primary', 'standby'] as const).every(id => { const c = s.candidates[id], input = g?.inputs[`candidate-${id}`]; return c && !c.error && c.revision === s.revision && Date.now() - c.progressedAtMs < 600 && input && input.revision === s.revision && Date.now() - g!.atMs + input.ageMs < 250 }) }
  async function until(check: (s: Status) => boolean, message: string, timeout = 30_000) { const end = performance.now() + timeout; while (performance.now() < end) { bound(); const s = await read(); assert.ok(!s.failure, s.failure || 'Runtime failed'); if (check(s)) return s; await delay(100) }; throw new Error(message) }
  function validate(s: Status) {
    assert.equal(s.running, true); assert.equal(s.failure, null); assert.equal(s.recordingEnabled, false); assert.equal(s.cloudDeployed, false); assert.equal(s.managedLoad, true); assert.equal(s.receiverCount, receiverCount)
    assert.equal(s.workers.length, receiverCount + 5); assert.ok(s.workers.every(w => !w.exited), 'Unexpected worker exit'); assert.ok(live(s), 'A receiver lost picture/audio freshness or selection')
    const gateway = s.gateway as { outputError: string | null; outputTransport: string }; assert.equal(gateway.outputError, null); assert.equal(gateway.outputTransport, 'video-frame-generator')
    if (expectedGeneration !== null) assert.equal(s.generation, expectedGeneration, 'Unexpected failover during steady load')
    for (const id of identities) {
      const r = receivers(s)[id]; assert.equal(r.selectionMismatches, 0); assert.equal(r.contentCandidate, s.selected); assert.match(r.rtc.codec, /h264/i)
      const prior = sids.get(id)
      if (prior) { assert.equal(r.videoTrackSid, prior.video); assert.equal(r.audioTrackSid, prior.audio); assert.equal(r.resolutionChanges, prior.resolutionChanges) } else sids.set(id, { video: r.videoTrackSid, audio: r.audioTrackSid, resolutionChanges: r.resolutionChanges })
      for (const gap of r.gapHistory) if (gap.toMs > state.startedAtMs && gap.gapMs > 500 && !state.events.some(e => gap.fromMs >= e.beganAtMs - 500 && gap.toMs <= (e.restoredAtMs ?? Date.now()) + 500)) throw new Error(`${id}: unplanned ${gap.gapMs}ms interruption`)
    }
    for (const id of ['source-a', 'source-b']) { assert.equal(s.sourceMedia[id]?.encoding.width, 1920); assert.equal(s.sourceMedia[id]?.encoding.height, 1080) }
  }
  function resources() { if (performance.now() - lastResource >= 5000) { state.resources.push(resourceSample(state.hostPid)); lastResource = performance.now() } }
  async function measure(phase: string, seconds: number) {
    const points = new Map(identities.map(id => [id, [] as QualityPoint[]])), end = performance.now() + seconds * 1000; let lastSample = performance.now()
    while (performance.now() < end) {
      bound(); assert.ok(performance.now() - lastSample < 3000, 'Unobserved interval / possible sleep'); lastSample = performance.now()
      const s = await read(); validate(s); resources(); const all = receivers(s)
      writeSync(sampleFd, JSON.stringify({ atMs: Date.now(), phase, receivers: all, gateway: s.gateway, candidates: s.candidates, sourceMedia: s.sourceMedia, candidateMedia: s.candidateMedia }) + '\n'); state.sampleCount++
      for (const id of identities) { const r = all[id], list = points.get(id)!; list.push({ atMs: r.atMs, frames: r.validFrames, decoded: r.rtc.framesDecoded, presented: r.presentedFrames, width: r.width, height: r.height, generation: r.generation, videoTrackSid: r.videoTrackSid }); if (list.length > 1 && r.atMs - list[0].atMs >= 30_000) { const metrics = qualityWindow(list); state.windows.push({ phase, client: id, metrics }); assessSoakWindow(metrics); points.set(id, [list.at(-1)!]) } }
      fsyncSync(sampleFd); save(); await delay(1000)
    }
    for (const [client, list] of points) if (list.length > 1 && list.at(-1)!.atMs - list[0].atMs >= 10_000) { const metrics = qualityWindow(list); state.windows.push({ phase: `${phase}-fragment`, client, metrics }); assert.ok(metrics.fullHdThroughout && [metrics.distinctFps, metrics.decodedFps, metrics.presentedFps].every(n => n >= 29.5 && n <= 30.5), 'Steady fragment outside quality target') }
    save()
  }
  async function fault(kind: 'stall' | 'crash') {
    // Include the controlled failback in this explicit fault scope; exclude it from steady FPS.
    const event = { kind, beganAtMs: Date.now() } as typeof state.events[number]; state.events.push(event); save()
    if ((await read()).selected !== 'primary') { await until(warm, 'Primary not warm before failback'); await action('promote-primary'); await until(s => live(s, 'primary'), 'Controlled failback not displayed') }
    const before = await read(), injectedAtMs = Date.now(); await action(kind === 'stall' ? 'freeze-primary' : 'crash-primary')
    const recovered = await until(s => s.generation > before.generation && live(s, 'standby') && identities.every(id => receivers(s)[id].lastSelection.firstPresentedAtMs >= injectedAtMs), 'Not every receiver recovered failover', 10_000)
    event.clients = Object.fromEntries(identities.map(id => { const r = receivers(recovered)[id], previous = receivers(before)[id]; assert.equal(r.videoTrackSid, previous.videoTrackSid); assert.equal(r.audioTrackSid, previous.audioTrackSid); assert.equal(r.selectionMismatches, 0); assert.ok(r.lastSelection.videoGapMs < 1000, `${id}: takeover picture gap >=1s`); return [id, { pictureGapMs: r.lastSelection.videoGapMs, recoveryMs: r.lastSelection.firstPresentedAtMs - injectedAtMs }] }))
    if (kind === 'stall') { assert.ok(recovered.candidates.primary!.reportedAtMs > injectedAtMs); assert.equal(recovered.workers.find(w => w.role === 'primary')!.exited, false) } else assert.equal(recovered.workers.find(w => w.role === 'primary')!.exited, true)
    event.evidence = { injectedAtMs, candidates: recovered.candidates, workers: recovered.workers }
    await action(kind === 'stall' ? 'heal-primary' : 'restart-primary'); const settled = await until(s => warm(s) && live(s, 'standby'), 'Both candidates not restored')
    expectedGeneration = settled.generation; event.restoredAtMs = Date.now(); validate(settled); save(); console.log(`LOAD ${receiverCount}: ${kind} restored for every receiver`)
  }
  try {
    resourceSample(process.pid); save()
    const out = openSync(resolve(stageDirectory, 'host.log'), 'a', 0o600)
    host = spawn(process.execPath, ['--experimental-strip-types', resolve(root, 'scripts/production-ha-local.ts'), `--receivers=${receiverCount}`], { cwd: root, detached: true, stdio: ['ignore', out, out], env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', TMPDIR: process.env.TMPDIR ?? '/tmp', LANG: 'en_US.UTF-8', NODE_ENV: 'development', JUPITER_LOCAL_SOAK_CONTROL_KEY: key } }); closeSync(out); assert.ok(host.pid); state.hostPid = host.pid; state.hostBirth = birth(host.pid); save()
    const guard = spawn('/Users/lets-gd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3', [resolve(root, 'scripts/production-ha-soak-watchdog.py'), path, soakId, String(process.pid), state.ownerBirth, String(host.pid), state.hostBirth, String(state.hardDeadlineAtMs / 1000)], { detached: true, stdio: 'ignore', env: { PATH: '/usr/bin:/bin', HOME: process.env.HOME ?? '', LC_ALL: 'C', NODE_ENV: 'development' } }); guard.unref(); assert.ok(guard.pid); state.watchdogPid = guard.pid
    for (let i = 0; i < 50; i++) { try { const g = JSON.parse(readFileSync(resolve(stageDirectory, 'soak-watchdog-result.json'), 'utf8')); if (g.soakId === soakId && g.outcome === 'armed') break } catch { /* Bounded guard startup. */ }; await delay(100) }
    const armed = JSON.parse(readFileSync(resolve(stageDirectory, 'soak-watchdog-result.json'), 'utf8')); assert.equal(armed.soakId, soakId); assert.equal(armed.outcome, 'armed'); save()
    awake = spawn('/usr/bin/caffeinate', ['-i', '-w', String(process.pid), '-t', '600'], { stdio: 'ignore' })
    let initial: Status | null = null
    for (let i = 0; i < 200; i++) { bound(); if (host.exitCode !== null) throw new Error('Load host exited during setup'); try { initial = await read(); break } catch { await delay(200) } }
    assert.ok(initial); assert.equal(initial.hostPid, state.hostPid, 'Refuse foreign runtime'); state.runtimeRunId = initial.runId; save()
    await until(s => warm(s) && live(s), 'Not all receivers warmed up', 60_000)
    if ((await read()).selected !== 'primary') await action('promote-primary'); await until(s => live(s, 'primary'), 'Primary not displayed'); await delay(3000)
    const participants = await fetch(base + '/api/ha/participants').then(r => r.json()) as Record<string, { identity: string; tracks: number }[]>
    assert.equal(participants.program.length, receiverCount + 1); assert.equal(participants.program.filter(p => p.tracks > 0).length, 1, 'Only gateway may publish Program')
    const ready = await read(); expectedGeneration = ready.generation; validate(ready); state.outcome = 'running'; result.outcome = 'running'; save(); saveSeries(); console.log(`LOAD ${receiverCount} STARTED ${soakId}; five-minute baseline plus crash/stall`)
    await measure('baseline', 305); await fault('stall'); await measure('post-stall', 35); await fault('crash'); await measure('post-crash', 35)
    assert.equal(state.events.length, 2); assert.ok(state.events.every(e => e.restoredAtMs)); assert.ok(identities.every(id => state.windows.filter(w => w.client === id && w.phase === 'baseline').length >= 9)); state.outcome = 'completed'
  } catch (error) { state.outcome = 'failed'; state.error = error instanceof Error ? error.message : 'Receiver load stage failed' }
  finally {
    let workersStopped = false
    try { if (state.runtimeRunId) { const stopped = await action('stop'); workersStopped = !stopped.running && stopped.workers.length === 0 && !stopped.sfuRunning } } catch { /* Exact birth-scoped guard remains armed on failed cleanup. */ }
    host?.kill('SIGTERM'); if (host && host.exitCode === null && host.signalCode === null) await Promise.race([new Promise(resolve => host!.once('exit', resolve)), delay(12_000)])
    const hostStopped = !host || host.exitCode !== null || host.signalCode !== null; awake?.kill('SIGTERM'); state.cleanup = { workersStopped, hostStopped }
    if (!workersStopped || !hostStopped) { state.outcome = 'failed'; state.error = `${state.error ?? ''} Cleanup unverified; guard retained` }
    state.endedAtMs = Date.now(); fsyncSync(sampleFd); closeSync(sampleFd); save()
  }
  if (state.outcome !== 'completed') throw new Error(`${receiverCount} receivers: ${state.error}`)
  console.log(`LOAD ${receiverCount} COMPLETED; all receivers and both faults qualified`)
}
try { result.ownerBirth = birth(process.pid); saveSeries(); for (const count of [3, 5, 10]) await stage(count); result.outcome = 'completed' }
catch (error) { result.outcome = 'failed'; result.error = error instanceof Error ? error.message : 'Receiver load failed'; process.exitCode = 1 }
finally { result.endedAtMs = Date.now(); saveSeries(); closeSync(lock); unlinkSync(lockPath); console.log(`RECEIVER SERIES ${result.outcome}; ${result.error ?? 'all stages passed'}`) }
