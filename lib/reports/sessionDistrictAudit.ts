import { classifyDistrictNodes, type DistrictNodeType } from "../districtTree.ts"

export type SessionDistrictAuditSourceRow = {
  id: string
  code: string | null
  title: string
  presenter: string | null
  starts_at: string | null
  ends_at: string | null
  session_kind: string
  district_parent_id: string | null
  visibility_mode: string | null
  delivery_mode: string | null
  external_platform: string | null
  external_join_url: string | null
  join_link: string | null
  live_provider: string | null
  live_room_name: string | null
  runtime_status: string | null
  is_general_session: boolean | null
}

type ClassifiedDistrictRow = SessionDistrictAuditSourceRow & {
  node_type: DistrictNodeType
}

export const SESSION_DISTRICT_AUDIT_HEADERS = [
  "record_type",
  "hierarchy_path",
  "zone_or_group",
  "region",
  "parent_code",
  "parent_name",
  "session_code",
  "session_name",
  "presenter_or_lead",
  "starts_at",
  "ends_at",
  "session_kind",
  "visibility_mode",
  "delivery_mode",
  "runtime_status",
  "meeting_platform",
  "meeting_link",
  "meeting_link_status",
  "attendee_inspection_url",
  "admin_inspection_url",
] as const

const DISTRICT_KINDS = new Set(["district_zone", "district_region", "district", "breakout"])

function linkStatus(value: string, structural: boolean, deliveryMode: string | null) {
  if (structural) return "STRUCTURE ONLY"
  if (!value) return deliveryMode === "internal" ? "JUPITER LIVE" : "MISSING LINK"
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? "LINK READY" : "INVALID LINK"
  } catch {
    return "INVALID LINK"
  }
}

function lineageFor(
  row: ClassifiedDistrictRow,
  districtById: Map<string, ClassifiedDistrictRow>,
) {
  const lineage: ClassifiedDistrictRow[] = []
  const visited = new Set<string>()
  let current: ClassifiedDistrictRow | undefined = row

  while (current && !visited.has(current.id) && lineage.length < 12) {
    lineage.unshift(current)
    visited.add(current.id)
    current = current.district_parent_id
      ? districtById.get(current.district_parent_id)
      : undefined
  }

  return lineage
}

function recordType(row: SessionDistrictAuditSourceRow, node?: ClassifiedDistrictRow) {
  if (node) return node.node_type
  if (row.is_general_session) return "general_session"
  return "session"
}

export function buildSessionDistrictAuditRows(args: {
  rows: SessionDistrictAuditSourceRow[]
  origin: string
  eventId: string
  eventSlug: string
}): Record<(typeof SESSION_DISTRICT_AUDIT_HEADERS)[number], unknown>[] {
  const districtRows = classifyDistrictNodes(
    args.rows.filter((row) => DISTRICT_KINDS.has(row.session_kind)),
  ) as ClassifiedDistrictRow[]
  const districtById = new Map(districtRows.map((row) => [row.id, row]))

  return args.rows.map((row) => {
    const node = districtById.get(row.id)
    const lineage = node ? lineageFor(node, districtById) : []
    const parent = row.district_parent_id ? districtById.get(row.district_parent_id) : undefined
    const root = lineage.find((item) => item.node_type === "zone" || item.node_type === "other")
    const region = lineage.find((item) => item.node_type === "region")
    const meetingLink = String(row.external_join_url || row.join_link || "").trim()
    const structural = node?.node_type === "zone" || node?.node_type === "region" || node?.node_type === "other"
    const attendeePath = node
      ? `/events/${encodeURIComponent(args.eventSlug)}/breakouts`
      : `/events/${encodeURIComponent(args.eventSlug)}/sessions/${encodeURIComponent(row.id)}`
    const adminPath = node
      ? `/admin/events/${encodeURIComponent(args.eventId)}/districts`
      : `/admin/events/${encodeURIComponent(args.eventId)}/sessions?session=${encodeURIComponent(row.id)}`

    return {
      record_type: recordType(row, node),
      hierarchy_path: lineage.map((item) => item.title).join(" > "),
      zone_or_group: root?.title || "",
      region: region?.title || "",
      parent_code: parent?.code || "",
      parent_name: parent?.title || "",
      session_code: row.code || "",
      session_name: row.title,
      presenter_or_lead: row.presenter || "",
      starts_at: row.starts_at || "",
      ends_at: row.ends_at || "",
      session_kind: row.session_kind,
      visibility_mode: row.visibility_mode || "",
      delivery_mode: row.delivery_mode || "",
      runtime_status: row.runtime_status || "",
      meeting_platform: row.external_platform || row.live_provider || "",
      meeting_link: meetingLink,
      meeting_link_status: linkStatus(meetingLink, structural, row.delivery_mode),
      attendee_inspection_url: new URL(attendeePath, args.origin).href,
      admin_inspection_url: new URL(adminPath, args.origin).href,
    }
  })
}
