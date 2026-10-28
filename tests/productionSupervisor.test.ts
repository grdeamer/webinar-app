import assert from 'node:assert/strict'
import test from 'node:test'
import { RuntimeSupervisor } from '../lib/production/runtimeSupervisor.ts'
import { parseMediaReport, updateMediaProgress } from '../lib/production/mediaHealth.ts'

test('supervisor respects startup grace but detects frozen media despite fresh heartbeats', () => {
  const policy = new RuntimeSupervisor(); policy.launched('renderer', 1000)
  const report = parseMediaReport({ appliedRevision: 1, framesRendered: 30, framesSent: 30, audioPackets: 40, decodedFrames: 0, decodedRevision: null, markerFrame: null, width: 1280, height: 720 })
  const first = updateMediaProgress(null, report, 2000, false)
  const heartbeat = updateMediaProgress(first, report, 18000, false)
  assert.equal(policy.stale('renderer', heartbeat, 10000), false)
  assert.equal(policy.stale('renderer', heartbeat, 18000), true)
  const progressing = updateMediaProgress(heartbeat, { ...report, framesSent: 60, error: 'Invalid scene' }, 19000, false)
  assert.equal(policy.stale('renderer', progressing, 19000), false, 'A configuration error must not create a restart loop')
})

test('recovery is per-role, bounded and backed off without extending the session', () => {
  const policy = new RuntimeSupervisor()
  assert.equal(policy.begin('renderer', 'stall', 1000), 500)
  assert.throws(() => policy.begin('renderer', 'exit', 1100), /already/)
  policy.end('renderer', 2000)
  assert.equal(policy.begin('renderer', 'exit', 3000), 1000); policy.end('renderer', 4000)
  assert.throws(() => policy.begin('renderer', 'stall', 5000), /budget/)
  policy.begin('observer', 'decoder', 6000); policy.end('observer', 7000)
  assert.equal(policy.attempts.length, 3)
  assert.equal(policy.stale('renderer', null, 5000), false)
})
