import { test } from "node:test"
import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { verifiedRtmsEvent, rtmsChallenge } from "../lib/zoom-bridge/rtms-webhook.ts"

test("RTMS webhooks require exact signed body and a fresh timestamp", () => {
  const raw = JSON.stringify({ event: "meeting.rtms_started" }), timestamp = "1800000000", secret = "test-only-secret"
  const signature = `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${raw}`).digest("hex")}`
  assert.equal(verifiedRtmsEvent(raw, timestamp, signature, secret, 1800000000000).event, "meeting.rtms_started")
  assert.throws(() => verifiedRtmsEvent(raw + " ", timestamp, signature, secret, 1800000000000))
  assert.throws(() => verifiedRtmsEvent(raw, timestamp, signature, secret, 1800000400000))
  assert.throws(() => verifiedRtmsEvent(raw, timestamp, "v0=wrong", secret, 1800000000000))
  assert.throws(() => verifiedRtmsEvent(raw, timestamp, signature, "", 1800000000000))
})
test("RTMS endpoint challenge uses the webhook secret", () => {
  assert.deepEqual(rtmsChallenge("challenge", "secret"), { plainToken: "challenge", encryptedToken: createHmac("sha256", "secret").update("challenge").digest("hex") })
})
