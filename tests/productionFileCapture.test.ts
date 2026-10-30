import { test } from 'node:test'
import assert from 'node:assert/strict'
// @ts-expect-error Exercise the browser module directly.
import { captureFileStream } from '../tools/production-local/file-capture.js'
test('native file capture preserves selected media tracks and excludes audio when not requested', () => {
  let stopped = 0, removed = 0
  const video = {}, audio = { stop: () => stopped++ }, stream = { getVideoTracks: () => [video], getAudioTracks: () => [audio], getTracks: () => [video, audio], removeTrack: (t: unknown) => { assert.equal(t, audio); removed++ } }
  const element = { captureStream() { assert.equal(this, element); return stream } }
  assert.equal(captureFileStream(element, true), stream); assert.equal(stopped, 0)
  assert.equal(captureFileStream(element, false), stream); assert.equal(stopped, 1); assert.equal(removed, 1)
})
test('unsupported or audio-only capture fails closed rather than reverting to throttled canvas painting', () => {
  assert.throws(() => captureFileStream({}, false), /timer-based file capture is disabled/)
  let stopped = false
  assert.throws(() => captureFileStream({ captureStream: () => ({ getVideoTracks: (): unknown[] => [], getTracks: () => [{ stop: () => { stopped = true } }] }) }, true), /no capturable video/)
  assert.equal(stopped, true)
})
