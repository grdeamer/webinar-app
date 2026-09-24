import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"

const script = readFileSync(new URL("../public/templates/lets-live-agenda/app.js", import.meta.url), "utf8")
const styles = readFileSync(new URL("../public/templates/lets-live-agenda/styles.css", import.meta.url), "utf8")
const markup = readFileSync(new URL("../public/templates/lets-live-agenda/index.html", import.meta.url), "utf8")
const now = "2026-09-24T18:40:00.000Z"

function section(start: string, end: string) {
  const from = script.indexOf(`  function ${start}`)
  const to = script.indexOf(end, from)
  assert.ok(from >= 0 && to > from, `${start} exists in the attendee template`)
  return script.slice(from, to)
}

const selectionCode = [
  section("firstValue(", "  function hostnameMatches("),
  section("sessionKey(", "  function normalizeResources("),
  section("findSession(", "  function animateUpdate("),
  section("eventMoment(", "  async function fetchState("),
].join("\n")
const applyStateCode = section("applyState(", "  function updateClock(")

type Session = {
  key: string
  name: string
  start: string | null
  end: string | null
  index: number
  status: string
  displayTime: string
}

function session(key: string, start: string | null, end: string | null, overrides: Partial<Session> = {}): Session {
  return { key, name: key, start, end, index: 0, status: "upcoming", displayTime: `${start}–${end}`, ...overrides }
}

const breakSession = session("Break", "14:30", "14:45", { status: "live", index: 4 })
const walkthrough = session("MDD IVA Walk-Thru", "14:45", "15:30", { index: 5 })
const closing = session("Close & Transition", "16:00", "16:15", { index: 7 })

function harness(sessions: Session[], overrides: Record<string, unknown> = {}) {
  class FixedDate extends Date {
    constructor(value?: string | number) { super(value === undefined ? now : value) }
    static now() { return new Date(now).getTime() }
  }
  const element = () => ({ hidden: false, textContent: "" })
  const els = {
    liveLabel: element(), liveSessionName: element(), liveSessionTime: element(),
    countdownCard: element(), countdownLabel: element(), countdownSession: element(), countdownValue: element(),
    agendaSection: element(),
  }
  const context = {
    Date: FixedDate,
    config: { EVENT_DATE: "2026-09-24", EVENT_UTC_OFFSET_HOURS: 4 },
    state: {
      event_date: "2026-09-24",
      current_session: null as { id: string } | null,
      next_session: null as { id: string } | null,
      attendee_component_state: {},
      ...overrides,
    },
    sessionMap: new Map(sessions.map(item => [item.key, item])),
    agendaItems: [] as unknown[],
    els,
    applyEventAccess() {},
    applySurvey() {},
    syncDistrictDirectoryVisibility() {},
    updateMeetingProvider() {},
    updateEventDayDate() {},
  }
  return {
    els,
    refresh() {
      runInNewContext(`${selectionCode}\n${applyStateCode}\napplyState({}); updateCountdown();`, context)
    },
  }
}

test("the LETS hero has no Next up element or static session placeholder", () => {
  assert.doesNotMatch(markup, /id=["'](?:nextUp|nextSessionName|nextSessionTime)["']/)
  assert.doesNotMatch(script, /document\.getElementById\(["'](?:nextUp|nextSessionName|nextSessionTime)["']\)/)
  assert.doesNotMatch(script, /els\.(?:nextUp|nextSessionName|nextSessionTime)\b/)
  const heroStart = markup.indexOf('<div class="hero-copy">')
  const heroEnd = markup.indexOf('<aside class="status-panel">', heroStart)
  assert.ok(heroStart >= 0 && heroEnd > heroStart)
  assert.doesNotMatch(markup.slice(heroStart, heroEnd), /Keynote Speaker|Next up/)
})

test("runtime and timer refreshes work without Next up nodes and preserve hidden controls", () => {
  const page = harness([breakSession, walkthrough, closing], {
    next_session: { id: closing.key },
    attendee_component_state: { next_up: false, countdown: false, agenda: false },
  })
  page.refresh()
  assert.equal(page.els.countdownCard.hidden, true)
  assert.equal(page.els.agendaSection.hidden, true)
})

test("the countdown still uses the secondary session after Next up is removed", () => {
  const page = harness([breakSession, walkthrough, closing], {
    next_session: { id: walkthrough.key },
    attendee_component_state: { next_up: true, countdown: true, agenda: true },
  })
  page.refresh()
  assert.equal(page.els.liveSessionName.textContent, breakSession.name)
  assert.equal(page.els.countdownSession.textContent, walkthrough.name)
  assert.equal(page.els.countdownValue.textContent, "00:05:00")
})

test("component display styles cannot override attendee visibility controls", () => {
  const rules = Array.from(styles.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g))
  for (const selector of [".countdown-card[hidden]", ".agenda-section[hidden]"]) {
    const hiddenRule = rules.find(([, selectors, declarations]) =>
      selectors.split(",").some(value => value.trim() === selector) &&
      /display\s*:\s*none\s*!important\s*;?/.test(declarations),
    )
    assert.ok(hiddenRule, `${selector} must explicitly enforce display: none !important`)
  }
})
