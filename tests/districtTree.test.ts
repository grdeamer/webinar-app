import assert from "node:assert/strict"
import test from "node:test"

import { classifyDistrictNodes, getDistrictLinkStatus, isAssignableDistrictNode, type DistrictNodeType } from "../lib/districtTree.ts"

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

test("summarizes link readiness for leaves, regions, and top-level branches", () => {
  const nodes: Array<{ id: string; district_parent_id: string | null; node_type: DistrictNodeType; external_join_url: string | null }> = [
    { id: "east", district_parent_id: null, node_type: "zone" as const, external_join_url: null },
    { id: "mid", district_parent_id: "east", node_type: "region" as const, external_join_url: null },
    { id: "baltimore", district_parent_id: "mid", node_type: "district" as const, external_join_url: "https://meet.example.com/baltimore" },
    { id: "philly", district_parent_id: "mid", node_type: "district" as const, external_join_url: "" },
    { id: "central", district_parent_id: "east", node_type: "region" as const, external_join_url: null },
    { id: "columbus", district_parent_id: "central", node_type: "district" as const, external_join_url: "https://meet.example.com/columbus" },
    { id: "other", district_parent_id: null, node_type: "other" as const, external_join_url: null },
  ]

  assert.equal(getDistrictLinkStatus(nodes[2], nodes), "ready")
  assert.equal(getDistrictLinkStatus(nodes[3], nodes), "missing")
  assert.equal(getDistrictLinkStatus(nodes[1], nodes), "partial")
  assert.equal(getDistrictLinkStatus(nodes[4], nodes), "ready")
  assert.equal(getDistrictLinkStatus(nodes[0], nodes), "partial")
  assert.equal(getDistrictLinkStatus(nodes[6], nodes), "missing")
})
