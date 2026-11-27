import assert from "node:assert/strict"
import test from "node:test"
import { monitorMeetingNumber, monitorPageCount, monitorPageSize, planMonitorRoomImport, readMonitorRooms } from "../lib/zoom-bridge/monitor-rooms.ts"

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

test("bulk import handles pasted Zoom links and IDs and skips both kinds of duplicate", () => {
  const paste = [
    " https://us02web.zoom.us/j/12345678901?pwd=example ",
    "123 4567 8901",
    "",
    "123-4567-8902",
    "https://zoom.us/j/12345678903",
  ].join("\r\n")
  assert.deepEqual(planMonitorRoomImport(paste, ["12345678903"]), {
    meetingNumbers: ["12345678901", "12345678902"],
    duplicates: 2,
  })
})

test("bulk import reports the line number for an invalid link and rejects an empty batch", () => {
  assert.throws(() => planMonitorRoomImport("12345678901\n\nhttps://example.org/j/12345678902", []), /Line 3:/)
  assert.throws(() => planMonitorRoomImport("\r\n ", []), /Paste at least one/)
  assert.throws(() => planMonitorRoomImport("12345678901", ["12345678901"]), /already in the room list/)
})

test("bulk import fits exactly 48 rooms and rejects a batch exceeding the remaining slots", () => {
  const saved = Array.from({ length: 47 }, (_, index) => String(100000000 + index))
  assert.throws(() => planMonitorRoomImport("12345678901\n12345678902", saved), /Only 1 of the 48 room slots/)
  assert.deepEqual(planMonitorRoomImport("12345678901", saved).meetingNumbers, ["12345678901"])
})
