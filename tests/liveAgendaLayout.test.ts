import assert from "node:assert/strict"
import test from "node:test"
import { createLiveAgendaBlocks, materializeLiveAgendaSection, moveLiveAgendaBlock } from "../lib/page-editor/liveAgendaLayout.ts"
import { normalizeEventPageSections } from "../lib/page-editor/normalizeEventPageSections.ts"
import type { EventPageSection } from "../lib/page-editor/sectionTypes.ts"

const legacy: EventPageSection = { id: "lets", type: "system", config: { adminLabel: "Live event" }, blocks: [{ id: "page", type: "system_component", props: { componentKey: "lets_live_agenda", title: "Our meeting", body: "Welcome aboard", joinHref: "https://example.com/meeting" } }] }

test("legacy layout materializes into independently addressable existing block types without mutating input", () => {
  const layout = materializeLiveAgendaSection(legacy)
  assert.equal(layout.config.liveAgendaLayout, true)
  assert.equal(layout.blocks?.length, 15)
  assert.equal(new Set(layout.blocks?.map(block => block.id)).size, 15)
  assert.equal(layout.blocks?.find(block => block.id === "page:title")?.props.body, "Our meeting")
  assert.equal(layout.blocks?.find(block => block.id === "page:join")?.props.href, "https://example.com/meeting")
  assert.equal(legacy.blocks?.length, 1)
  assert.deepEqual(materializeLiveAgendaSection(layout), layout)
  assert.deepEqual(materializeLiveAgendaSection(legacy), layout)
})

test("layout roles, event binding, links and positions survive a save and reload", () => {
  const layout = materializeLiveAgendaSection(legacy)
  const reloaded = normalizeEventPageSections(JSON.parse(JSON.stringify([layout])))[0]
  assert.equal(reloaded.blocks?.find(block => block.id === "page:title")?.props.layoutRole, "title")
  assert.equal(reloaded.blocks?.find(block => block.id === "page:title")?.props.bindEventTitle, false)
  assert.equal(reloaded.blocks?.find(block => block.id === "page:footer")?.props.href, "https://letstrainonline.com")
  assert.equal(reloaded.config.liveAgendaLayout, true)
})

test("moving a block adopts the target area and deleting all blocks does not recreate defaults", () => {
  const layout = materializeLiveAgendaSection(legacy)
  const moved = moveLiveAgendaBlock(layout, "page:title", "page:clock")
  assert.equal(moved.blocks?.find(block => block.id === "page:title")?.props.layoutRegion, "sidebar")
  assert.equal(layout.blocks?.find(block => block.id === "page:title")?.props.layoutRegion, "welcome")
  assert.equal(moveLiveAgendaBlock(layout, "missing", "page:title"), layout)
  assert.deepEqual(materializeLiveAgendaSection({ ...layout, blocks: [] }).blocks, [])
  assert.equal(createLiveAgendaBlocks("default").find(block => block.id === "default:title")?.props.bindEventTitle, true)
})
