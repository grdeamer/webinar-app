import assert from "node:assert/strict"
import test from "node:test"
import { nextRoomAudioStart } from "../lib/zoom-bridge/room-audio-timing.ts"

test("late chunks continue the queued timeline without adding audio gaps", () => {
  let scheduledUntil = 0
  const packetArrival = [5, 6.9, 7.92, 7.98, 9.7]
  const starts = packetArrival.map(currentTime => {
    const start = nextRoomAudioStart(scheduledUntil, currentTime)
    scheduledUntil = start + 1
    return start
  })
  assert.deepEqual(starts, [6.25, 7.25, 8.25, 9.25, 10.25])
})

test("an empty audio queue buffers before restarting", () => {
  assert.equal(nextRoomAudioStart(4, 4.1), 5.35)
})
