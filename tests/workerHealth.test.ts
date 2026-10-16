import assert from "node:assert/strict"
import { test } from "node:test"
import { workerObservation } from "../lib/zoom-bridge/worker-health.ts"

test("a stalled worker cannot retain connected picture or audio indicators", () => {
  const observed = workerObservation({ status: "failed", error: "Worker stalled. No status update for over 15 seconds.", camera: true, microphone: true, sourceVideo: true, sourceAudio: true })
  assert.equal(observed.status, "stalled")
  assert.equal(observed.camera, false)
  assert.equal(observed.microphone, false)
  assert.equal(observed.sourceVideo, false)
  assert.equal(observed.sourceAudio, false)
})

test("healthy and distinct failure reports retain their actual state", () => {
  const healthy = { status: "joined", camera: true, microphone: true }
  assert.equal(workerObservation(healthy), healthy)
  const rejected = { status: "failed", error: "Satellite exited process code 4" }
  assert.equal(workerObservation(rejected), rejected)
})
