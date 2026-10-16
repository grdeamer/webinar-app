import test from "node:test"
import assert from "node:assert/strict"
import { newSatelliteNames } from "../lib/zoom-bridge/new-satellites.ts"

test("adding one after two existing satellites creates exactly one new profile", () => {
  const existing = ["Satellite 01", "Satellite 02"]
  assert.deepEqual(newSatelliteNames(existing, 1), ["Jupiter Satellite 03"])
  assert.deepEqual(newSatelliteNames(existing, 3), ["Jupiter Satellite 03", "Jupiter Satellite 04", "Jupiter Satellite 05"])
})

test("pending profiles reserve names and capacity", () => {
  const existing = Array.from({ length: 49 }, (_, i) => `Jupiter Satellite ${i + 1}`)
  assert.deepEqual(newSatelliteNames(existing, 3), ["Jupiter Satellite 50"])
  assert.deepEqual(newSatelliteNames([...existing, "Jupiter Satellite 50"], 1), [])
})
