import assert from "node:assert/strict"
import test from "node:test"
import { monitorMeetingNumber, monitorPageCount, monitorPageSize, readMonitorRooms } from "../lib/zoom-bridge/monitor-rooms.ts"

test("room lists hold three pages of sixteen unique Zoom IDs", () => {
  const rooms = Array.from({ length: 50 }, (_, index) => ({
    id: `room-${index}`, name: `Room ${index + 1}`, meetingNumber: String(100000000 + index),
  }))
  const saved = readMonitorRooms(JSON.stringify([rooms[0], rooms[0], ...rooms.slice(1)]))
  assert.equal(saved.length, monitorPageCount * monitorPageSize)
  assert.equal(saved[32].name, "Room 33")
  assert.equal(saved[47].name, "Room 48")
})

test("only the meeting ID is kept from a Zoom join link", () => {
  assert.equal(monitorMeetingNumber("https://zoom.us/j/1234567890?pwd=example"), "1234567890")
  assert.throws(() => monitorMeetingNumber("https://example.org/j/1234567890"))
})
