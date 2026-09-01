import assert from "node:assert/strict"
import test from "node:test"

import {
  buildBroadcastOutputUrl,
  isBroadcastProvider,
  maskBroadcastServerUrl,
  normalizeBroadcastServerUrl,
  sanitizeBroadcastError,
} from "../lib/broadcast/config.ts"
import {
  broadcastOutputProfileLabel,
  getBroadcastOutputProfile,
  normalizeBroadcastOutputProfileId,
} from "../lib/broadcast/outputProfiles.ts"

test("broadcast providers accept only the supported Phase 1 set", () => {
  assert.equal(isBroadcastProvider("youtube"), true)
  assert.equal(isBroadcastProvider("linkedin"), true)
  assert.equal(isBroadcastProvider("twitch"), false)
  assert.equal(isBroadcastProvider(null), false)
})

test("broadcast servers require RTMP or RTMPS and normalize trailing slashes", () => {
  assert.equal(
    normalizeBroadcastServerUrl("  rtmps://a.rtmps.youtube.com/live2///  "),
    "rtmps://a.rtmps.youtube.com/live2",
  )
  assert.throws(() => normalizeBroadcastServerUrl("https://example.com/live"), /rtmp:\/\/ or rtmps:\/\//)
  assert.throws(() => normalizeBroadcastServerUrl("javascript:alert(1)"), /rtmp:\/\/ or rtmps:\/\//)
})

test("broadcast output URL joins the server and key without duplicate separators", () => {
  assert.equal(
    buildBroadcastOutputUrl("rtmps://example.com/live/", "/abcd-1234"),
    "rtmps://example.com/live/abcd-1234",
  )
  assert.throws(() => buildBroadcastOutputUrl("rtmps://example.com/live", "  "), /stream key is required/i)
})

test("broadcast server masking never includes credentials", () => {
  assert.equal(
    maskBroadcastServerUrl("rtmps://example.com/live"),
    "rtmps://example.com/live",
  )
  assert.equal(
    maskBroadcastServerUrl("not a url"),
    "RTMP destination",
  )
})

test("broadcast errors redact complete RTMP destinations and explicit secrets", () => {
  const outputUrl = "rtmps://example.com/live/super-secret-key"
  const sanitized = sanitizeBroadcastError(
    new Error(`LiveKit rejected ${outputUrl} while connecting`),
    [outputUrl],
  )
  assert.equal(sanitized, "LiveKit rejected [redacted RTMP destination] while connecting")
  assert.doesNotMatch(sanitized, /super-secret-key/)
})

test("broadcast output profiles normalize unknown values to the safe 720p default", () => {
  assert.equal(normalizeBroadcastOutputProfileId("high-1080p30"), "high-1080p30")
  assert.equal(normalizeBroadcastOutputProfileId("4k-unsupported"), "universal-720p30")
  assert.equal(normalizeBroadcastOutputProfileId(null), "universal-720p30")
})

test("broadcast output profiles expose the actual encoded canvas", () => {
  const profile = getBroadcastOutputProfile("high-1080p30")

  assert.equal(profile.width, 1920)
  assert.equal(profile.height, 1080)
  assert.equal(profile.aspectRatio, "16:9")
  assert.equal(broadcastOutputProfileLabel(profile), "1920×1080 · 16:9 · 30 fps")
})
