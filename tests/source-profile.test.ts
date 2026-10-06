import assert from "node:assert/strict"
import test from "node:test"
import { defaultSourceProfile, parseSourceProfile } from "../lib/zoom-bridge/source-profile.ts"
test("Source equipment names preserve custom labels and reject unsafe or oversized fields", () => {
  assert.equal(parseSourceProfile({ ...defaultSourceProfile, captureName: "  Ballroom Magewell  " }).captureName, "Ballroom Magewell")
  for (const captureName of ["", "x".repeat(65), "bad\nname"]) assert.throws(() => parseSourceProfile({ ...defaultSourceProfile, captureName }))
  for (const relayResolution of ["4k", undefined]) assert.throws(() => parseSourceProfile({ ...defaultSourceProfile, relayResolution }))
  for (const encoderBitrate of [0, 20001, 6000.5]) assert.throws(() => parseSourceProfile({ ...defaultSourceProfile, encoderBitrate }))
  assert.throws(() => parseSourceProfile({ ...defaultSourceProfile, notes: "x".repeat(501) }))
})
