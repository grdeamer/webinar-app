import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { liveRecordingDisabled, liveEgressDisabled, assertLiveRecordingAllowed, assertLiveEgressAllowed } from '../lib/live/deploymentPolicy.ts'

test('self-hosted deployment denies recording even with conflicting enable configuration', () => {
  const env = { LIVEKIT_DEPLOYMENT: 'self-hosted', LIVEKIT_RECORDING_ENABLED: 'true', LIVEKIT_EGRESS_ENABLED: 'true' }
  assert.equal(liveRecordingDisabled(env), true)
  assert.throws(() => assertLiveRecordingAllowed(env), /Recording is disabled/)
})
test('RTMP is unavailable until a self-hosted exporter is explicitly installed; no Cloud fallback', () => {
  assert.equal(liveEgressDisabled({ LIVEKIT_DEPLOYMENT: 'self-hosted' }), true)
  assert.throws(() => assertLiveEgressAllowed({ LIVEKIT_DEPLOYMENT: 'self-hosted' }), /No Cloud fallback/)
  assert.equal(liveEgressDisabled({ LIVEKIT_DEPLOYMENT: 'self-hosted', LIVEKIT_EGRESS_ENABLED: 'true' }), false)
  assert.equal(liveEgressDisabled({}), false)
})
test('explicit recording-off policy also protects deployments during cutover', () => {
  assert.equal(liveRecordingDisabled({ LIVEKIT_RECORDING_ENABLED: 'false' }), true)
  assert.equal(liveRecordingDisabled({}), false)
})
test('recording entry point checks policy before creating a media room', () => {
  const recording = readFileSync(new URL('../app/api/livekit/recording/start/route.ts', import.meta.url), 'utf8')
  assert.ok(recording.indexOf('if (liveRecordingDisabled())') < recording.indexOf('const room = await ensureEventLiveRoom'))
})
