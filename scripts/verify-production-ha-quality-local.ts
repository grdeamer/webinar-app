import assert from 'node:assert/strict'
import { existsSync, copyFileSync, openSync, closeSync, unlinkSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { writePrivateJson } from '../lib/production/localAtomicFile.ts'
import { qualityWindow, type QualityPoint } from '../lib/production/haQualityMetrics.ts'
import type { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'

type Status = ReturnType<LocalHaRuntime['status']>
type Receiver = { presentedFrames: number; presentationDropped: number; presentationCallbacks: number; atMs: number; width: number; height: number; validFrames: number; generation: number; candidate: string | null; revision: number | null; videoTrackSid: string | null; audioTrackSid: string | null; audioRms: number; contentCandidate: string | null; contentSource: string | null; dominantHz: number; selectionMismatches: number; lastGoodAtMs: number; rtc: { framesDecoded: number; framesPerSecond: number; codec: string; framesDropped: number; packetsLost: number } | null; lastSelection: { generation: number; candidate: string; firstDecodedAtMs: number; firstPresentedAtMs: number; previousGoodAtMs: number; videoGapMs: number; firstAudibleAtMs: number | null } | null }
const base = 'http://127.0.0.1:4311', directory = resolve(import.meta.dirname, '../.local/production/ha'), path = resolve(directory, 'quality-verification.json')
mkdirSync(directory, { recursive: true, mode: 0o700 })
const lock = resolve(directory, 'verification.lock'), fd = openSync(lock, 'wx', 0o600)
if (existsSync(path)) copyFileSync(path, resolve(directory, `quality-verification-${Date.now()}.json`))
const result: { outcome: string; startedAtMs: number; endedAtMs?: number; runId: string | null; checks: { check: string; evidence: unknown }[]; measurements: { label: string; metrics: ReturnType<typeof qualityWindow>; samples: unknown[] }[]; error?: string; cleanup?: unknown } = { outcome: 'running', startedAtMs: Date.now(), runId: null, checks: [], measurements: [] }
const extendedProbe = process.argv.includes('--gateway-probe')
const deadline = Date.now() + (extendedProbe ? 540_000 : 240_000)
let cancelled = false
process.once('SIGINT', () => { cancelled = true }); process.once('SIGTERM', () => { cancelled = true })
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const receiver = (s: Status) => s.observer as Receiver | null
async function read(): Promise<Status> { const r = await fetch(base + '/api/ha/status', { signal: AbortSignal.timeout(5000) }); assert.equal(r.status, 200); const x = await r.json(); if (result.runId) assert.equal(x.runId, result.runId); return x }
async function action(action: string, extra: Record<string, unknown> = {}, expectedStatus = 200) {
  if (action !== 'stop' && (cancelled || Date.now() >= deadline)) throw new Error('Local quality test cancelled or expired')
  const s = await read(); const r = await fetch(base + '/api/ha/action', { method: 'POST', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7' }, body: JSON.stringify({ action, runId: s.runId, expectedGeneration: s.generation, ...extra }) }); const x = await r.json(); assert.equal(r.status, expectedStatus, x.error); return x as Status
}
async function until(predicate: (s: Status) => boolean, message: string, timeout = 30_000) {
  const end = Math.min(Date.now() + timeout, deadline)
  while (!cancelled && Date.now() < end) { const s = await read(); if (s.failure) throw new Error(s.failure); if (predicate(s)) return s; await delay(100) }
  throw new Error(message)
}
function live(s: Status, candidate: string) { const r = receiver(s); return Boolean(r && r.candidate === candidate && r.generation === s.generation && r.revision === s.revision && r.audioRms > .0005 && Date.now() - r.atMs < 750 && Date.now() - r.lastGoodAtMs < 500 && r.contentCandidate === candidate && r.selectionMismatches === 0) }
function warm(s: Status, candidate: 'primary' | 'standby') {
  const c = s.candidates[candidate], g = s.gateway as { atMs: number; inputs: Record<string, { frames: number; revision: number; ageMs: number }> } | null, input = g?.inputs[`candidate-${candidate}`]
  return Boolean(c && !c.error && c.revision === s.revision && Date.now() - c.progressedAtMs < 400 && g && Date.now() - g.atMs < 300 && input && input.frames > 0 && input.revision === s.revision && Date.now() - g.atMs + input.ageMs < 250)
}
function pass(check: string, evidence: unknown) { result.checks.push({ check, evidence }); writePrivateJson(path, result); console.log(`PASS ${check}`) }
async function measure(label: string, candidate: string, seconds = 20) {
  await until(s => live(s, candidate) && receiver(s)!.width === 1920 && receiver(s)!.height === 1080, `${label}: no fresh 1080p receiver`)
  await delay(3000)
  const samples: { receiver: Receiver; candidateMedia: Status['candidateMedia']; sourceMedia: Status['sourceMedia']; gateway: Status['gateway'] }[] = [], points: QualityPoint[] = []
  const end = Date.now() + seconds * 1000
  let windowStart = 0
  while (Date.now() < end && Date.now() < deadline && !cancelled) {
    const s = await read(), r = receiver(s)!
    if (!live(s, candidate)) writePrivateJson(resolve(directory, 'gateway-probe-trigger.json'), { atMs: Date.now(), candidate, state: s })
    assert.ok(live(s, candidate), `${label}: receiver lost freshness or selection`)
    for (const source of ['source-a', 'source-b']) { assert.equal(s.sourceMedia[source]?.encoding.width, 1920, 'Native synthetic source must be 1080p, not enlarged 640p'); assert.equal(s.sourceMedia[source]?.encoding.height, 1080) }
    assert.ok(r.rtc && typeof r.rtc.codec === 'string' && r.rtc.codec.toLowerCase().includes('h264'), 'Actual receiver codec must be H264')
    if (!points.length || r.atMs > points.at(-1)!.atMs) { points.push({ atMs: r.atMs, frames: r.validFrames, decoded: r.rtc.framesDecoded, presented: r.presentedFrames, width: r.width, height: r.height, videoTrackSid: r.videoTrackSid!, generation: r.generation }); samples.push({ receiver: r, candidateMedia: s.candidateMedia, sourceMedia: s.sourceMedia, gateway: s.gateway }) }
    if (extendedProbe && points.length > 1 && points.at(-1)!.atMs - points[windowStart].atMs >= 30_000) {
      const window = qualityWindow(points.slice(windowStart))
      writePrivateJson(resolve(directory, 'gateway-probe-active.json'), { runId: result.runId, label, metrics: window, samples })
      assert.ok([window.distinctFps, window.decodedFps, window.presentedFps].every(fps => fps >= 29.5 && fps <= 30.5), `Gateway probe thirty-second window outside 29.5–30.5 fps: ${JSON.stringify(window)}`)
      console.log(`PROBE thirty-second window: ${window.distinctFps.toFixed(3)} distinct / ${window.decodedFps.toFixed(3)} decoded / ${window.presentedFps.toFixed(3)} presented`)
      windowStart = points.length - 1
    }
    await delay(extendedProbe ? 1000 : 100)
  }
  const metrics = qualityWindow(points)
  result.measurements.push({ label, metrics, samples }); writePrivateJson(path, result)
  console.log(`MEASURED ${label}: ${metrics.minimumWidth}x${metrics.minimumHeight}, ${metrics.distinctFps.toFixed(2)} distinct / ${metrics.decodedFps.toFixed(2)} decoded / ${metrics.presentedFps.toFixed(2)} presented fps`)
  assert.equal(metrics.fullHdThroughout, true, 'Resolution dropped within the quality window')
  assert.ok(metrics.distinctFps >= 29.5, `Distinct FPS ${metrics.distinctFps.toFixed(2)} remains below the 29.5 acceptance floor`)
  assert.ok(metrics.decodedFps >= 29.5, `Decoded FPS ${metrics.decodedFps.toFixed(2)} remains below the 29.5 acceptance floor`)
  assert.ok(metrics.presentedFps >= 29.5, `Presented FPS ${metrics.presentedFps.toFixed(2)} remains below the 29.5 acceptance floor`)
  pass(`${label}: full HD at measured 30 fps target`, { ...metrics, acceptanceFloorFps: 29.5 })
  return samples.at(-1)!.receiver
}
async function recovered(label: string, candidate: string, beganAtMs: number, previousSid: string | null, limitMs: number) {
  const s = await until(s => live(s, candidate) && (receiver(s)?.lastSelection?.firstDecodedAtMs ?? 0) >= beganAtMs, `${label}: no verified receiver takeover`, 10_000), r = receiver(s)!, event = r.lastSelection!
  assert.equal(r.videoTrackSid, previousSid, 'Candidate failover must preserve the Program publication')
  pass(label, { firstRecoveredAfterMs: event.firstPresentedAtMs - beganAtMs, decodedPictureGapMs: event.videoGapMs, event, receiver: r, gateway: s.gateway })
  assert.ok(event.videoGapMs < limitMs, `${label}: picture gap ${event.videoGapMs}ms exceeds ${limitMs}ms target`)
  return s
}
try {
  const initial = await read(); result.runId = initial.runId; writePrivateJson(path, result); assert.equal(initial.running, true); assert.equal(initial.recordingEnabled, false)
  await until(s => (['primary', 'standby'] as const).every(id => warm(s, id)), 'Both 1080p candidates not ready')
  await action('promote-primary'); await until(s => live(s, 'primary'), 'Primary output not ready')
  const baseline = await measure('Primary baseline', 'primary', extendedProbe ? 300 : 30)
  const priorGeneration = (await read()).generation, partitionAtMs = Date.now(); await action('partition-primary'); await action('scene', { scene: 'b' })
  let state = await recovered('Live control partition takeover', 'standby', partitionAtMs, baseline.videoTrackSid, 1000)
  await until(s => receiver(s)?.contentSource === 'camera-b' && receiver(s)!.dominantHz > 600 && receiver(s)!.dominantHz < 720, 'Standby did not deliver the new picture and tone')
  const g = state.gateway as { inputs: Record<string, { frames: number; revision: number }> }, oldFrames = g.inputs['candidate-primary'].frames
  await delay(2000); state = await read(); const next = state.gateway as typeof g
  assert.ok(next.inputs['candidate-primary'].frames > oldFrames + 30); assert.ok(next.inputs['candidate-primary'].revision < state.revision)
  await action('promote-primary', { expectedGeneration: priorGeneration }, 400)
  pass('Old primary remains alive but fenced; stale promotion rejected', { oldFrames, newFrames: next.inputs['candidate-primary'].frames, receiver: receiver(state) })
  await measure('Standby after partition', 'standby')
  await action('heal-primary'); await until(s => warm(s, 'primary'), 'Primary did not heal')
  await action('promote-primary'); state = await until(s => live(s, 'primary'), 'Primary failback did not settle')
  const freezeAt = Date.now(), freezeSid = receiver(state)!.videoTrackSid; await action('freeze-primary')
  await recovered('Frame stall with continuing heartbeat', 'standby', freezeAt, freezeSid, 1000)
  await action('heal-primary'); await until(s => warm(s, 'primary'), 'Frozen primary did not resume')
  await action('promote-primary'); state = await until(s => live(s, 'primary'), 'Primary did not settle before crash test')
  const crashAt = Date.now(), crashSid = receiver(state)!.videoTrackSid; await action('crash-primary')
  await recovered('Confirmed primary process exit', 'standby', crashAt, crashSid, 600)
  await measure('Standby after process exit', 'standby')
  await action('authority-off'); await until(s => receiver(s)?.candidate === null && receiver(s)!.audioRms < .0001, 'Authority expiry did not slate and mute')
  await action('authority-on'); await until(s => live(s, 'standby'), 'Output did not resume safely')
  pass('Authority lease expiry still produces slate and silence', { leaseMs: 1000, unchangedProtection: true })
  result.outcome = 'completed'
} catch (error) { result.outcome = 'failed'; result.error = error instanceof Error ? error.message : 'Quality drill failed'; process.exitCode = 1 }
finally {
  try { if (result.runId) { const s = await action('stop'); result.cleanup = { workersStopped: !s.running && s.workers.length === 0 && !s.failure, recordingEnabled: false }; assert.ok((result.cleanup as { workersStopped: boolean }).workersStopped) } }
  catch { result.outcome = 'failed'; result.error = `${result.error || ''} Cleanup could not be confirmed`; process.exitCode = 1 }
  result.endedAtMs = Date.now(); writePrivateJson(path, result); closeSync(fd); unlinkSync(lock); if (result.error) console.error(result.error)
}
