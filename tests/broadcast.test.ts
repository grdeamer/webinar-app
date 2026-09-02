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
  findBroadcastOutputProfileId,
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

test("broadcast output profiles cover every active resolution, frame rate, and aspect", () => {
  const aspects = ["16:9", "9:16", "1:1", "4:3"] as const

  for (const aspectRatio of aspects) {
    assert.equal(
      getBroadcastOutputProfile(findBroadcastOutputProfileId({ resolutionTier: "480p", frameRate: 60, aspectRatio })).frameRate,
      30,
    )

    for (const resolutionTier of ["720p", "1080p"] as const) {
      for (const frameRate of [30, 60] as const) {
        const profile = getBroadcastOutputProfile(
          findBroadcastOutputProfileId({ resolutionTier, frameRate, aspectRatio }),
        )
        assert.equal(profile.resolutionTier, resolutionTier)
        assert.equal(profile.frameRate, frameRate)
        assert.equal(profile.aspectRatio, aspectRatio)
      }
    }
  }
})

test("broadcast output dimensions match each operational aspect", () => {
  assert.deepEqual(
    [getBroadcastOutputProfile("low-480p30-16x9").width, getBroadcastOutputProfile("low-480p30-16x9").height],
    [854, 480],
  )
  assert.deepEqual(
    [getBroadcastOutputProfile("high-1080p30-9x16").width, getBroadcastOutputProfile("high-1080p30-9x16").height],
    [1080, 1920],
  )
  assert.deepEqual(
    [getBroadcastOutputProfile("high-1080p30-1x1").width, getBroadcastOutputProfile("high-1080p30-1x1").height],
    [1080, 1080],
  )
  assert.deepEqual(
    [getBroadcastOutputProfile("high-1080p30-4x3").width, getBroadcastOutputProfile("high-1080p30-4x3").height],
    [1440, 1080],
  )
  assert.equal(normalizeBroadcastOutputProfileId("future-4k30"), "universal-720p30")
})
