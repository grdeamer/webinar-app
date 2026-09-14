import assert from "node:assert/strict"
import test from "node:test"
import {
  CUSTOM_CODE_SECTION_ID,
  getCustomCodeDocument,
  setCustomCodeDocument,
} from "../lib/page-editor/customCode.ts"

test("imported template runtime metadata survives visual HTML edits", () => {
  const imported = setCustomCodeDocument([], {
    enabled: true,
    html: "<main>Original</main>",
    css: "main { color: red; }",
    script: "window.runtimeReady = true",
    headHtml: '<link rel="icon" href="https://assets.example/favicon.png">',
    importedTemplateName: "LETS Site",
    importedAssetPaths: ["page-editor/event/template-imports/asset.png"],
  })

  const edited = setCustomCodeDocument(imported, {
    enabled: true,
    html: "<main>Edited</main>",
    css: "main { color: blue; }",
  })
  const document = getCustomCodeDocument(edited)

  assert.equal(edited[0].id, CUSTOM_CODE_SECTION_ID)
  assert.equal(document.html, "<main>Edited</main>")
  assert.equal(document.script, "window.runtimeReady = true")
  assert.equal(document.importedTemplateName, "LETS Site")
  assert.deepEqual(document.importedAssetPaths, ["page-editor/event/template-imports/asset.png"])
  assert.match(document.headHtml, /favicon/)
})
