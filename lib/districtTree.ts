export type DistrictNodeType = "zone" | "region" | "district" | "other" | "group"

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
