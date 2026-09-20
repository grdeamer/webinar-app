import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const templateRoot = new URL("../public/templates/lets-live-agenda/", import.meta.url)

test("district visibility follows the fast runtime flag", async () => {
  const script = await readFile(new URL("app.js", templateRoot), "utf8")

  assert.match(
    script,
    /state\.district_directory_enabled === false \|\| !districtDirectoryAvailable/,
  )
  assert.match(script, /syncDistrictDirectoryVisibility\(\);/)
})

test("display sync bypasses an older district CDN object", async () => {
  const script = await readFile(new URL("app.js", templateRoot), "utf8")

  assert.match(script, /requestUrl\.searchParams\.set\("sync", normalizedSyncToken\)/)
  assert.match(script, /fetchDistrictDirectory\(nextState\.sync_token\)/)
})

test("district destinations use accessible platform marks and a motion-safe room gloss", async () => {
  const [script, styles] = await Promise.all([
    readFile(new URL("app.js", templateRoot), "utf8"),
    readFile(new URL("styles.css", templateRoot), "utf8"),
  ])

  assert.match(script, /createMeetingProviderBrand\(provider\)/)
  assert.match(script, /brand\.setAttribute\("aria-label", provider\.label\)/)
  assert.match(script, /link\.className = "district-room-link"/)
  assert.match(styles, /@keyframes district-room-gloss/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})
