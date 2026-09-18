import assert from "node:assert/strict"
import test from "node:test"
import {
  ALL_EVENT_FEATURES,
  EVENT_ROLE_FEATURES,
  featuresForEventRole,
  normalizeEventFeatures,
} from "../lib/eventPermissions.ts"

test("event access rejects unknown feature names and removes duplicates", () => {
  assert.deepEqual(
    normalizeEventFeatures(["people", "unknown", "people", "producer_room"]),
    ["people", "producer_room"]
  )
})

test("a null custom grant uses the role preset for older memberships", () => {
  assert.deepEqual(featuresForEventRole("producer", null), EVENT_ROLE_FEATURES.producer)
  assert.notStrictEqual(featuresForEventRole("producer", null), EVENT_ROLE_FEATURES.producer)
})

test("event administrators receive every event feature by default", () => {
  assert.deepEqual(EVENT_ROLE_FEATURES.event_admin, ALL_EVENT_FEATURES)
})

