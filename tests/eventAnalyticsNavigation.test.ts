import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const layoutUrl = new URL("../app/admin/events/[id]/layout.tsx", import.meta.url)

test("event navigation exposes permission-aware analytics on desktop and mobile", async () => {
  const layout = await readFile(layoutUrl, "utf8")
  const analyticsLinks = layout.match(/href=\{`\$\{base\}\/analytics`\}/g) || []
  const analyticsPermissions = layout.match(/disabled=\{!hasFeature\("analytics"\)\}/g) || []

  assert.equal(analyticsLinks.length, 2)
  assert.equal(analyticsPermissions.length, 2)
})
