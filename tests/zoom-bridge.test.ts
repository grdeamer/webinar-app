import assert from "node:assert/strict"
import test from "node:test"
import { normalizeMeetingId, actionPatch, parsePublishMode, outputLabel } from "../lib/zoom-bridge/types.ts"
test("Zoom meeting IDs accept formatting but reject URLs and command-like strings", () => {
  assert.equal(normalizeMeetingId("854 4556 1092"), "85445561092")
  assert.equal(normalizeMeetingId("854-4556-1092"), "85445561092")
  for (const invalid of ["", "123", "123456789012", "https://zoom.us/j/85445561092", "85445561092; touch x"]) assert.throws(() => normalizeMeetingId(invalid))
})
test("Satellite output mode accepts only supported publishers", () => {
  assert.equal(parsePublishMode("share"), "share")
  assert.equal(parsePublishMode("camera"), "camera")
  for (const invalid of [undefined, "screen", "share;cmd", {}]) assert.throws(() => parsePublishMode(invalid))
  assert.equal(outputLabel("share"), "Screen share")
  assert.equal(outputLabel("camera"), "Camera")
})
test("Camera and microphone commands never change the other media channel or start a worker", () => {
  assert.deepEqual(actionPatch("camera_on"), { desired_camera: true })
  assert.deepEqual(actionPatch("microphone_off"), { desired_microphone: false })
  assert.deepEqual(actionPatch("stop"), { desired_running: false })
  assert.throws(() => actionPatch("shell" as never))
})
test("A Zoom source cannot be routed back into the same meeting", async () => {
  const { assertSourceIsSeparate } = await import("../lib/zoom-bridge/types.ts")
  assert.doesNotThrow(() => assertSourceIsSeparate("84528164431", ["89168845873"]))
  assert.throws(() => assertSourceIsSeparate("84528164431", ["89168845873", "84528164431"]), /cannot also/)
})
