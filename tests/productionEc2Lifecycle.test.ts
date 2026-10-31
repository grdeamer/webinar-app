import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startProducerEc2, stopProducerEc2, PRODUCER_EC2_SESSION_MS, type ProducerEc2Port } from '../lib/production/ec2Lifecycle.ts'
function fixture(state = 'stopped') {
  let deadline: number | null = null
  const calls: string[] = []
  const port: ProducerEc2Port = { async state() { calls.push('state'); return state }, async stopAt() { calls.push('verify'); return deadline }, async arm(d) { calls.push('arm'); deadline = d }, async start() { calls.push('start') }, async stop() { calls.push('stop') } }
  return { port, calls, deadline: (d: number) => { deadline = d } }
}
test('independent cloud shutdown is created and verified before EC2 starts', async () => {
  const f = fixture(); const r = await startProducerEc2(f.port, 100000)
  assert.equal(r.stopAtMs, 100000 + PRODUCER_EC2_SESSION_MS)
  assert.deepEqual(f.calls, ['state', 'verify', 'arm', 'verify', 'start'])
})
test('schedule creation or verification failure never starts paid compute', async () => {
  for (const failure of ['arm', 'verify']) {
    const f = fixture(); if (failure === 'arm') f.port.arm = async () => { throw Error('denied') }; else f.port.stopAt = async () => null
    await assert.rejects(startProducerEc2(f.port, 100000)); assert.ok(!f.calls.includes('start'))
  }
})
test('running instances and restarts retain the original deadline rather than extending spend', async () => {
  for (const state of ['running', 'pending', 'stopped']) {
    const f = fixture(state); f.deadline(200000)
    assert.equal((await startProducerEc2(f.port, 100000)).stopAtMs, 200000)
    assert.ok(!f.calls.includes('arm'))
  }
})
test('an unguarded running instance is stopped and an ambiguous start preserves shutdown', async () => {
  const f = fixture('running'); await assert.rejects(startProducerEc2(f.port, 100000)); assert.ok(f.calls.includes('stop'))
  const g = fixture(); g.port.start = async () => { throw Error('timeout') }; await assert.rejects(startProducerEc2(g.port, 100000)); assert.equal(g.calls.at(-1), 'stop')
  g.calls.length = 0; await stopProducerEc2(g.port); assert.equal(g.calls[0], 'stop'); assert.ok(!g.calls.includes('arm'))
})

test('an unreadable shutdown for an active instance stops it instead of renewing or ignoring protection', async () => {
  const f = fixture('running'); f.port.stopAt = async () => { throw Error('scheduler unavailable') }
  await assert.rejects(startProducerEc2(f.port, 100000)); assert.ok(f.calls.includes('stop')); assert.ok(!f.calls.includes('start'))
})
