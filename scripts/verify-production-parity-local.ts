import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ProductionCommand, ProductionState, CommitResult, Composition } from '../lib/production/contracts.ts'
import type { LocalMediaSession } from '../lib/production/localMediaSession.ts'

const base = 'http://127.0.0.1:4310'
type Status = ReturnType<LocalMediaSession['publicStatus']>
const checks: { check: string; evidence: unknown }[] = []
async function read<T>(path: string): Promise<T> { const r = await fetch(base + path); assert.equal(r.status, 200); return r.json() as Promise<T> }
async function command(command: ProductionCommand) {
  const { state } = await read<{ state: ProductionState }>('/api/state')
  const r = await fetch(base + '/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase1', 'X-Console-Id': 'local-parity-verification' }, body: JSON.stringify({ schemaVersion: 1, scope: state.scope, commandId: randomUUID(), expectedRevision: state.revision, command }) })
  const data = await r.json() as CommitResult; assert.equal(r.status, 200, JSON.stringify(data)); return data.currentState.revision
}
async function wait(check: (value: Status) => boolean, message: string, timeout = 30_000) {
  const end = Date.now() + timeout
  while (Date.now() < end) { const value = await read<Status>('/api/media/status'); if (check(value)) return value; await new Promise(resolve => setTimeout(resolve, 250)) }
  throw new Error(message)
}
async function pause(sourceId: string, paused: boolean) {
  const r = await fetch(base + '/api/media/source-control', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase2' }, body: JSON.stringify({ sourceId, paused }) }); assert.equal(r.status, 200)
}
function pass(check: string, evidence: unknown) { checks.push({ check, evidence }); console.log(`PASS ${check}`) }
try {
  await wait(s => s.engine.status === 'healthy', 'Local Program is not ready')
  const presets = await read<{ id: string; name: string; composition: Composition }[]>('/api/media/presets')
  await command({ type: 'SET_LIVE', live: true })
  const upload = await fetch(base + '/api/media/assets?name=Local%20fixture%20deck.pdf', { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-Jupiter-Local': 'phase3' }, body: readFileSync(resolve(import.meta.dirname, '../tools/production-local/runtime/assets/deck.pdf')) })
  assert.equal(upload.status, 200)
  const asset = await upload.json() as { id: string }
  const imported = await fetch(base + '/api/media/import', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase3' }, body: JSON.stringify({ blocks: [{ id: 'imported-deck', type: 'pdf', assetId: asset.id, page: 2, x: 0, y: 0, width: 640, height: 360, borderRadius: 0 }], sourceIds: {} }) })
  assert.equal(imported.status, 200)
  await command({ type: 'SET_PREVIEW', composition: await imported.json() as Composition })
  const importedRevision = await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } })
  await wait(s => s.engine.observedRevision === importedRevision && !s.renderer?.report.error, 'Uploaded local PDF did not render')
  pass('local asset upload, legacy import and PDF page decode', { assetId: asset.id, revision: importedRevision })
  for (const preset of presets) {
    const before = (await read<{ state: ProductionState }>('/api/state')).state.program
    await command({ type: 'SET_PREVIEW', composition: preset.composition })
    assert.deepEqual((await read<{ state: ProductionState }>('/api/state')).state.program, before)
    if (preset.id === 'motion-asset') await command({ type: 'SET_PLAYBACK', bus: 'preview', layerId: 'clip', positionMs: 0, paused: false, loop: true })
    const revision = await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } })
    const status = await wait(s => s.engine.observedRevision === revision && !s.renderer?.report.error, `Fixture ${preset.id} was not decoded`)
    if (preset.id === 'missing-source') assert.ok(status.renderer.report.sourceWarnings.some(x => x.includes('fallback slate')))
    if (preset.id === 'motion-asset') {
      const first = await wait(s => (s.renderer?.report.assetPositions.clip ?? 0) > 100, 'Video asset did not advance')
      await wait(s => s.renderer?.report.assetPositions.clip !== first.renderer.report.assetPositions.clip, 'Video asset playback stalled')
      const seek = await command({ type: 'SET_PLAYBACK', bus: 'program', layerId: 'clip', positionMs: 800, paused: true, loop: true })
      const paused = await wait(s => s.engine.observedRevision === seek && Math.abs((s.renderer?.report.assetPositions.clip ?? 0) - 800) < 100, 'Paused video seek did not reconstruct the durable timeline')
      pass('video asset paused seek at durable 800 ms position', paused.renderer.report.assetPositions)
      await command({ type: 'SET_PLAYBACK', bus: 'program', layerId: 'clip', positionMs: 800, paused: false, loop: true })
    }
    pass(preset.name, { revision, decodedRevision: status.observer?.report.decodedRevision, width: status.observer?.report.width, height: status.observer?.report.height, warnings: status.renderer?.report.sourceWarnings })
  }
  await command({ type: 'SET_PREVIEW', composition: presets[0].composition })
  await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } })
  await command({ type: 'SET_AUDIO', bus: 'program', audio: { masterGainDb: -6, muted: false, channels: [{ sourceId: 'camera-a', gainDb: -12, muted: false, solo: false }, { sourceId: 'camera-b', gainDb: -12, muted: false, solo: false }] } })
  await pause('camera-a', true); await pause('camera-b', true)
  const stale = await wait(s => Boolean(s.renderer?.report.sourceWarnings.some(x => x === 'camera-a: fallback slate') && s.renderer.report.sourceWarnings.some(x => x === 'camera-b: holding last frame')) && s.observer?.report.audioRms < .0001, 'Missing-source policies or safe audio mute failed')
  assert.equal(stale.engine.status, 'healthy')
  pass('stalled sources: slate A, labelled hold B, silent audio, Program continues', stale.renderer?.report.sourceWarnings)
  await pause('camera-a', false); await pause('camera-b', false)
  await wait(s => s.renderer?.report.sourceWarnings.length === 0 && s.observer?.report.audioRms > .001, 'Sources did not recover')
  const previous = await command({ type: 'SET_PREVIEW', composition: { sceneId: null, layers: [{ id: 'bad', kind: 'image', sourceId: null, props: { assetId: 'not-registered', src: 'https://example.invalid/private-image.png' } }] } })
  await wait(s => s.engine.observedRevision === previous, 'Preview edit was not acknowledged before rejection test')
  await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } })
  const rejected = await wait(s => Boolean(s.renderer?.report.error?.includes('Unregistered local asset')), 'Unknown asset was not rejected')
  assert.equal(rejected.engine.appliedRevision, previous)
  assert.equal(rejected.engine.status, 'degraded')
  const off = await command({ type: 'SET_LIVE', live: false })
  await wait(s => s.engine.observedRevision === off && s.observer?.report.contentSource === 'slate', 'Off-air request was blocked by invalid media')
  pass('unregistered asset refused; off-air still reaches decoded Program', { retainedRevision: previous, offAirRevision: off })
  await command({ type: 'SET_PREVIEW', composition: presets[1].composition })
  await command({ type: 'TAKE', transition: { type: 'cut', durationMs: 0 } })
  const final = await command({ type: 'SET_LIVE', live: true })
  await wait(s => s.engine.observedRevision === final && s.engine.status === 'healthy', 'Valid scene did not recover')
  pass('valid PDF/presenter scene restores healthy Program', { revision: final })
  writeFileSync(resolve(import.meta.dirname, '../.local/production/media/parity-verification.json'), JSON.stringify({ completedAtMs: Date.now(), checks }, null, 2), { mode: 0o600 })
} catch (error) {
  writeFileSync(resolve(import.meta.dirname, '../.local/production/media/parity-verification.json'), JSON.stringify({ failedAtMs: Date.now(), checks, error: error instanceof Error ? error.message : 'Verification failed' }, null, 2), { mode: 0o600 })
  throw error
} finally { await pause('camera-a', false).catch(() => {}); await pause('camera-b', false).catch(() => {}) }
