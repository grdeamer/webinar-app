import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hostedTrialLimits } from '../lib/production/hosted/trialLimits.ts'
import { hostedSourceReady } from '../lib/production/hostedSoak.ts'
test('only explicit single-use hour trial names select the longer bounded profile', () => {
  assert.deepEqual(hostedTrialLimits('jupiter-producer-trial-hour-20261029-abcdefgh'), { hour: true, cloudMs: 4200000, mediaMs: 3960000 })
  for (const name of ['jupiter-producer-trial-20261029-fps2', 'jupiter-producer-trial-hour-', 'hour', 'jupiter-producer-trial-hour-abcdefgh/other']) assert.equal(hostedTrialLimits(name).cloudMs, 1800000)
})
test('hour readiness requires a fresh full-HD file lease; demos and stale inputs cannot start the clock', () => {
  const now = 10000, status = { sourceMedia: { 'source-a': { atMs: 9900, encoding: { width: 1920, height: 1080 } } } }
  const input = { kind: 'file', leaseExpiresAtMs: 12000 }
  assert.equal(hostedSourceReady(input, status, now), true)
  assert.equal(hostedSourceReady({ ...input, kind: 'demo' }, status, now), false)
  assert.equal(hostedSourceReady({ ...input, leaseExpiresAtMs: now }, status, now), false)
  assert.equal(hostedSourceReady(input, status, 13000), false)
  status.sourceMedia['source-a'].encoding.width = 1280
  assert.equal(hostedSourceReady(input, status, now), false)
})
test('long rehearsal runtime requires explicit hosted transport and a private fault owner', async t => {
  const { LocalHaRuntime } = await import('../lib/production/localHaRuntime.ts')
  const { mkdtempSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'hosted-hour-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const options = { rehearsal: true, hostedHourSoak: true, rehearsalDeadlineAtMs: Date.now() + 66 * 60_000, controlKey: 'a'.repeat(64), transport: { url: 'wss://test.livekit.cloud', apiKey: 'test', apiSecret: 'b'.repeat(32) } }
  assert.throws(() => new LocalHaRuntime(dir, { ...options, controlKey: undefined }), /private control/)
  assert.throws(() => new LocalHaRuntime(dir, { ...options, transport: undefined }), /private control/)
  assert.throws(() => new LocalHaRuntime(dir, { ...options, rehearsalDeadlineAtMs: Date.now() + 71 * 60_000 }), /deadline/)
  const runtime = new LocalHaRuntime(dir, options)
  assert.equal(runtime.status().managedSoak, true)
  assert.equal(runtime.status().expiresAtMs, options.rehearsalDeadlineAtMs)
  runtime.store.close()
})
