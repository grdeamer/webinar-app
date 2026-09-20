import assert from "node:assert/strict"
import test from "node:test"
import {
  buildSessionDistrictAuditRows,
  SESSION_DISTRICT_AUDIT_HEADERS,
  type SessionDistrictAuditSourceRow,
} from "../lib/reports/sessionDistrictAudit.ts"

function row(
  overrides: Partial<SessionDistrictAuditSourceRow>,
): SessionDistrictAuditSourceRow {
  return {
    id: crypto.randomUUID(),
    code: "SESSION-1",
    title: "Opening session",
    presenter: "Presenter",
    starts_at: "2026-09-24T15:00:00Z",
    ends_at: "2026-09-24T15:30:00Z",
    session_kind: "standard",
    district_parent_id: null,
    visibility_mode: "public",
    delivery_mode: "external",
    external_platform: "zoom",
    external_join_url: "https://example.zoom.us/j/123",
    join_link: null,
    live_provider: null,
    live_room_name: null,
    runtime_status: "holding",
    is_general_session: false,
    ...overrides,
  }
}

test("visual audit includes every session and complete district hierarchy", () => {
  const zone = row({ id: "00000000-0000-4000-8000-000000000001", code: "ZONE-1", title: "East", session_kind: "district_zone", external_platform: null, external_join_url: null })
  const region = row({ id: "00000000-0000-4000-8000-000000000002", code: "REG-1", title: "Central", session_kind: "district_region", district_parent_id: zone.id, external_platform: null, external_join_url: null })
  const district = row({ id: "00000000-0000-4000-8000-000000000003", code: "DIST-1", title: "Lexington", session_kind: "district", district_parent_id: region.id })
  const session = row({ id: "00000000-0000-4000-8000-000000000004" })

  const rows = buildSessionDistrictAuditRows({
    rows: [zone, region, district, session],
    origin: "https://app.jupiter.events",
    eventId: "event-id",
    eventSlug: "annual-meeting",
  })

  assert.equal(rows.length, 4)
  assert.deepEqual(Object.keys(rows[0]), [...SESSION_DISTRICT_AUDIT_HEADERS])
  assert.equal(rows[2].record_type, "district")
  assert.equal(rows[2].hierarchy_path, "East > Central > Lexington")
  assert.equal(rows[2].zone_or_group, "East")
  assert.equal(rows[2].region, "Central")
  assert.equal(rows[2].parent_name, "Central")
  assert.equal(rows[2].meeting_link_status, "LINK READY")
  assert.equal(rows[3].record_type, "session")
  assert.equal(
    rows[3].attendee_inspection_url,
    `https://app.jupiter.events/events/annual-meeting/sessions/${session.id}`,
  )
})

test("visual audit flags missing and malformed leaf links", () => {
  const missing = row({ external_join_url: null, join_link: null })
  const malformed = row({ external_join_url: "javascript:alert(1)" })
  const rows = buildSessionDistrictAuditRows({
    rows: [missing, malformed],
    origin: "https://app.jupiter.events",
    eventId: "event-id",
    eventSlug: "annual-meeting",
  })

  assert.equal(rows[0].meeting_link_status, "MISSING LINK")
  assert.equal(rows[1].meeting_link_status, "INVALID LINK")
})
