import assert from "node:assert/strict"
import test from "node:test"

import { classifyDistrictNodes, isAssignableDistrictNode } from "../lib/districtTree.ts"

test("classifies geographic and non-geographic branches without new database node kinds", () => {
  const nodes = classifyDistrictNodes([
    { id: "east", title: "East", code: "ZONE-01", external_platform: null, district_parent_id: null, session_kind: "district_zone" },
    { id: "mid", title: "Mid-Atlantic", code: "REG-01", external_platform: null, district_parent_id: "east", session_kind: "district_region" },
    { id: "phl", title: "Philadelphia", code: "PHL", external_platform: null, district_parent_id: "mid", session_kind: "district" },
    { id: "other", title: "Other", code: "OTHER", external_platform: null, district_parent_id: null, session_kind: "district_zone" },
    { id: "strategic", title: "Strategic Accounts", code: "STRATEGIC", external_platform: null, district_parent_id: "other", session_kind: "district" },
  ])

  assert.deepEqual(nodes.map((node) => node.node_type), ["zone", "region", "district", "other", "group"])
  assert.equal(isAssignableDistrictNode(nodes[2].node_type), true)
  assert.equal(isAssignableDistrictNode(nodes[4].node_type), true)
  assert.equal(isAssignableDistrictNode(nodes[3].node_type), false)
})

test("keeps a renamed Other section non-geographic through its storage marker", () => {
  const [node] = classifyDistrictNodes([
    { id: "other", title: "National Teams", code: "NT", external_platform: "non_geographic", district_parent_id: null, session_kind: "district_zone" },
  ])

  assert.equal(node.node_type, "other")
})
