export type DistrictNodeType = "zone" | "region" | "district" | "other" | "group"
export type DistrictLinkStatus = "ready" | "partial" | "missing"

export type DistrictTreeRow = {
  id: string
  title: string
  code?: string | null
  external_platform?: string | null
  district_parent_id: string | null
  session_kind: string
}

export function isAssignableDistrictNode(type: DistrictNodeType) {
  return type === "district" || type === "group"
}

type DistrictLinkNode = {
  id: string
  district_parent_id: string | null
  node_type: DistrictNodeType
  external_join_url?: string | null
}

function hasMeetingLink(value?: string | null) {
  return Boolean(value?.trim())
}

export function getDistrictLinkStatus(node: DistrictLinkNode, nodes: DistrictLinkNode[]): DistrictLinkStatus {
  if (isAssignableDistrictNode(node.node_type)) return hasMeetingLink(node.external_join_url) ? "ready" : "missing"

  const descendants: DistrictLinkNode[] = []
  const pending = [node.id]
  const visited = new Set<string>()
  while (pending.length) {
    const parentId = pending.shift()!
    if (visited.has(parentId)) continue
    visited.add(parentId)
    for (const candidate of nodes) {
      if (candidate.district_parent_id !== parentId) continue
      if (isAssignableDistrictNode(candidate.node_type)) descendants.push(candidate)
      else pending.push(candidate.id)
    }
  }

  const readyCount = descendants.filter((candidate) => hasMeetingLink(candidate.external_join_url)).length
  if (descendants.length > 0 && readyCount === descendants.length) return "ready"
  if (readyCount > 0) return "partial"
  return "missing"
}

function isOtherRoot(row: DistrictTreeRow) {
  return row.session_kind === "district_zone" && !row.district_parent_id && (
    row.external_platform === "non_geographic" ||
    row.title.trim().toLowerCase() === "other" ||
    String(row.code || "").toUpperCase().startsWith("OTHER")
  )
}

export function classifyDistrictNodes<T extends DistrictTreeRow>(rows: T[]) {
  const otherIds = new Set(rows.filter(isOtherRoot).map((row) => row.id))

  return rows.map((row) => {
    let node_type: DistrictNodeType
    if (isOtherRoot(row)) node_type = "other"
    else if (row.session_kind === "district_zone") node_type = "zone"
    else if (row.session_kind === "district_region") node_type = "region"
    else node_type = row.district_parent_id && otherIds.has(row.district_parent_id) ? "group" : "district"
    return { ...row, node_type }
  })
}
