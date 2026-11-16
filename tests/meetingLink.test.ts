import { test } from "node:test"
import assert from "node:assert/strict"
import { meetingJoinLink } from "../lib/zoom-bridge/meeting-link.ts"

test("meeting links accept IDs and preserve only the Zoom join passcode", () => {
  assert.equal(meetingJoinLink("123 456 7890"), "https://zoom.us/j/1234567890")
  assert.equal(meetingJoinLink("https://us02web.zoom.us/j/1234567890?pwd=abc%2Bxyz&zak=secret#x"), "https://us02web.zoom.us/j/1234567890?pwd=abc%2Bxyz")
})
test("meeting links reject arbitrary navigation and host links", () => {
  for (const value of ["javascript:alert(1)", "https://zoom.us.evil.test/j/1234567890", "https://evilzoom.us/j/1234567890", "https://zoom.us/start/1234567890", "https://user:secret@zoom.us/j/1234567890", "http://zoom.us/j/1234567890", "123", "https://zoom.us:444/j/1234567890"]) {
    assert.throws(() => meetingJoinLink(value))
  }
})
