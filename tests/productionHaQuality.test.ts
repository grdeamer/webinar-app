import test from 'node:test'
import assert from 'node:assert/strict'
import { qualityWindow, type QualityPoint } from '../lib/production/haQualityMetrics.ts'
function points(): QualityPoint[] { return Array.from({ length: 21 }, (_, i) => ({ atMs: 1000 + i * 1000, frames: 50 + i * 30, decoded: 100 + i * 30, presented: 200 + i * 30, width: 1920, height: 1080, videoTrackSid: 'TR_program', generation: 10 })) }
test('1080p30 requires decoded counters and full dimensions throughout the timed window', () => {
  const x = points(), result = qualityWindow(x)
  assert.equal(result.distinctFps, 30); assert.equal(result.decodedFps, 30); assert.equal(result.presentedFps, 30); assert.equal(result.fullHdThroughout, true); assert.equal(result.p05WindowFps, 30)
  x[10].width = 1280; assert.equal(qualityWindow(x).fullHdThroughout, false)
})
test('quality measurements reject startup-only windows, counter resets and hidden publication/generation changes', () => {
  assert.throws(() => qualityWindow(points().slice(0, 4)), /ten seconds/)
  for (const change of [(x: QualityPoint) => { x.frames = 0 }, (x: QualityPoint) => { x.videoTrackSid = 'TR_other' }, (x: QualityPoint) => { x.generation++ }, (x: QualityPoint) => { x.atMs = 1 }]) {
    const x = points(); change(x[10]); assert.throws(() => qualityWindow(x))
  }
})

test('single-readback marker decoding preserves frame/revision integrity and rejects corruption', async () => {
  const { markerBytes, readMarkerPixels, MARKER_WIDTH, MARKER_SIZE, MARKER_CELLS } = await import('../tools/production-local/runtime/marker.js')
  const pixels = new Uint8ClampedArray(MARKER_WIDTH * MARKER_SIZE * 4), bytes = markerBytes(12345, 54321)
  for (let cell = 0; cell < MARKER_CELLS; cell++) {
    const value = bytes[Math.floor(cell / 8)] & (1 << (7 - cell % 8)) ? 255 : 0
    const offset = (MARKER_SIZE / 2 * MARKER_WIDTH + cell * MARKER_SIZE + MARKER_SIZE / 2) * 4
    pixels.fill(value, offset, offset + 3)
  }
  assert.deepEqual(readMarkerPixels(pixels), { revision: 12345, frame: 54321 })
  const changed = (MARKER_SIZE / 2 * MARKER_WIDTH + 9 * MARKER_SIZE + MARKER_SIZE / 2) * 4
  for (let k = changed; k < changed + 3; k++) pixels[k] = 255 - pixels[k]
  assert.equal(readMarkerPixels(pixels), null)
})
