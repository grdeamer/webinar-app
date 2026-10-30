import { test } from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error Browser runtime modules are exercised directly without a TypeScript wrapper.
import { nextFrameDeadline } from '../tools/production-local/runtime/frame-clock.js'
// @ts-expect-error Browser runtime modules are exercised directly without a TypeScript wrapper.
import { GainTargets } from '../tools/production-local/runtime/gain-target.js'
test('a delayed render does not incur another idle frame and on-time frames retain their cadence', () => {
  assert.equal(nextFrameDeadline(0, 5, 30), 1000 / 30)
  assert.equal(nextFrameDeadline(0, 100, 30), 100)
  const late = nextFrameDeadline(0, 100, 30)
  assert.equal(nextFrameDeadline(late, 105, 30), 100 + 1000 / 30)
})
test('constant gains stay bounded while mute and level changes still schedule smoothing', () => {
  const calls: number[][] = [], parameter = { setTargetAtTime: (...x: number[]) => calls.push(x) }, targets = new GainTargets()
  for (let i = 0; i < 1800; i++) targets.set(parameter, .5, i / 30)
  assert.equal(calls.length, 1)
  targets.set(parameter, 0, 60); targets.set(parameter, 1, 61)
  assert.deepEqual(calls, [[.5, 0, .02], [0, 60, .02], [1, 61, .02]])
})

test('hosted cadence follows authority selection, independently of composition revisions', async () => {
  const { candidateRenderFps } = await import('../lib/production/compositorCadence.ts')
  for (const selected of ['primary', 'standby'] as const) for (const worker of ['primary', 'standby'] as const) {
    assert.equal(candidateRenderFps(true, selected, worker), selected === worker ? 30 : 15)
    assert.equal(candidateRenderFps(false, selected, worker), 30)
  }
  assert.equal(candidateRenderFps(true, null, 'primary'), 30)
  assert.equal(candidateRenderFps(true, null, 'standby'), 30)
})
