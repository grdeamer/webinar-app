import assert from "node:assert/strict"
import test from "node:test"
import { monitorRoomCsvTemplate, planMonitorRoomCsv } from "../lib/zoom-bridge/monitor-room-csv.ts"

test("the template contains only headers and CSV import handles quoted spreadsheet data", () => {
  assert.equal(monitorRoomCsvTemplate, "room_name,zoom_join_link,meeting_id,zoom_passcode\r\n")
  const lines = [
    '\uFEFF" ROOM_NAME ", "ZOOM_JOIN_LINK", " MEETING_ID"',
    '"Launch, \"\"Main\"\"",https://us02web.zoom.us/j/12345678901?pwd=private,123 4567 8901',
    '"Q&A\r\nEast",,123-4567-8902',
    ",,12345678903",
    "",
  ]
  assert.deepEqual(planMonitorRoomCsv(lines.join("\r\n"), []), {
    rooms: [
      {
        name: 'Launch, "Main"',
        meetingNumber: "12345678901",
        access: { joinLink: "https://us02web.zoom.us/j/12345678901?pwd=private" },
      },
      { name: "Q&A\r\nEast", meetingNumber: "12345678902" },
      { name: "", meetingNumber: "12345678903" },
    ],
    duplicates: 0,
  })
})

test("CSV import accepts reordered columns and deduplicates by the normalized meeting ID", () => {
  const csv = [
    "meeting_id,room_name",
    "12345678903,Existing",
    "12345678901,First",
    "123 4567 8901,Again",
    "12345678902,Second",
  ].join("\n")
  assert.deepEqual(planMonitorRoomCsv(csv, ["12345678903"]), {
    rooms: [
      { name: "First", meetingNumber: "12345678901" },
      { name: "Second", meetingNumber: "12345678902" },
    ],
    duplicates: 2,
  })
  assert.throws(() => planMonitorRoomCsv("meeting_id\n12345678901", ["12345678901"]), /already in the room list/)
})

test("CSV import reports conflicts and malformed values without echoing private input", () => {
  assert.throws(() => planMonitorRoomCsv(
    monitorRoomCsvTemplate + "A,https://zoom.us/j/12345678901,12345678902,\n", [],
  ), /same meeting near line 2/)
  assert.throws(() => planMonitorRoomCsv(
    monitorRoomCsvTemplate + "A,,12345678901,\nB,https://example.org/j/12345678902?pwd=private,,\n", [],
  ), { message: "Enter a Zoom join link in zoom_join_link near line 3." })
  assert.throws(() => planMonitorRoomCsv(
    monitorRoomCsvTemplate + "Room with, comma,,12345678901,\n", [],
  ), /same number of columns as the header on line 2/)
  assert.throws(() => planMonitorRoomCsv(
    monitorRoomCsvTemplate + '"Unclosed,https://zoom.us/j/12345678901?pwd=private,\n', [],
  ), /Check CSV formatting near line/)
  assert.throws(() => planMonitorRoomCsv(monitorRoomCsvTemplate + "A,,,private\n", []), {
    message: "Enter a Zoom join link or meeting ID near line 2.",
  })
  assert.throws(() => planMonitorRoomCsv("name,email\nA,b@example.org", []), /template headers/)
  assert.throws(() => planMonitorRoomCsv("meeting_id,meeting_id\n12345678901,12345678901", []), /template headers/)
  assert.throws(() => planMonitorRoomCsv(monitorRoomCsvTemplate, []), /Add at least one room/)
  assert.throws(() => planMonitorRoomCsv(`room_name,meeting_id\n${"x".repeat(101)},12345678901`, []), /100 characters/)
})

test("CSV import preserves optional passcodes and validated password links only for new rooms", () => {
  const csv = monitorRoomCsvTemplate + [
    'Main,https://zoom.us/j/12345678901?pwd=demo%2Bcode&other=ignored,,"0,demo"',
    'Plain,https://zoom.us/j/12345678902?pwd=&other=ignored,,',
    'ID only,,12345678903,000000',
    'Existing,,12345678904,ignored',
    'Duplicate,,12345678901,ignored',
  ].join("\r\n")
  assert.deepEqual(planMonitorRoomCsv(csv, ["12345678904"]), {
    rooms: [
      {
        name: "Main",
        meetingNumber: "12345678901",
        access: { passcode: "0,demo", joinLink: "https://zoom.us/j/12345678901?pwd=demo%2Bcode" },
      },
      { name: "Plain", meetingNumber: "12345678902" },
      { name: "ID only", meetingNumber: "12345678903", access: { passcode: "000000" } },
    ],
    duplicates: 2,
  })
})

test("CSV import enforces the remaining room capacity after deduplication", () => {
  const saved = Array.from({ length: 47 }, (_, index) => String(100000000 + index))
  assert.deepEqual(planMonitorRoomCsv("meeting_id\n100000000\n12345678901", saved), {
    rooms: [{ name: "", meetingNumber: "12345678901" }],
    duplicates: 1,
  })
  assert.throws(() => planMonitorRoomCsv("meeting_id\n12345678901\n12345678902", saved), /Only 1 of the 48 room slots/)
})
