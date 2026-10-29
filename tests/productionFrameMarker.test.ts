import test from 'node:test'
import assert from 'node:assert/strict'
import { FrameMarkerReader, markerBytes, MARKER_WIDTH, MARKER_SIZE, MARKER_CELLS } from '../tools/production-local/runtime/marker.js'

function fixture(corrupt = false, row = 1) {
  const bytes = markerBytes(12345, 54321)
  const pixels = new Uint8ClampedArray(MARKER_WIDTH * MARKER_SIZE * 4)
  for (let cell = 0; cell < MARKER_CELLS; cell++) {
    const value = bytes[Math.floor(cell / 8)] & (1 << (7 - cell % 8)) ? 255 : 0
    const at = (MARKER_SIZE / 2 * MARKER_WIDTH + cell * MARKER_SIZE + MARKER_SIZE / 2) * 4
    pixels.fill(value, at, at + 3)
  }
  let canvasDraws = 0
  const context = { drawImage() { canvasDraws++ }, getImageData() { return { data: pixels } } } as unknown as CanvasRenderingContext2D
  const frame = {
    format: 'I420', rotation: 0, flip: false, visibleRect: { x: 0, y: 0, width: 1920, height: 1080 }, displayWidth: 1920, displayHeight: 1080,
    allocationSize(options: { rect: { x: number; y: number; width: number; height: number } }) {
      assert.deepEqual(options, { rect: { x: 0, y: row ? 1088 - row * 18 : 8, width: 1008, height: 2 } })
      return 4096
    },
    async copyTo(buffer: Uint8Array) {
      const offset = 8, stride = 1024
      for (let cell = 0; cell < MARKER_CELLS; cell++) {
        let light = Boolean(bytes[Math.floor(cell / 8)] & (1 << (7 - cell % 8)))
        if (corrupt && cell === 9) light = !light
        buffer[offset + stride + Math.floor((cell * 12 + 6) * 1.5)] = light ? 235 : 16
      }
      return [{ offset, stride }]
    },
  }
  return { frame, context, draws: () => canvasDraws }
}

test('native marker reads use the cropped luma plane with returned stride and retain checksum validation', async () => {
  const x = fixture(), reader = new FrameMarkerReader(x.context)
  assert.deepEqual(await reader.read(x.frame as unknown as VideoFrame), { revision: 12345, frame: 54321 })
  assert.equal(reader.nativeReads, 1); assert.equal(reader.canvasReads, 0); assert.equal(x.draws(), 0)
  const bad = fixture(true), checked = new FrameMarkerReader(bad.context)
  assert.equal(await checked.read(bad.frame as unknown as VideoFrame), null)
  assert.equal(bad.draws(), 0, 'a corrupt native marker must not be reinterpreted by fallback')
})

test('unsupported formats and failed native copies retain the original checked canvas path', async () => {
  for (const failCopy of [false, true]) {
    const x = fixture(), reader = new FrameMarkerReader(x.context)
    if (failCopy) x.frame.copyTo = async () => { throw new Error('native copy unavailable') }
    else x.frame.format = 'RGBA'
    assert.deepEqual(await reader.read(x.frame as unknown as VideoFrame), { revision: 12345, frame: 54321 })
    assert.equal(reader.canvasReads, 1); assert.equal(x.draws(), 1)
  }
})

test('authority and provenance rows use their own native crop and retain the checked marker payload', async () => {
  for (const row of [0, 2] as const) {
    const x = fixture(false, row), reader = new FrameMarkerReader(x.context)
    assert.deepEqual(await reader.read(x.frame as unknown as VideoFrame, row), { revision: 12345, frame: 54321 })
    assert.equal(reader.nativeReads, 1); assert.equal(reader.canvasReads, 0)
  }
})
