import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"

const templateRoot = new URL("../public/templates/lets-live-agenda/", import.meta.url)
const script = readFileSync(new URL("app.js", templateRoot), "utf8")
const markup = readFileSync(new URL("index.html", templateRoot), "utf8")

function functionSource(name: string) {
  const start = script.indexOf(`  function ${name}(`)
  assert.ok(start >= 0, `${name} exists in the attendee template`)
  const followingFunction = /\n  (?:async )?function /.exec(script.slice(start + 1))
  assert.ok(followingFunction, `${name} has a following function boundary`)
  return script.slice(start, start + 1 + followingFunction.index)
}

function sessionDate(value: string | null | undefined, timeZone = "America/New_York", eventDate?: string) {
  return runInNewContext(
    `${functionSource("eventMoment")}\n${functionSource("formatSessionDate")}\nformatSessionDate(value)`,
    {
      value,
      state: { event_date: eventDate },
      config: { EVENT_DATE: "2026-09-25", EVENT_UTC_OFFSET_HOURS: 4 },
      activeTimeZone: () => timeZone,
    },
  ) as string
}

test("the workshop page omits the main meeting CTA and includes the session date", () => {
  assert.doesNotMatch(markup, /id=["'](?:enterButton|enterButtonText)["']/)
  assert.doesNotMatch(markup, /class=["'][^"']*\bhero-actions\b[^"']*["']/)
  assert.doesNotMatch(markup, /Enter live meeting/)
  assert.match(markup, /id=["']liveSessionDate["']/)
})

test("district room links and URL copying remain available for workshop access", () => {
  assert.match(script, /link\.className\s*=\s*"district-room-link"/)
  assert.match(script, /copyButton\.className\s*=\s*"district-room-copy"/)
  assert.match(script, /await copyRoomUrl\(url\)/)
})

test("workshop dates include weekday, month, day, and year from an ISO start", () => {
  assert.equal(sessionDate("2026-09-25T13:00:00.000Z"), "Friday, September 25, 2026")
})

test("agenda heading shows the full date without a hard-coded day number or separator", () => {
  assert.doesNotMatch(markup, /Day One/)
  assert.doesNotMatch(script, /Day One/)
  const label = { textContent: "" }
  runInNewContext(`${functionSource("updateEventDayDate")}\nupdateEventDayDate()`, {
    els: { eventDayDate: label },
    state: { event_date: "2026-09-25" },
    config: {},
    activeTimeZone: () => "America/New_York",
  })
  assert.equal(label.textContent, "Friday, September 25, 2026")
})

test("time-only session starts use the configured event date fallback", () => {
  assert.equal(sessionDate("09:00"), "Friday, September 25, 2026")
  assert.equal(sessionDate("09:00", "America/New_York", "2026-09-24"), "Thursday, September 24, 2026")
})

test("missing or invalid session dates render an empty date label", () => {
  for (const value of [undefined, null, "", "not-a-date"]) {
    assert.equal(sessionDate(value), "")
  }
})

test("session dates respect the selected timezone across a date boundary", () => {
  const start = "2026-09-25T02:00:00.000Z"
  assert.equal(sessionDate(start, "UTC"), "Friday, September 25, 2026")
  assert.equal(sessionDate(start, "America/Los_Angeles"), "Thursday, September 24, 2026")
})
