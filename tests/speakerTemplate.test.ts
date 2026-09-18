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
  assert.match(styles, /@media \(max-width: 680px\)[\s\S]*?\.speaker-list\.is-large\s*\{[^}]*grid-template-columns:\s*1fr/s)
})
