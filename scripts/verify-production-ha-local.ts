import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { mkdirSync, openSync, closeSync, unlinkSync, readFileSync, existsSync, copyFileSync } from 'node:fs'
import { writePrivateJson } from '../lib/production/localAtomicFile.ts'
import type { LocalHaRuntime } from '../lib/production/localHaRuntime.ts'

type Status = ReturnType<LocalHaRuntime['status']>
type Observer = { contentCandidate: string | null; contentSource: string | null; selectionMismatches: number; dominantHz: number; candidate: string | null; generation: number; revision: number | null; validFrames: number; lastGoodAtMs: number; lastAudibleAtMs: number; maxVideoGapMs: number; maxAudioGapMs: number; maxSlateMs: number; audioRms: number; videoTrackSid: string | null; audioTrackSid: string | null; publisher: string | null; atMs: number }
type Gateway = { inputs: Record<string, { frames: number; ageMs: number; revision: number }>; generation: number; selected: string | null; atMs: number }
const directory = resolve(import.meta.dirname, '../.local/production/ha'), base = 'http://127.0.0.1:4311'
mkdirSync(directory, { recursive: true, mode: 0o700 })
const lock = resolve(directory, 'verification.lock'), fd = openSync(lock, 'wx', 0o600)
if (existsSync(resolve(directory, 'verification.json'))) copyFileSync(resolve(directory, 'verification.json'), resolve(directory, `verification-${Date.now()}.json`))
const result: { outcome: string; runId: string | null; startedAtMs: number; endedAtMs?: number; checks: { check: string; evidence: unknown }[]; error?: string; cleanup?: unknown; observations: { atMs: number; selected: string; generation: number; observer: Observer | null }[] } = { outcome: 'running', runId: null, startedAtMs: Date.now(), checks: [], observations: [] }
const observer = (s: Status) => s.observer as Observer | null
const gateway = (s: Status) => s.gateway as Gateway | null
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const deadline = Date.now() + 240_000
let cancelled = false
process.once('SIGINT', () => { cancelled = true }); process.once('SIGTERM', () => { cancelled = true })
async function read<T = Status>(path = '/api/ha/status'): Promise<T> { const response = await fetch(base + path, { signal: AbortSignal.timeout(4000) }); assert.equal(response.status, 200); return response.json() as Promise<T> }
async function action(action: string, extra: Record<string, unknown> = {}, expectedStatus = 200) {
  const current = await read()
  assert.equal(current.runId, result.runId, 'Do not act on a replacement run')
  const response = await fetch(base + '/api/ha/action', { method: 'POST', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/json', 'X-Jupiter-Local': 'phase7' }, body: JSON.stringify({ action, runId: current.runId, expectedGeneration: current.generation, ...extra }) })
  const value = await response.json(); assert.equal(response.status, expectedStatus, value.error); return value as Status
}
async function until(predicate: (s: Status) => boolean, message: string, timeout = 25_000) {
  const end = Math.min(deadline, Date.now() + timeout)
  while (Date.now() < end && !cancelled) {
    const value = await read(); assert.equal(value.runId, result.runId)
    if (value.failure) throw new Error(value.failure)
    result.observations.push({ atMs: Date.now(), selected: value.selected, generation: value.generation, observer: observer(value) })
    if (predicate(value)) return value
    await delay(100)
  }
  throw new Error(message)
}
function output(s: Status, candidate: string, generation = s.generation) {
  const x = observer(s)
  return Boolean(x && x.candidate === candidate && x.generation === generation && x.revision === s.revision && Date.now() - x.lastGoodAtMs < 750 && Date.now() - x.atMs < 750 && x.audioRms > .0005)
}
function warm(s: Status, candidate: 'primary' | 'standby') {
  const c = s.candidates[candidate], g = gateway(s), input = g?.inputs[`candidate-${candidate}`]
  return Boolean(c && !c.error && c.revision === s.revision && Date.now() - c.progressedAtMs < 600 && g && input && input.revision === s.revision && Date.now() - g.atMs + input.ageMs < 250)
}
function pass(check: string, evidence: unknown) { result.checks.push({ check, evidence }); writePrivateJson(resolve(directory, 'verification.json'), result); console.log(`PASS ${check}`) }
try {
  const initial = await read(); result.runId = initial.runId
  assert.equal(initial.running, true); assert.equal(initial.cloudDeployed, false); assert.equal(initial.recordingEnabled, false)
  await until(s => (['primary', 'standby'] as const).every(candidate => warm(s, candidate)), 'Both candidate renderers did not synchronize')
  await action('promote-primary')
  let state = await until(s => output(s, 'primary') && observer(s)!.validFrames > 30, 'Primary Program did not decode with audio')
  const baseline = observer(state)!, generation = state.generation
  pass('two synchronized renderers feed one gateway-only Program publication', { generation, revision: state.revision, receiver: baseline, workers: state.workers })
  const participants = await read<Record<string, { identity: string; tracks: number }[]>>('/api/ha/participants')
  assert.equal(participants.program.filter(x => x.tracks > 0).length, 1)
  assert.ok(participants.program.filter(x => x.tracks > 0).every(x => x.identity.startsWith('program-engine-')))
  assert.ok(participants.candidates.some(x => x.identity === 'candidate-primary' && x.tracks === 2)); assert.ok(participants.candidates.some(x => x.identity === 'candidate-standby' && x.tracks === 2))
  pass('SFU output contains one gateway publisher; candidates publish only to their private room', participants)
  await action('scene', { scene: 'clip' })
  state = await until(s => output(s, s.selected) && ['primary', 'standby'].every(candidate => { const c = s.candidates[candidate as 'primary' | 'standby']; return c?.revision === s.revision && Math.abs((c.assetPositions.clip ?? -1000) - 900) < 80 }), 'Standby asset/playback snapshot was not synchronized', 30_000)
  pass('both renderers apply the same asset, committed revision and paused 900 ms playback intent', { revision: state.revision, candidates: state.candidates })
  await action('scene', { scene: 'a' }); await until(s => output(s, 'primary'), 'Primary source scene did not resume')
  const partitionAtMs = Date.now(); await action('partition-primary'); await action('scene', { scene: 'b' })
  state = await until(s => s.generation > generation && output(s, 'standby') && observer(s)?.contentSource === 'camera-b' && observer(s)!.dominantHz > 600 && observer(s)!.dominantHz < 720, 'Partition output failed selected-candidate, picture or tone acceptance')
  const primaryFrames = gateway(state)!.inputs['candidate-primary'].frames, afterPartition = observer(state)!, switchedGeneration = state.generation
  const end = Date.now() + 3000
  while (Date.now() < end) {
    state = await read(); const receiver = observer(state)!
    assert.equal(receiver.candidate, 'standby'); assert.equal(receiver.contentCandidate, 'standby'); assert.equal(receiver.contentSource, 'camera-b'); assert.equal(receiver.selectionMismatches, 0); assert.ok(receiver.dominantHz > 600 && receiver.dominantHz < 720); assert.equal(receiver.generation, switchedGeneration); assert.ok(Date.now() - receiver.lastGoodAtMs < 750)
    result.observations.push({ atMs: Date.now(), selected: state.selected, generation: state.generation, observer: receiver }); await delay(100)
  }
  assert.ok(gateway(state)!.inputs['candidate-primary'].revision < state.revision, 'Partitioned primary must retain old committed content while standby applies the new scene')
  assert.ok(gateway(state)!.inputs['candidate-primary'].frames > primaryFrames + 40, 'Old primary must stay alive and keep sending private media during the partition')
  assert.equal(observer(state)!.videoTrackSid, baseline.videoTrackSid, 'Candidate takeover should keep the gateway publication')
  assert.equal(observer(state)!.audioTrackSid, baseline.audioTrackSid)
  await action('promote-primary', { expectedGeneration: generation }, 400)
  pass('control-partition takeover fences the still-publishing old primary and rejects its stale generation', { partitionAtMs, recoveredAtMs: afterPartition.lastGoodAtMs, generation: switchedGeneration, oldPrivateFramesBefore: primaryFrames, oldPrivateFramesAfter: gateway(state)!.inputs['candidate-primary'].frames, receiver: observer(state) })
  await action('heal-primary'); await action('scene', { scene: 'b' })
  await until(s => (['primary', 'standby'] as const).every(id => warm(s, id)), 'Recovered primary did not rehydrate latest state')
  await action('promote-primary'); state = await until(s => output(s, 'primary'), 'Primary did not accept controlled failback')
  const beforeCrash = observer(state)!, crashAtMs = Date.now(); await action('crash-primary')
  state = await until(s => output(s, 'standby') && s.generation > beforeCrash.generation, 'Primary crash did not recover through standby')
  pass('primary process crash recovers on standby without changing the audience publication', { crashAtMs, recovered: observer(state), beforeCrash, primaryWorker: state.workers.find(x => x.role === 'primary') })
  const beforeOutage = observer(state)!, outageGeneration = state.generation
  await action('authority-off')
  state = await until(s => observer(s)?.candidate === null && observer(s)!.audioRms < .0001, 'Expired gateway authority did not produce slate and silence')
  await delay(1200); state = await read(); assert.equal(observer(state)!.candidate, null); assert.equal(state.generation, outageGeneration)
  await action('authority-on'); state = await until(s => output(s, 'standby'), 'Output did not resume after authority link recovered')
  pass('authority-link outage expires output permission, mutes audio and blocks unsafe promotion', { beforeOutage, recovered: observer(state), generationUnchanged: state.generation === outageGeneration })
  const beforeGateway = observer(state)!, gatewayCrashAtMs = Date.now()
  await action('crash-gateway'); state = await until(s => output(s, 'standby') && observer(s)!.videoTrackSid !== beforeGateway.videoTrackSid, 'Gateway did not recover with a new fenced publication')
  pass('gateway crash creates an explicit publication discontinuity and bounded replacement', { gatewayCrashAtMs, beforeGateway, recovered: observer(state), gatewayEpoch: state.gatewayEpoch })
  const beforeReload = state.generation; await action('reload-authority')
  state = await until(s => s.generation > beforeReload && output(s, 'standby'), 'Authority reload did not restore monotonic persisted generation')
  const journal = JSON.parse(readFileSync(resolve(directory, 'authority.json'), 'utf8')); assert.equal(journal.generation, state.generation)
  pass('authority journal reload preserves selection, advances generation and reacquires fresh readiness', { priorGeneration: beforeReload, generation: state.generation, boundaries: state.boundaries })
  const finalParticipants = await read<Record<string, { identity: string; tracks: number }[]>>('/api/ha/participants')
  assert.equal(finalParticipants.program.filter(x => x.tracks > 0).length, 1)
  let maximum = 0
  for (const item of result.observations) { if (item.observer?.candidate) { assert.equal(item.observer.selectionMismatches, 0); assert.equal(item.observer.contentCandidate, item.observer.candidate); assert.ok(item.observer.generation >= maximum, 'Decoded output authority regressed'); maximum = item.observer.generation } }
  pass('independent output generations never regress and only one Program publisher remains', { participants: finalParticipants.program, receiver: observer(state), recording: 'not enabled; metadata boundaries only' })
  result.outcome = 'completed'
} catch (error) { result.outcome = 'failed'; result.error = error instanceof Error ? error.message : 'HA drill failed'; process.exitCode = 1 }
finally {
  try { if (result.runId) { const stopped = await action('stop'); result.cleanup = { workersStopped: !stopped.running && stopped.workers.length === 0 && !stopped.failure, recordingEnabled: false }; if (!(result.cleanup as { workersStopped: boolean }).workersStopped) throw new Error('HA cleanup incomplete') } }
  catch (error) { result.outcome = 'failed'; result.error = `${result.error || ''} Cleanup: ${error instanceof Error ? error.message : 'failed'}`; process.exitCode = 1 }
  result.endedAtMs = Date.now(); writePrivateJson(resolve(directory, 'verification.json'), result); closeSync(fd); unlinkSync(lock)
  if (result.error) console.error(result.error)
}
