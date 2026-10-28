import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import type { ProductionCommand } from "../lib/production/contracts.ts"
import type { ProductionState, CommitResult } from "../lib/production/contracts.ts"
import type { LocalMediaSession } from "../lib/production/localMediaSession.ts"
import type { LocalRecording } from "../lib/production/localRecording.ts"

type Status = ReturnType<LocalMediaSession["publicStatus"]> & { recording: LocalRecording | null }

const base = "http://127.0.0.1:4310"
const checks: { check: string; atMs: number; evidence: unknown }[] = []
async function read<T>(path: string): Promise<T> { const response = await fetch(`${base}${path}`); assert.equal(response.status, 200); return await response.json() as T }
async function waitFor(check: (status: Status) => boolean, message: string, timeout = 30_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const status = await read<Status>('/api/media/status')
    if (check(status)) return status
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(message)
}
async function command(value: ProductionCommand) {
  const { state } = await read<{ state: ProductionState }>('/api/state')
  const response = await fetch(`${base}/api/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase1', 'X-Console-Id': 'local-media-verification' },
    body: JSON.stringify({ schemaVersion: 1, scope: state.scope, commandId: randomUUID(), expectedRevision: state.revision, command: value }) })
  const result = await response.json() as CommitResult & { error?: string }; assert.equal(response.status, 200, result.error)
  return result.currentState.revision
}
async function mediaControl(path: string, body: unknown) {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase2' }, body: JSON.stringify(body) })
  const data = await response.json() as LocalRecording & { error?: string }; assert.equal(response.status, 200, data.error); return data
}
function evidence(name: string, value: unknown) { checks.push({ check: name, atMs: Date.now(), evidence: value }); console.log(`PASS ${name}`) }
async function preview(sourceId: string) {
  await command({ type: 'SET_PREVIEW', composition: { sceneId: null, layers: [
    { id: 'main', kind: 'camera', sourceId, props: { x: 0, y: 0, width: 640, height: 360 } },
    { id: 'title', kind: 'text', sourceId: null, props: { x: 20, y: 280, width: 450, height: 30, content: 'JUPITER / LOCAL PROGRAM GRAPHIC' } },
  ] } })
}

try {
  const initial = await waitFor(status => status.engine.status === 'healthy' && Object.keys(status.renderer.report.inputFrames).length === 2, 'Two inputs did not become healthy')
  evidence('two independently decoded LiveKit input sources', initial.renderer.report.inputFrames)
  await preview('camera-a')
  await command({ type: 'SET_AUDIO', bus: 'preview', audio: { masterGainDb: -6, muted: false, channels: [{ sourceId: 'camera-a', gainDb: -12, muted: false, solo: false }] } })
  await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } })
  let revision = await command({ type: 'SET_LIVE', live: true })
  const a = await waitFor(status => status.engine.observedRevision === revision && status.observer.report.contentSource === 'camera-a' && status.observer.report.audioRms > .001, 'Source A video/audio was not received')
  evidence('source A and mixed audio received', a.observer)
  const beforeTransition = a.observer.report.transitionFrames
  await preview('camera-b'); revision = await command({ type: 'TAKE', transition: { type: 'fade', durationMs: 500 } })
  const b = await waitFor(status => status.engine.observedRevision === revision && status.observer.report.contentSource === 'camera-b' && status.observer.report.transitionFrames > beforeTransition, 'Crossfade was not decoded')
  evidence('crossfade and source B decoded', { revision, transitionFrames: b.observer.report.transitionFrames - beforeTransition })
  revision = await command({ type: 'SET_AUDIO', bus: 'program', audio: { masterGainDb: -6, muted: true, channels: [] } })
  const muted = await waitFor(status => status.engine.observedRevision === revision && status.observer.report.audioRms < .0001, 'Program mute did not reach received audio')
  evidence('Program mute received', muted.observer.report.audioRms)
  revision = await command({ type: 'SET_AUDIO', bus: 'program', audio: { masterGainDb: -6, muted: false, channels: [{ sourceId: 'camera-b', gainDb: -12, muted: false, solo: false }] } })
  await waitFor(status => status.engine.observedRevision === revision && status.observer.report.audioRms > .001, 'Program audio did not return')
  const job = await mediaControl('/api/media/record', { action: 'start' })
  await waitFor(status => status.recording?.bytes > 1000, 'Received Program recording did not start')
  await preview('camera-a'); await command({ type: 'TAKE', transition: { type: 'fade', durationMs: 500 } })
  const recordStart = Date.now()
  while (Date.now() - recordStart < 4000) await new Promise(resolve => setTimeout(resolve, 250))
  await mediaControl('/api/media/record', { action: 'stop' })
  const recorded = await waitFor(status => status.recording?.status === 'complete', 'Program recording did not finalize')
  const download = await fetch(`${base}/api/media/recording-download?id=${job.id}`)
  const bytes = new Uint8Array(await download.arrayBuffer())
  assert.deepEqual([...bytes.slice(0, 4)], [0x1a, 0x45, 0xdf, 0xa3])
  evidence('same received Program recorded as WebM', { id: job.id, bytes: bytes.length, metadata: recorded.recording })
  const before = await read<Status>('/api/media/status')
  console.log('Observing independent Program for 20 seconds without control commands...')
  const quietUntil = Date.now() + 20_000
  while (Date.now() < quietUntil) await new Promise(resolve => setTimeout(resolve, 500))
  const after = await read<Status>('/api/media/status')
  assert.equal(after.engine.status, 'healthy'); assert.equal(after.engine.generation, before.engine.generation)
  assert.ok(after.observer.report.decodedFrames - before.observer.report.decodedFrames > 200)
  evidence('20 seconds without console commands, no renderer restart', { receivedFrames: after.observer.report.decodedFrames - before.observer.report.decodedFrames, observerFps: after.observer.fps, width: after.observer.report.width, height: after.observer.report.height })
  if (after.restarts === 0) {
    await mediaControl('/api/media/restart-renderer', {})
    const recovered = await waitFor(status => status.engine.generation === after.engine.generation + 1 && status.engine.status === 'healthy', 'Renderer did not recover', 45_000)
    evidence('separate renderer crash/recovery (not seamless HA)', { generation: recovered.engine.generation, decodedRevision: recovered.engine.observedRevision })
  }
  writeFileSync(resolve(import.meta.dirname, '../.local/production/media/verification.json'), JSON.stringify({ completedAtMs: Date.now(), checks }, null, 2), { mode: 0o600 })
  console.log('Local synthetic-media verification completed. No production services were used.')
} catch (error) {
  writeFileSync(resolve(import.meta.dirname, '../.local/production/media/verification.json'), JSON.stringify({ failedAtMs: Date.now(), checks, error: error instanceof Error ? error.message : 'Verification failed' }, null, 2), { mode: 0o600 })
  throw error
}
