import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const templateRoot = new URL("../public/templates/lets-live-agenda/", import.meta.url)
const script = readFileSync(new URL("app.js", templateRoot), "utf8")
const styles = readFileSync(new URL("styles.css", templateRoot), "utf8")

test("speaker panels can show names without placeholder biographies", () => {
  assert.match(script, /show_speaker_bio/)
  assert.match(script, /session\.showSpeakerBio !== false && speaker\.bio/)
  assert.doesNotMatch(script, /A full speaker biography will be available here soon/)
})

test("large speaker rosters use a responsive grid", () => {
  assert.match(script, /session\.speakers\.length > 4/)
  assert.match(styles, /\.speaker-list\.is-large\s*\{[^}]*grid-template-columns:/s)
  assert.match(styles, /\.speaker-panel\.is-roster\s*\{[^}]*max-height:\s*calc\(100vh - 48px\)/s)
  assert.doesNotMatch(styles, /\.speaker-panel\.is-roster\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s)
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.speaker-list\.is-large\s*\{[^}]*grid-template-columns:\s*1fr/s)
})

test("speaker rail stays beside the agenda on desktop and scrolls into view on narrow screens", () => {
  assert.match(script, /window\.matchMedia\("\(max-width: 940px\)"\)\.matches/)
  assert.match(script, /scrollIntoView\(\{ behavior: "smooth", block: isLargeRoster \? "start" : "nearest" \}\)/)
  assert.match(script, /speakerPanel\.focus\(\{ preventScroll: true \}\)/)
})

test("phone layouts give agenda cards and speaker details the full width", () => {
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.agenda-item\s*\{[^}]*display:\s*block/s)
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.agenda-track\s*\{[^}]*display:\s*none/s)
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.speaker-session-meta\s*\{[^}]*grid-template-columns:\s*1fr/s)
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.status-panel-top\s*\{[^}]*flex-wrap:\s*wrap/s)
})
