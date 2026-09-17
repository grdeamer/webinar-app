import assert from "node:assert/strict"
import test from "node:test"
import {
  componentIsVisible,
  DEFAULT_ATTENDEE_COMPONENT_STATE,
  normalizeAttendeeComponentState,
} from "../lib/attendeeComponents.ts"

test("attendee components default to visible and the next-session countdown", () => {
  assert.deepEqual(normalizeAttendeeComponentState(null), DEFAULT_ATTENDEE_COMPONENT_STATE)
})

test("attendee component state preserves supported live overrides", () => {
  const state = normalizeAttendeeComponentState({
    countdown: false,
    next_up: false,
    agenda: true,
    countdown_mode: "current_session_end",
  })

  assert.equal(state.countdown, false)
  assert.equal(state.next_up, false)
  assert.equal(state.agenda, true)
  assert.equal(state.countdown_mode, "current_session_end")
  assert.equal(componentIsVisible(state, "countdown"), false)
  assert.equal(componentIsVisible(state, "next_up"), false)
  assert.equal(componentIsVisible(state, "agenda"), true)
  assert.equal(componentIsVisible(state, "stage_player"), true)
})

test("unknown countdown modes fall back safely", () => {
  assert.equal(
    normalizeAttendeeComponentState({ countdown_mode: "tomorrow" }).countdown_mode,
    "next_session",
  )
})
