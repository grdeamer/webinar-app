import assert from 'node:assert/strict'
import { exportHostedReview } from './hostedMetadata.ts'
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { freemem, loadavg } from 'node:os'
import { join } from 'node:path'
import { qualityWindow, type QualityPoint } from './haQualityMetrics.ts'
import { assessSoakWindow, SOAK_FAULTS, SOAK_OBSERVATION_MS } from './haSoakPlan.ts'
import type { LocalHaRuntime } from './localHaRuntime.ts'

type Status = ReturnType<LocalHaRuntime['status']>
type Observer = { atMs: number; width: number; height: number; validFrames: number; presentedFrames: number; generation: number; revision: number; candidate: string; contentCandidate: string; videoTrackSid: string; audioTrackSid: string; selectionMismatches: number; lastGoodAtMs: number; audioRms: number; rtc: { framesDecoded: number; framesDropped: number; packetsLost: number }; lastSelection: { firstPresentedAtMs: number; videoGapMs: number }; gapHistory: { fromMs: number; toMs: number; gapMs: number }[] }
type Gateway = { atMs: number; outputError: string | null; inputs: Record<string, { revision: number; ageMs: number }> }
type Event = { kind: 'stall' | 'crash'; minute: number; scopeAtMs: number; beganAtMs: number; recoveredAtMs?: number; restoredAtMs?: number; pictureGapMs?: number; recoveryMs?: number }
export const HOSTED_HOUR_NETWORK_LIMIT_BYTES = 6_000_000_000
function networkBytes() {
  return readdirSync('/sys/class/net').filter(name => name !== 'lo').reduce((sum, name) => sum + ['rx_bytes', 'tx_bytes'].reduce((n, counter) => n + Number(readFileSync(`/sys/class/net/${name}/statistics/${counter}`, 'utf8')), 0), 0)
}
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
export function hostedSourceReady(value: { kind: string; leaseExpiresAtMs: number | null } | undefined, s: Pick<Status, 'sourceMedia'>, now = Date.now()) {
  const source = s.sourceMedia['source-a']
  return value?.kind === 'file' && (value.leaseExpiresAtMs ?? 0) > now && source?.encoding.width === 1920 && source.encoding.height === 1080 && now - source.atMs < 2500
}
/** Metadata-only, single-run hour owner. The independent cloud timeout is never extended. */
export async function runHostedSoak(runtime: LocalHaRuntime, deadline: number, stop: () => Promise<void>, directory = '/vercel/hosted-soak') {
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const path = join(directory, 'result.json'), samples = join(directory, 'samples.ndjson')
  const result = { runId: runtime.runId, outcome: 'waiting-for-file', deadline, observationStartedAtMs: null as number | null, elapsedObservationMs: 0, qualifiedSteadyMs: 0, recordingEnabled: false, silentFile: true, lastMeasuredWindow: null as (ReturnType<typeof qualityWindow> & { sourceEncodedFps: number }) | null, windows: [] as ReturnType<typeof qualityWindow>[], fragments: [] as ReturnType<typeof qualityWindow>[], events: [] as Event[], error: null as string | null, cleanup: null as { workersStopped: boolean; roomsDeleted: boolean } | null, endedAtMs: null as number | null }
  const save = () => writeFileSync(path, JSON.stringify(result), { mode: 0o600 })
  let points: (QualityPoint & { sourceAtMs: number; sourceEncoded: number })[] = [], startMono = 0, videoSid = '', audioSid = '', revision = -1, generation = 0
  const observer = (s: Status) => s.observer as Observer
  const bound = () => { assert.ok(networkBytes() < HOSTED_HOUR_NETWORK_LIMIT_BYTES, 'Conservative cumulative $12 traffic budget guard reached'); assert.ok(Date.now() < deadline - 5000, 'Non-extendable hosted deadline reached'); assert.ok(runtime.running, 'Hosted runtime stopped'); assert.ok(!runtime.failure, runtime.failure || 'Runtime failure'); assert.equal(runtime.operatorStopRequested, false, 'Operator stopped the soak') }
  const action = (action: string) => { bound(); return runtime.action({ action, runId: runtime.runId, expectedGeneration: runtime.status().generation }) }
  async function until(test: (s: Status) => boolean, message: string, timeout = 20_000) {
    const end = performance.now() + timeout
    while (performance.now() < end) { bound(); const s = runtime.status(); if (test(s)) return s; await delay(100) }
    throw new Error(message)
  }
  function warm(s: Status, role: 'primary' | 'standby') {
    const c = s.candidates[role], g = s.gateway as Gateway | null, input = g?.inputs[`candidate-${role}`]
    return Boolean(c && !c.error && c.revision === s.revision && Date.now() - c.progressedAtMs < 700 && g && input && input.revision === s.revision && Date.now() - g.atMs + input.ageMs < 350)
  }
  async function source() {
    const response = await fetch('http://127.0.0.1:4311/api/producer/status', { signal: AbortSignal.timeout(3000) })
    assert.equal(response.status, 200)
    return await response.json() as { state: { desiredLifecycle: string; program: { composition: { layers: { sourceId?: string }[] } } }; sources: Record<string, { kind: string; leaseExpiresAtMs: number | null }> }
  }
  function validate(s: Status, steady: boolean) {
    bound(); const r = observer(s), g = s.gateway as Gateway
    assert.ok(r?.rtc && g, 'Missing decoded receiver/encoder telemetry'); assert.equal(s.recordingEnabled, false)
    assert.equal(g.outputError, null, 'Gateway writer error'); assert.equal(r.width, 1920); assert.equal(r.height, 1080)
    assert.equal(r.videoTrackSid, videoSid); assert.equal(r.audioTrackSid, audioSid); assert.equal(r.selectionMismatches, 0)
    assert.equal(s.revision, revision, 'Operator changed composition during the fixed soak')
    assert.ok(Date.now() - r.atMs < 1500 && Date.now() - r.lastGoodAtMs < 1000, 'Stale independent receiver')
    assert.ok(freemem() > 512 * 1024 * 1024, 'Host memory safety floor')
    if (steady) {
      assert.equal(s.generation, generation, 'Unplanned authority change'); assert.equal(r.generation, generation)
      assert.equal(r.revision, revision); assert.equal(r.candidate, s.selected); assert.equal(r.contentCandidate, s.selected)
      assert.ok(s.workers.every(w => !w.exited), 'Unexpected worker exit')
      for (const gap of r.gapHistory || []) if (gap.toMs >= result.observationStartedAtMs! && gap.gapMs >= 1000 && !result.events.some(e => gap.fromMs >= e.scopeAtMs - 500 && gap.toMs <= (e.restoredAtMs ?? Date.now()) + 500)) throw new Error('Unplanned picture interruption')
    }
    return r
  }
  function measure(fragment: boolean) {
    if (points.length > 1 && points.at(-1)!.atMs - points[0].atMs >= (fragment ? 10_000 : 30_000)) {
      const first = points[0], last = points.at(-1)!
      const metrics = { ...qualityWindow(points), sourceEncodedFps: (last.sourceEncoded - first.sourceEncoded) * 1000 / (last.sourceAtMs - first.sourceAtMs) }
      result.lastMeasuredWindow = metrics
      assert.ok(Number.isFinite(metrics.sourceEncodedFps) && metrics.sourceEncodedFps >= 29.5 && metrics.sourceEncodedFps <= 30.5, 'Source encoded FPS outside 29.5–30.5')
      if (fragment) { assert.ok(metrics.fullHdThroughout && [metrics.distinctFps, metrics.decodedFps, metrics.presentedFps].every(n => n >= 29.5 && n <= 30.5), 'Steady fragment FPS outside 29.5–30.5'); result.fragments.push(metrics) }
      else { assessSoakWindow(metrics); result.windows.push(metrics) }
      result.qualifiedSteadyMs += metrics.seconds * 1000
    }
    points = fragment ? [] : points.slice(-1)
  }
  async function fault(kind: 'stall' | 'crash', minute: number) {
    measure(true)
    const e: Event = { kind, minute, scopeAtMs: Date.now(), beganAtMs: 0 }; result.events.push(e); save()
    await until(s => warm(s, 'primary') && warm(s, 'standby'), 'Candidates not warm before fault')
    if (runtime.status().selected !== 'primary') { await action('promote-primary'); await until(s => observer(s)?.candidate === 'primary' && observer(s)?.generation === s.generation, 'Primary failback did not present') }
    const before = runtime.status(); e.beganAtMs = Date.now(); await action(kind === 'stall' ? 'freeze-primary' : 'crash-primary')
    const after = await until(s => s.generation > before.generation && observer(s)?.candidate === 'standby' && observer(s)?.generation === s.generation && observer(s)?.lastSelection?.firstPresentedAtMs >= e.beganAtMs, 'Fault takeover did not present', 10_000)
    const r = validate(after, false); e.recoveredAtMs = r.lastSelection.firstPresentedAtMs; e.pictureGapMs = r.lastSelection.videoGapMs; e.recoveryMs = e.recoveredAtMs - e.beganAtMs
    assert.ok(e.pictureGapMs < 1000, 'Fault picture gap exceeded one second')
    if (kind === 'stall') { assert.ok(after.candidates.primary!.reportedAtMs > e.beganAtMs, 'Picture stall lost heartbeat'); assert.equal(after.workers.find(w => w.role === 'primary')?.exited, false) }
    else assert.equal(after.workers.find(w => w.role === 'primary')?.exited, true)
    await action(kind === 'stall' ? 'heal-primary' : 'restart-primary')
    const restored = await until(s => warm(s, 'primary') && warm(s, 'standby') && observer(s)?.generation === s.generation && Date.now() - observer(s).lastGoodAtMs < 500, 'Warm restoration failed')
    generation = restored.generation; e.restoredAtMs = Date.now(); validate(restored, true); save()
  }
  save()
  try {
    // Startup/file selection is not part of the measured hour. No replacement or reconnect is attempted.
    let freshSince = 0
    while (true) {
      bound(); assert.ok(Date.now() + SOAK_OBSERVATION_MS + 20_000 < deadline, 'Not enough remaining lifetime for a complete hour')
      const s = runtime.status(), inputs = await source(), r = observer(s)
      const ready = inputs.state.desiredLifecycle === 'live' && inputs.state.program.composition.layers.some(layer => layer.sourceId === 'camera-a') && hostedSourceReady(inputs.sources['source-a'], s) && r?.width === 1920 && r.height === 1080 && Date.now() - r.lastGoodAtMs < 500 && r.candidate === s.selected && r.revision === s.revision && warm(s, 'primary') && warm(s, 'standby')
      if (ready) { freshSince ||= Date.now(); if (Date.now() - freshSince >= 15_000) break } else freshSince = 0
      await delay(500)
    }
    const first = runtime.status(), r = observer(first); videoSid = r.videoTrackSid; audioSid = r.audioTrackSid; revision = first.revision; generation = first.generation
    assert.ok(videoSid && audioSid); result.outcome = 'observing'; result.observationStartedAtMs = Date.now(); startMono = performance.now(); save()
    let previousAt = 0
    while (performance.now() - startMono < SOAK_OBSERVATION_MS) {
      bound(); const elapsed = performance.now() - startMono, next = SOAK_FAULTS[result.events.length]
      if (next && elapsed >= next.atMs) { await fault(next.kind, next.atMs / 60_000); continue }
      const s = runtime.status(), inputs = await source(); assert.ok(hostedSourceReady(inputs.sources['source-a'], s), 'File source lease/encoding stopped or changed')
      const r = validate(s, true)
      appendFileSync(samples, JSON.stringify({ atMs: Date.now(), elapsedMs: elapsed, status: s, resource: { networkBytes: networkBytes(), availableBytes: freemem(), load: loadavg(), owner: process.resourceUsage() } }) + '\n', { mode: 0o600 })
      if (r.atMs > previousAt) {
        points.push({ atMs: r.atMs, frames: r.validFrames, decoded: r.rtc.framesDecoded, presented: r.presentedFrames, width: r.width, height: r.height, videoTrackSid: r.videoTrackSid, generation: r.generation, sourceAtMs: s.sourceMedia['source-a'].atMs, sourceEncoded: Number(s.sourceMedia['source-a'].encoding.framesEncoded) }); previousAt = r.atMs
        if (points.length > 1 && r.atMs - points[0].atMs >= 30_000) measure(false)
      }
      result.elapsedObservationMs = elapsed; save(); await delay(1000)
    }
    measure(true); result.elapsedObservationMs = performance.now() - startMono
    assert.ok(result.elapsedObservationMs >= SOAK_OBSERVATION_MS); assert.equal(result.events.length, 4); assert.ok(result.events.every(e => e.restoredAtMs)); assert.ok(result.windows.length >= 110); assert.ok(result.qualifiedSteadyMs >= 3500_000)
    result.outcome = 'completed'
  } catch (error) { result.outcome = 'failed'; result.error = error instanceof Error ? error.message : 'Hosted soak failed'; if (startMono) result.elapsedObservationMs = performance.now() - startMono }
  finally {
    try { await stop(); const s = runtime.status(); result.cleanup = { workersStopped: !s.running && s.workers.length === 0 && !s.sfuRunning, roomsDeleted: !s.failure } }
    catch { result.cleanup = { workersStopped: false, roomsDeleted: false } }
    if (!result.cleanup?.workersStopped || !result.cleanup?.roomsDeleted) { result.outcome = 'failed'; result.error ||= 'Worker cleanup unverified' }
    result.endedAtMs = Date.now(); save(); exportHostedReview(directory, result)
  }
}
