import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { applyHoldScreenToHtml, DEFAULT_HOLD_SCREEN, getHoldScreen, HOLD_SCREEN_SECTION_ID, normalizeHoldScreen, safeHoldLogo, setHoldScreen } from "../lib/page-editor/holdScreen.ts"
import { getRenderableSections } from "../lib/page-editor/customCode.ts"
import { normalizeEventPageSections } from "../lib/page-editor/normalizeEventPageSections.ts"
import type { EventPageSection } from "../lib/page-editor/sectionTypes.ts"

const template = readFileSync(new URL("../public/templates/lets-live-agenda/index.html", import.meta.url), "utf8")

test("hold edits persist through serialization and normalization without changing open-event content", () => {
  const sections: EventPageSection[] = [{ id: "agenda", type: "system", config: { title: "Agenda" }, blocks: [] }]
  const first = setHoldScreen(sections, { ...DEFAULT_HOLD_SCREEN, heading: "See you soon" })
  const updated = setHoldScreen(first, { ...getHoldScreen(first), message: "A new message" })
  const saved = normalizeEventPageSections(JSON.parse(JSON.stringify(updated)))
  assert.equal(saved.filter((item) => item.id === HOLD_SCREEN_SECTION_ID).length, 1)
  assert.equal(getHoldScreen(saved).heading, "See you soon")
  assert.equal(getHoldScreen(saved).message, "A new message")
  assert.deepEqual(getRenderableSections(saved), sections)
  assert.deepEqual(sections, [{ id: "agenda", type: "system", config: { title: "Agenda" }, blocks: [] }])
})

test("publishing updates the gate while preserving runtime, agenda and opening mechanism", () => {
  const html = applyHoldScreenToHtml(template, { ...DEFAULT_HOLD_SCREEN, heading: "Welcome back", message: "Line 1\nLine 2", accentColor: "#123456" }, "Event name")
  assert.match(html, /Welcome back/)
  assert.match(html, /Line 1\nLine 2/)
  assert.match(html, /--hold-accent:#123456/)
  assert.match(html, /src="jnj-logo.png"/)
  assert.match(html, /id="eventGateTitle">Event name/)
  assert.match(html, /event-gate.jupiter-hold\[hidden\]/)
  assert.equal(html.slice(html.indexOf('<section class="survey-page"')), template.slice(template.indexOf('<section class="survey-page"')))
  assert.match(html, /app.js\?v=/)
})

test("custom title survives runtime updates and markup is escaped including replacement tokens", () => {
  const html = applyHoldScreenToHtml(template, { ...DEFAULT_HOLD_SCREEN, title: "Custom label", heading: '<img onerror="alert(1)">$&', logoUrl: "https://example.com/logo.png", logoAlt: '" onerror="bad' }, "Other title")
  assert.doesNotMatch(html, /id="eventGateTitle"/)
  assert.match(html, /Custom label/)
  assert.match(html, /&lt;img onerror=&quot;alert\(1\)&quot;&gt;\$&amp;/)
  assert.match(html, /alt="&quot; onerror=&quot;bad"/)
})

test("empty logo and status stay hidden; unsafe CSS and image URLs are rejected", () => {
  const html = applyHoldScreenToHtml(template, { ...DEFAULT_HOLD_SCREEN, logoUrl: "", status: "" }, "Event")
  const gate = html.slice(html.indexOf('<section class="event-gate'), html.indexOf('<section class="survey-page'))
  assert.doesNotMatch(gate, /<img|hold-status/)
  assert.equal(normalizeHoldScreen({ accentColor: "red;}</style><script>bad</script>" }).accentColor, DEFAULT_HOLD_SCREEN.accentColor)
  assert.equal(safeHoldLogo("javascript:alert(1)"), "")
  assert.throws(() => applyHoldScreenToHtml(template, { ...DEFAULT_HOLD_SCREEN, logoUrl: "javascript:alert(1)" }, "Event"), /valid HTTPS/)
  assert.throws(() => applyHoldScreenToHtml(template, { ...DEFAULT_HOLD_SCREEN, logoUrl: "/private-logo.png" }, "Event"), /full HTTPS/)
})

test("unsupported imported templates fail clearly instead of silently ignoring hold edits", () => {
  assert.throws(() => applyHoldScreenToHtml("<html><head></head><body>No gate</body></html>", DEFAULT_HOLD_SCREEN, "Event"), /no eventGate/)
  assert.deepEqual(getHoldScreen([]), DEFAULT_HOLD_SCREEN)
})
