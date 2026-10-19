import test from "node:test"
import assert from "node:assert/strict"
import { broadcastDuration, scheduledStop, shutdownTime } from "../lib/zoom-bridge/runtime-options.ts"
test("broadcast sessions have a bounded duration and an unambiguous UTC stop", () => {
  for (const duration of [60,120,240,480]) assert.equal(broadcastDuration(duration), duration)
  for (const invalid of [0,-1,Infinity,NaN,481,"120",null,undefined]) assert.throws(() => broadcastDuration(invalid))
  assert.equal(shutdownTime(120, Date.parse("2026-10-19T23:30:00Z")), "2026-10-20T01:30:00")
  assert.equal(scheduledStop("at(2026-10-20T01:30:00)"), "2026-10-20T01:30:00Z")
  for (const invalid of ["rate(1 hour)","cron(*)","at(untrusted)",undefined]) assert.equal(scheduledStop(invalid), null)
})
