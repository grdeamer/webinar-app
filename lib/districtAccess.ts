import { createHmac, timingSafeEqual } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type DistrictSession = {
  id: string
  code: string
  title: string
  presenter: string | null
  external_join_url: string
}

function secret() {
  const value = String(process.env.JWT_SECRET || "").trim()
  if (!value) throw new Error("JWT_SECRET is not configured")
  return value
}

export function normalizeDistrictEmail(value: unknown) {
  return String(value || "").trim().toLowerCase()
}

export function isDistrictEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320
}

export function districtDigest(kind: "email" | "ip" | "code", value: string) {
  return createHmac("sha256", secret()).update(`${kind}:${value}`).digest("hex")
}

export function districtDigestMatches(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex")
  const rightBuffer = Buffer.from(right, "hex")
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  )
}

export function isDistrictAgendaItem(item: {
  district_lookup_enabled?: boolean | null
  title?: string | null
  icon_key?: string | null
  track?: string | null
  location?: string | null
}) {
  if (item.district_lookup_enabled != null) {
    return item.district_lookup_enabled
  }

  const searchable = [item.title, item.icon_key, item.track, item.location]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return searchable.includes("district") || searchable.includes("breakout")
}

export async function isDistrictLookupWindowOpen(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from("event_agenda_items")
    .select("id,district_lookup_enabled,title,icon_key,track,location")
    .eq("event_id", eventId)
    .eq("is_visible", true)
    .eq("status", "live")

  if (error) throw new Error(error.message)
  return (data || []).some(isDistrictAgendaItem)
}

export async function getAssignedDistrictSession(eventId: string, email: string) {
  const { data: registrant, error: registrantError } = await supabaseAdmin
    .from("event_registrants")
    .select("id")
    .eq("event_id", eventId)
    .eq("email", normalizeDistrictEmail(email))
    .maybeSingle()

  if (registrantError) throw new Error(registrantError.message)
  if (!registrant) return null

  const { data: assignments, error: assignmentError } = await supabaseAdmin
    .from("event_registrant_sessions")
    .select("session_id")
    .eq("event_id", eventId)
    .eq("registrant_id", registrant.id)

  if (assignmentError) throw new Error(assignmentError.message)
  const sessionIds = (assignments || []).map((assignment) => assignment.session_id).filter(Boolean)
  if (!sessionIds.length) return null

  const { data: sessions, error: sessionError } = await supabaseAdmin
    .from("event_sessions")
    .select("id,code,title,presenter,external_join_url")
    .eq("event_id", eventId)
    .eq("session_kind", "breakout")
    .eq("visibility_mode", "assigned")
    .eq("delivery_mode", "external")
    .in("id", sessionIds)
    .order("sort_order", { ascending: true })

  if (sessionError) throw new Error(sessionError.message)

  const validSessions = (sessions || []).filter(
    (session): session is DistrictSession =>
      typeof session.external_join_url === "string" && /^https:\/\//i.test(session.external_join_url)
  )

  if (validSessions.length !== 1) return null
  return { registrantId: registrant.id as string, session: validSessions[0] }
}
