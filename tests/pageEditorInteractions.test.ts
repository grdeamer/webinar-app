import assert from "node:assert/strict"
import test from "node:test"

import { calculateAlignmentGuides } from "../components/page-editor/alignmentGuides.ts"
import { getElementAlignmentUpdates } from "../components/page-editor/elementAlignmentCommands.ts"
import {
  getCompositeMoveUpdates,
  getExpandedGroupMemberIds,
  getGroupResizeSnapshot,
  getGroupResizeUpdates,
} from "../components/page-editor/elementGrouping.ts"
import { applyLayerCommand } from "../components/page-editor/layerCommands.ts"
import { getPublicEditorPageUrl } from "../components/page-editor/editorPages.ts"
import { getElementFrameStyle, getElementIntroAnimationStyle, getResponsiveElement } from "../lib/page-editor/elementPresentation.ts"
import { getPageBackgroundStyle } from "../lib/page-editor/themeBackground.ts"

test("canvas movement snaps matching centers within the threshold", () => {
  const result = calculateAlignmentGuides({
    dragged: { id: "moving", x: 96, y: 44, width: 100, height: 40 },
    targets: [{ id: "target", x: 200, y: 40, width: 100, height: 40 }],
    threshold: 8,
  })

  assert.equal(result.y, 40)
  assert.deepEqual(result.guides.horizontal, [40, 60, 80])
})

test("multi-selection alignment preserves element dimensions", () => {
  const updates = getElementAlignmentUpdates({
    elements: [
      { id: "a", x: 20, y: 10, width: 40, height: 20 },
      { id: "b", x: 90, y: 40, width: 20, height: 30 },
    ],
    selectedIds: ["a", "b"],
    command: "align-left",
  })

  assert.deepEqual(updates, [
    { id: "a", x: 20 },
    { id: "b", x: 20 },
  ])
})

test("selecting one grouped element expands commands to every member", () => {
  const elements = [
    { id: "a", props: { groupId: "hero" } },
    { id: "b", props: { groupId: "hero" } },
    { id: "c", props: {} },
  ]

  assert.deepEqual(getExpandedGroupMemberIds(elements, ["a"]), ["a", "b"])
})

test("group movement clamps the whole group to the canvas origin", () => {
  const updates = getCompositeMoveUpdates({
    elements: [
      { id: "a", x: 10, y: 20, width: 20, height: 20 },
      { id: "b", x: 50, y: 40, width: 20, height: 20 },
    ],
    selectedIds: ["a", "b"],
    deltaX: -30,
    deltaY: -40,
  })

  assert.deepEqual(updates, [
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 40, y: 20 },
  ])
})

test("group resize scales position and dimensions from common bounds", () => {
  const snapshot = getGroupResizeSnapshot([
    { id: "a", x: 0, y: 0, width: 50, height: 50 },
    { id: "b", x: 50, y: 50, width: 50, height: 50 },
  ])
  assert.ok(snapshot)

  assert.deepEqual(getGroupResizeUpdates({ snapshot, width: 200, height: 200 }), [
    { id: "a", x: 0, y: 0, width: 100, height: 100 },
    { id: "b", x: 100, y: 100, width: 100, height: 100 },
  ])
})

test("layer commands normalize ordering and preserve immutable inputs", () => {
  const original = [
    { id: "back", element_type: "text", content: "Back", x: 0, y: 0, z_index: 20 },
    { id: "front", element_type: "text", content: "Front", x: 0, y: 0, z_index: 40 },
  ]
  const reordered = applyLayerCommand(original, "back", "bring-to-front")

  assert.deepEqual(reordered.map((element) => [element.id, element.z_index]), [
    ["front", 1],
    ["back", 2],
  ])
  assert.equal(original[0].z_index, 20)
})

test("locked and visible layer state toggles independently", () => {
  const original = [
    { id: "item", element_type: "text", content: "Item", x: 0, y: 0 },
  ]
  const locked = applyLayerCommand(original, "item", "toggle-lock")
  const hidden = applyLayerCommand(locked, "item", "toggle-visibility")

  assert.equal(hidden[0].locked, true)
  assert.equal(hidden[0].visible, false)
})

test("responsive element overrides preserve the desktop base", () => {
  const element = {
    id: "hero-title",
    element_type: "text",
    content: "Desktop title",
    x: 120,
    y: 80,
    width: 640,
    height: 120,
    props: {
      fontSize: 72,
      responsiveStyles: {
        mobile: { x: 24, y: 36, width: 320, props: { fontSize: 42 } },
      },
    },
  }

  const mobile = getResponsiveElement(element, "mobile")
  assert.equal(mobile.x, 24)
  assert.equal(mobile.width, 320)
  assert.equal(mobile.props?.fontSize, 42)
  assert.equal(element.x, 120)
  assert.equal(element.props.fontSize, 72)
})

test("element frame rotation is composed exactly once with flips", () => {
  const style = getElementFrameStyle({
    id: "rotated",
    element_type: "image",
    content: "",
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    props: { rotation: 15, flipX: true },
  })

  assert.equal(style.transform, "rotate(15deg) scale(-1, 1)")
})

test("saved intro animation settings produce bounded motion styles", () => {
  const style = getElementIntroAnimationStyle({ id: "animated", element_type: "text", content: "Hi", x: 0, y: 0, props: { animation: { intro: "slide-up", duration: 99999, delay: -20, easing: "ease-in-out" } } })
  assert.equal(style.animationName, "jupiterElementSlideUp")
  assert.equal(style.animationDuration, "10000ms")
  assert.equal(style.animationDelay, "0ms")
  assert.equal(style.animationTimingFunction, "ease-in-out")
})

test("page image backgrounds preserve safe sizing and clamp their overlay", () => {
  const style = getPageBackgroundStyle({
    pageBackgroundColor: "#020617",
    pageBackgroundImageUrl: "https://cdn.example.test/hero image.jpg",
    pageBackgroundImageFit: "contain",
    pageBackgroundImagePosition: "top",
    pageBackgroundOverlay: 4,
  })

  assert.match(String(style.backgroundImage), /rgba\(2,6,23,0\.9\)/)
  assert.match(String(style.backgroundImage), /hero image\.jpg/)
  assert.equal(style.backgroundSize, "cover, contain")
  assert.equal(style.backgroundPosition, "center, top")
})

test("preview links target the selected built-in or custom page", () => {
  assert.equal(getPublicEditorPageUrl("annual-meeting", "agenda"), "/events/annual-meeting/agenda")
  assert.equal(getPublicEditorPageUrl("annual meeting", "leadership-room"), "/events/annual%20meeting/pages/leadership-room")
})
