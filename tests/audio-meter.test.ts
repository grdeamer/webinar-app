import assert from "node:assert/strict"
import test from "node:test"
import { meterDb, validAudioMeter } from "../lib/zoom-bridge/audio-meter.ts"
test("PCM meter maps full scale, half scale and silence to dBFS", () => {
  assert.equal(meterDb(1), 0)
  assert.ok(Math.abs(meterDb(0.5) + 6.0206) < 0.001)
  assert.equal(meterDb(0), -60)
  assert.equal(meterDb(NaN), -60)
  assert.equal(meterDb(0.00001), -60)
})
test("Meter telemetry rejects malformed and nonfinite amplitudes", () => {
  assert.ok(validAudioMeter({ peak: 0.8, rms: 0.2, muted: true, sentAt: 123 }))
  for (const peak of [-1, 1.1, Infinity, NaN, "0.5"]) assert.equal(validAudioMeter({ peak, rms: 0.2, muted: false, sentAt: 123 }), false)
  assert.equal(validAudioMeter({ peak: 0.5, rms: 0.2, muted: "true", sentAt: 123 }), false)
})
