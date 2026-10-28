import assert from 'node:assert/strict'
import test from 'node:test'
import { fitRect, layout, playbackSeconds, orderedLayers } from '../tools/production-local/runtime/layout.js'
import { parityFixtures } from '../lib/production/parityFixtures.ts'
import { initialProductionState, applyProductionCommand } from '../lib/production/state.ts'
import type { BroadcastScope } from '../lib/production/contracts.ts'

test('media fit preserves aspect ratio and centers cover crops', () => {
  assert.deepEqual(fitRect(1920, 1080, 200, 200), { x: 0, y: 43.75, width: 200, height: 112.5 })
  const cover = fitRect(1920, 1080, 200, 200, 'cover')
  assert.equal(cover.height, 200); assert.ok(cover.x < 0); assert.equal(cover.y, 0)
  assert.throws(() => fitRect(0, 1, 1, 1), /dimensions/)
})

test('legacy transform and animation use producer coordinates and center-origin geometry', () => {
  const box = layout({ x: 10, y: 20, width: 300, height: 150, opacity: .8, rotation: 25, scale: .9, animationType: 'push-left', animationProgress: .5 })
  assert.equal(box.dx, -15); assert.equal(box.rotation, 25); assert.equal(box.opacity, .8); assert.equal(box.radius, 18)
  assert.ok(Math.abs(layout({ opacity: .8, animationType: 'fade', animationProgress: .5 }).opacity - .7) < 1e-10)
  assert.equal(layout({ width: -40, scale: 100, rotation: Infinity }).width, 1)
  assert.equal(layout({ blendMode: 'invalid' }).blend, 'normal')
  const routed = layout({ groupId: 'source-route', opacity: .2, borderRadius: 50, shadowIntensity: 1, blendMode: 'screen' })
  assert.equal(routed.opacity, 1); assert.equal(routed.radius, 0); assert.equal(routed.shadow, 0); assert.equal(routed.blend, 'normal')
})

test('video timeline reconstructs from the durable anchor without restarting on redraw', () => {
  const playing = { positionMs: 1000, anchorTimeMs: 5000, paused: false, loop: true }
  assert.equal(playbackSeconds(playing, 7000, 2), 1)
  assert.equal(playbackSeconds({ ...playing, paused: true }, 9000, 2), 1)
  assert.equal(playbackSeconds({ ...playing, loop: false }, 9000, 2), 2)
})

test('legacy scene fixtures preserve style, logical sources and deterministic layer order', () => {
  const presets = parityFixtures(); assert.equal(presets.length, 6)
  const styled = presets.find(item => item.id === 'style-effects')!.composition
  assert.equal(styled.layers[0].props.rotation, -8)
  assert.equal(styled.layers[0].sourceId, 'camera-a')
  assert.deepEqual(orderedLayers(styled).map(item => item.id), ['a', 'b', 'lower-third', 'brand'])
  assert.equal(presets.find(item => item.id === 'second-slide')!.composition.layers[0].props.page, 2)
  const scope: BroadcastScope = { broadcastId: 'test', eventId: 'event', sessionId: null }
  let state = initialProductionState(scope, 0)
  for (const id of ['camera-a', 'camera-b', 'missing-camera']) state = applyProductionCommand(state, { type: 'REGISTER_SOURCE', source: { sourceId: id, kind: 'camera', label: id, fallback: 'slate' } }, 1)
  for (const preset of presets) {
    const next = applyProductionCommand(state, { type: 'SET_PREVIEW', composition: preset.composition }, 2)
    assert.deepEqual(next.program, state.program, 'Fixture selection must not change Program')
  }
})
