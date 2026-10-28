import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ProductionState, ProductionCommand, CommitResult } from '../lib/production/contracts.ts'
import type { LocalMediaSession, RuntimeRole } from '../lib/production/localMediaSession.ts'
import type { LocalRecording } from '../lib/production/localRecording.ts'

const base = 'http://127.0.0.1:4310', seconds = Number(process.argv[2] ?? 300)
if (!Number.isInteger(seconds) || seconds < 60 || seconds > 600) throw new Error('Choose a 60-600 second local steady observation')
type Status = ReturnType<LocalMediaSession['publicStatus']> & { recording: LocalRecording | null }
const checks: { check: string; atMs: number; evidence: unknown }[] = []
async function read<T>(path: string): Promise<T> { const r = await fetch(base + path); assert.equal(r.status, 200); return r.json() as Promise<T> }
async function post(path: string, body: unknown, phase = 'phase4') {
  const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': phase }, body: JSON.stringify(body) })
  const result = await r.json(); assert.equal(r.status, 200, JSON.stringify(result)); return result
}
async function wait(check: (s: Status) => boolean, message: string, timeout = 50_000) {
  const end = Date.now() + timeout
  while (Date.now() < end) { const s = await read<Status>('/api/media/status'); if (check(s)) return s; await new Promise(resolve => setTimeout(resolve, 500)) }
  throw new Error(message)
}
async function command(command: ProductionCommand) {
  const { state } = await read<{ state: ProductionState }>('/api/state')
  const r = await fetch(base + '/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase1', 'X-Console-Id': 'local-runtime-verification' }, body: JSON.stringify({ schemaVersion: 1, scope: state.scope, commandId: randomUUID(), expectedRevision: state.revision, command }) })
  const data = await r.json() as CommitResult; assert.equal(r.status, 200); return data.currentState.revision
}
function pass(check: string, evidence: unknown) { checks.push({ check, atMs: Date.now(), evidence }); console.log(`PASS ${check}`) }
async function fault(role: RuntimeRole, mode: 'exit' | 'freeze') { return post('/api/media/fault', { role, mode }) }

try {
  await wait(s => s.engine.status === 'healthy', 'Local runtime is not ready')
  await command({ type: 'SET_PREVIEW', composition: { sceneId: null, layers: [{ id: 'main', kind: 'camera', sourceId: 'camera-a', props: { x: 0, y: 0, width: 640, height: 360, borderRadius: 0 } }] } })
  await command({ type: 'SET_AUDIO', bus: 'preview', audio: { masterGainDb: -6, muted: false, channels: [{ sourceId: 'camera-a', gainDb: -12, muted: false, solo: false }] } })
  await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } })
  let revision = await command({ type: 'SET_LIVE', live: true })
  let before = await wait(s => s.engine.observedRevision === revision && s.observer!.report.audioRms > .001, 'Synthetic Program did not become ready')
  assert.equal(before.syntheticOnly, true)
  const job = await post('/api/media/record', { action: 'start' }, 'phase2') as LocalRecording
  await wait(s => (s.recording?.bytes ?? 0) > 1000, 'Synthetic test recording did not start')
  await fault('renderer', 'exit')
  let after = await wait(s => s.engine.generation === before.engine.generation + 1 && s.engine.status === 'healthy', 'Renderer process exit did not recover')
  assert.equal(after.recording?.status, 'failed'); assert.equal(after.recording?.id, job.id)
  assert.ok(after.credentialEpochs.renderer > before.credentialEpochs.renderer)
  assert.equal(after.engine.observedRevision, revision)
  pass('renderer exit: rehydrated revision, rotated credentials, interrupted recording failed', { generation: after.engine.generation, revision, recording: after.recording })
  before = after
  await fault('renderer', 'freeze')
  await wait(s => s.engine.status === 'degraded', 'Frozen sender was not marked degraded')
  after = await wait(s => s.engine.generation === before.engine.generation + 1 && s.engine.status === 'healthy', 'Fresh heartbeat hid a frozen renderer')
  pass('renderer stall with continuing heartbeat recovered under budget', { generation: after.engine.generation, attempts: after.supervisor.attempts })
  before = after
  await fault('observer', 'freeze')
  after = await wait(s => s.credentialEpochs.observer > before.credentialEpochs.observer && s.engine.status === 'healthy', 'Independent decoder did not recover')
  assert.equal(after.engine.generation, before.engine.generation)
  pass('observer stall recovered without restarting Program publisher', { generation: after.engine.generation, observerEpoch: after.credentialEpochs.observer })
  const source = after.sources['camera-a'].videoTrackSid
  await fault('source-a', 'exit')
  after = await wait(s => s.sources['camera-a'].videoTrackSid !== source && s.engine.status === 'healthy' && s.renderer?.report.sourceWarnings.length === 0 && s.observer?.report.audioRms > .001, 'Replacement source did not rebind')
  revision = (await read<{ state: ProductionState }>('/api/state')).state.revision
  after = await wait(s => s.engine.observedRevision === revision && s.engine.status === 'healthy', 'Source binding revision was not decoded')
  pass('source exit recovered with a new track and stable logical source ID', { sidChanged: after.sources['camera-a'].videoTrackSid !== source, epoch: after.credentialEpochs['source-a'] })
  const history = await read<LocalRecording[]>('/api/media/recordings')
  assert.equal(history.find(item => item.id === job.id)?.status, 'failed')
  const started = Date.now(), steady = after, rates: number[] = []
  console.log(`Observing ${seconds} healthy seconds; Program recording is off...`)
  while (Date.now() - started < seconds * 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    after = await read<Status>('/api/media/status')
    assert.equal(after.engine.status, 'healthy'); assert.equal(after.engine.generation, steady.engine.generation)
    assert.equal(after.engine.observedRevision, revision); assert.equal(after.restarts, steady.restarts)
    assert.notEqual(after.recording?.status, 'recording'); rates.push(after.observer!.fps)
  }
  const elapsed = (after.observer!.reportedAtMs - steady.observer!.reportedAtMs) / 1000
  pass('bounded steady local observation completed', { elapsedSeconds: elapsed, decodedFrames: after.observer!.report.decodedFrames - steady.observer!.report.decodedFrames, uniqueDecodedFps: (after.observer!.report.decodedFrames - steady.observer!.report.decodedFrames) / elapsed, minIntervalFps: Math.min(...rates), maxIntervalFps: Math.max(...rates), width: after.observer!.report.width, height: after.observer!.report.height, generation: after.engine.generation, restartsDuringObservation: after.restarts - steady.restarts, recordingActive: false })
  writeFileSync(resolve(import.meta.dirname, '../.local/production/media/runtime-verification.json'), JSON.stringify({ completedAtMs: Date.now(), checks }, null, 2), { mode: 0o600 })
} catch (error) {
  writeFileSync(resolve(import.meta.dirname, '../.local/production/media/runtime-verification.json'), JSON.stringify({ failedAtMs: Date.now(), checks, error: error instanceof Error ? error.message : 'Runtime verification failed' }, null, 2), { mode: 0o600 })
  throw error
}
