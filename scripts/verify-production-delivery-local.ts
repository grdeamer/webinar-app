import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ProductionCommand, ProductionState, CommitResult } from '../lib/production/contracts.ts'
import type { LocalMediaSession } from '../lib/production/localMediaSession.ts'
import type { LocalRecording } from '../lib/production/localRecording.ts'
import type { DeliveryState } from '../lib/production/localDelivery.ts'
import type { DeliveryProbeReport } from '../lib/production/localDeliveryProbe.ts'

const base = 'http://127.0.0.1:4310'
type Status = ReturnType<LocalMediaSession['publicStatus']> & { recording: LocalRecording | null }
const checks: { check: string; evidence: unknown }[] = []
async function read<T>(path: string): Promise<T> { const r = await fetch(base + path); assert.equal(r.status, 200); return r.json() as Promise<T> }
async function post<T = Record<string, unknown>>(path: string, body: unknown, phase = 'phase5'): Promise<T> {
  const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': phase, 'X-Console-Id': 'local-delivery-verification' }, body: JSON.stringify(body) })
  const result = await r.json(); assert.equal(r.status, 200, `${path}: ${result.error || 'Unexpected status'}`); return result as T
}
async function wait<T>(path: string, predicate: (x: T) => boolean, message: string, timeout = 45_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) { const x = await read<T>(path); if (predicate(x)) return x; await new Promise(resolve => setTimeout(resolve, 300)) }
  throw new Error(message)
}
async function command(command: ProductionCommand) {
  const { state } = await read<{ state: ProductionState }>('/api/state')
  return (await post<CommitResult>('/api/commands', { schemaVersion: 1, scope: state.scope, commandId: randomUUID(), expectedRevision: state.revision, command }, 'phase1')).currentState.revision
}
async function choose(mode: 'legacy' | 'program') {
  const state = await read<DeliveryState>('/api/media/delivery')
  return post<DeliveryState>('/api/media/delivery', { scope: state.scope, expectedRevision: state.revision, commandId: randomUUID(), mode })
}
const statusWait = (predicate: (x: Status) => boolean, message: string) => wait<Status>('/api/media/status', predicate, message)
const probeWait = (predicate: (x: DeliveryProbeReport) => boolean, message: string) => wait<DeliveryProbeReport | null>('/api/media/audience-probe', x => Boolean(x && predicate(x)), message)
function pass(check: string, evidence: unknown) { checks.push({ check, evidence }); console.log(`PASS ${check}`) }
async function preview(sourceId: string) {
  await command({ type: 'SET_PREVIEW', composition: { sceneId: null, layers: [
    { id: 'camera', kind: 'camera', sourceId, props: { x: 0, y: 0, width: 640, height: 360, borderRadius: 0 } },
    { id: 'title', kind: 'text', sourceId: null, props: { x: 24, y: 276, width: 440, height: 40, content: 'JUPITER / SAME FINISHED PROGRAM', fontSize: 16, fontWeight: 'bold', backgroundColor: '#123b50' } },
  ] } })
  await command({ type: 'SET_AUDIO', bus: 'preview', audio: { masterGainDb: -6, muted: false, channels: [{ sourceId, gainDb: -12, muted: false, solo: false }] } })
}
try {
  await statusWait(x => x.engine.status === 'healthy', 'Runtime is not ready')
  await choose('legacy')
  assert.equal((await fetch(base + '/api/media/audience-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400)
  await post('/api/media/audience-probe', { action: 'start' })
  const legacy = await probeWait(x => x.state === 'legacy', 'Legacy audience did not disconnect')
  assert.equal(legacy.videoTrackSid, null); assert.equal(legacy.audioTrackSid, null)
  pass('legacy default/rollback path issues no audience Program token and subscribes to no source room', { state: legacy.state, videoTrackSid: legacy.videoTrackSid })
  await preview('camera-a'); await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } })
  const aRevision = await command({ type: 'SET_LIVE', live: true })
  const engineA = await statusWait(x => x.engine.observedRevision === aRevision && x.observer!.report.audioRms > .001 && x.observer!.report.videoTrackSid !== null, 'Synthetic Program A not observed')
  assert.equal(engineA.syntheticOnly, true)
  const selected = await choose('program')
  const audienceA = await probeWait(x => x.state === 'live' && x.frames > 20 && x.revisions.includes(aRevision) && x.contentSources.includes('camera-a') && x.audioRms > .001, 'Audience did not decode Program A')
  assert.equal(audienceA.videoTrackSid, engineA.observer!.report.videoTrackSid)
  assert.equal(audienceA.audioTrackSid, engineA.observer!.report.audioTrackSid)
  const job = await post<LocalRecording>('/api/media/delivery-record', { action: 'start' })
  assert.equal(job.origin?.videoTrackSid, audienceA.videoTrackSid); assert.equal(job.origin?.audioTrackSid, audienceA.audioTrackSid)
  assert.equal(job.origin?.deliveryRevision, selected.revision)
  await statusWait(x => x.recording?.id === job.id && x.recording.bytes > 1000, 'Finished Program recording did not begin')
  await preview('camera-b'); const bRevision = await command({ type: 'TAKE', transition: { type: 'fade', durationMs: 500 } })
  const audienceB = await probeWait(x => x.revisions.includes(bRevision) && x.contentSources.includes('camera-b') && x.audioRms > .001, 'Audience did not receive TAKE B and mixed audio')
  assert.equal(audienceB.videoTrackSid, audienceA.videoTrackSid)
  await new Promise(resolve => setTimeout(resolve, 2000))
  await post('/api/media/delivery-record', { action: 'stop' })
  const recorded = await statusWait(x => x.recording?.id === job.id && x.recording.status === 'complete', 'Program recording did not finalize')
  assert.ok(recorded.recording?.observedRevisions?.includes(aRevision)); assert.ok(recorded.recording?.observedRevisions?.includes(bRevision))
  pass('audience and recorder share the exact finished Program publication across TAKE A/B', { aRevision, bRevision, origin: recorded.recording?.origin, audienceVideoTrackSid: audienceB.videoTrackSid, audienceAudioTrackSid: audienceB.audioTrackSid, recordingBytes: recorded.recording?.bytes })
  await post('/api/media/audience-probe', { action: 'start', recordingId: job.id })
  const decoded = await probeWait(x => x.ended && x.frames > 30, 'Recorded WebM did not decode to completion')
  assert.ok(decoded.revisions.includes(aRevision)); assert.ok(decoded.revisions.includes(bRevision))
  assert.ok(decoded.contentSources.includes('camera-a')); assert.ok(decoded.contentSources.includes('camera-b')); assert.ok(decoded.maxAudioRms > .001)
  pass('independent file playback contains actual A/B pictures, revision markers and mixed audio', decoded)
  await post('/api/media/audience-probe', { action: 'start' })
  await probeWait(x => x.state === 'live' && x.frames > 10, 'Audience did not resume after file validation')
  const generation = (await read<Status>('/api/media/status')).engine.generation
  await post('/api/media/fault', { role: 'renderer', mode: 'exit' }, 'phase4')
  const recovered = await statusWait(x => x.engine.generation === generation + 1 && x.engine.status === 'healthy', 'Program did not recover')
  const audienceNew = await probeWait(x => x.state === 'live' && x.publisherIdentity === `program-engine-${recovered.engine.generation}` && x.videoTrackSid !== audienceA.videoTrackSid, 'Audience did not reacquire the new Program generation')
  pass('audience reconnects to a replacement Program generation without source fallback', { generation: recovered.engine.generation, videoTrackSid: audienceNew.videoTrackSid })
  const interrupted = await post<LocalRecording>('/api/media/delivery-record', { action: 'start' })
  await statusWait(x => x.recording?.id === interrupted.id && x.recording.bytes > 1000, 'Rollback test recording did not begin')
  const sentBefore = (await read<Status>('/api/media/status')).engine.videoFramesSent
  await choose('legacy')
  await probeWait(x => x.state === 'legacy' && !x.videoTrackSid && !x.audioTrackSid, 'Rollback did not disconnect audience')
  const rolled = await statusWait(x => x.recording?.id === interrupted.id && x.recording.status === 'failed' && x.engine.videoFramesSent > sentBefore + 20, 'Rollback did not fail recording or keep Program running')
  assert.equal(rolled.engine.status, 'healthy')
  pass('scoped rollback disconnects audience, fails interrupted recording, keeps producer Program running', { recording: rolled.recording?.status, reason: rolled.recording?.reason, engine: rolled.engine.status })
  await choose('program')
  await probeWait(x => x.state === 'live' && Boolean(x.videoTrackSid), 'Local canary could not be selected again')
  writeFileSync(resolve(import.meta.dirname, '../.local/production/media/delivery-verification.json'), JSON.stringify({ completedAtMs: Date.now(), checks }, null, 2), { mode: 0o600 })
} catch (error) {
  writeFileSync(resolve(import.meta.dirname, '../.local/production/media/delivery-verification.json'), JSON.stringify({ failedAtMs: Date.now(), checks, error: error instanceof Error ? error.message : 'Local delivery failed' }, null, 2), { mode: 0o600 })
  throw error
} finally { await post('/api/media/audience-probe', { action: 'stop' }).catch(() => {}) }
