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

export function normalizeDistrictName(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function externalPlatformFromUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    if (hostname.endsWith("zoom.us")) return "zoom"
    if (hostname.endsWith("teams.microsoft.com")) return "teams"
    if (hostname.endsWith("webex.com")) return "webex"
    if (hostname.endsWith("gotomeeting.com") || hostname.endsWith("gotowebinar.com")) return "goto"
    if (hostname.endsWith("meet.google.com")) return "google-meet"
    if (hostname.endsWith("ringcentral.com")) return "ringcentral"
    if (hostname.endsWith("chime.aws")) return "chime"
    if (hostname.endsWith("bluejeans.com")) return "bluejeans"
  } catch {
    // Callers validate the link before storing it.
  }
  return "other"
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

export type DistrictRegistrant = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}

export type DistrictAssignment = {
  registrantId: string
  registrantName: string
  session: DistrictSession
}

export function districtRegistrantName(registrant: DistrictRegistrant) {
  return (
    [registrant.first_name, registrant.last_name].filter(Boolean).join(" ").trim() ||
    registrant.email
  )
}

export async function findDistrictSessionForRegistrant(eventId: string, registrantId: string) {
  const { data: assignments, error: assignmentError } = await supabaseAdmin
    .from("event_registrant_sessions")
    .select("session_id")
    .eq("event_id", eventId)
    .eq("registrant_id", registrantId)

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
  return validSessions[0]
}

export async function getAssignedDistrictSession(
  eventId: string,
  email: string
): Promise<DistrictAssignment | null> {
  const { data: registrant, error: registrantError } = await supabaseAdmin
    .from("event_registrants")
    .select("id,email,first_name,last_name")
    .eq("event_id", eventId)
    .eq("email", normalizeDistrictEmail(email))
    .maybeSingle<DistrictRegistrant>()

  if (registrantError) throw new Error(registrantError.message)
  if (!registrant) return null

  const session = await findDistrictSessionForRegistrant(eventId, registrant.id)
  if (!session) return null

  return {
    registrantId: registrant.id,
    registrantName: districtRegistrantName(registrant),
    session,
  }
}

async function findDistrictRegistrantsByName(eventId: string, query: string) {
  const tokens = normalizeDistrictName(query).split(" ").filter(Boolean)
  if (!tokens.length) return []

  let builder = supabaseAdmin
    .from("event_registrants")
    .select("id,email,first_name,last_name")
    .eq("event_id", eventId)
    .limit(25)

  if (tokens.length > 1) {
    builder = builder
      .ilike("first_name", `${tokens[0]}%`)
      .ilike("last_name", `%${tokens[tokens.length - 1]}`)
  } else {
    builder = builder.or(
      `first_name.ilike.%${tokens[0]}%,last_name.ilike.%${tokens[0]}%`
    )
  }

  const { data, error } = await builder.returns<DistrictRegistrant[]>()
  if (error) throw new Error(error.message)

  const wanted = tokens.join(" ")
  return (data || []).filter(
    (registrant) => normalizeDistrictName(districtRegistrantName(registrant)) === wanted
  )
}

/**
 * Resolves a district assignment from a name or email typed by an attendee.
 * Only an unambiguous match is returned so one attendee never sees another
 * district's meeting link.
 */
export async function findDistrictAssignmentByQuery(
  eventId: string,
  query: string
): Promise<DistrictAssignment | null> {
  const trimmed = String(query || "").trim()
  if (!trimmed || trimmed.length > 320) return null

  if (trimmed.includes("@")) {
    const email = normalizeDistrictEmail(trimmed)
    if (!isDistrictEmail(email)) return null
    return getAssignedDistrictSession(eventId, email)
  }

  const registrants = await findDistrictRegistrantsByName(eventId, trimmed)
  if (registrants.length !== 1) return null

  const registrant = registrants[0]
  const session = await findDistrictSessionForRegistrant(eventId, registrant.id)
  if (!session) return null

  return {
    registrantId: registrant.id,
    registrantName: districtRegistrantName(registrant),
    session,
  }
}

/**
 * Points an attendee's district assignment at `meetingUrl`, creating and
 * assigning a district breakout session when the attendee has none yet.
 */
export async function setRegistrantDistrictMeetingUrl(
  eventId: string,
  registrantId: string,
  meetingUrl: string
) {
  if (!/^https:\/\//i.test(meetingUrl)) {
    throw new Error("District meeting URL must use HTTPS")
  }

  const update = {
    delivery_mode: "external",
    external_platform: externalPlatformFromUrl(meetingUrl),
    external_join_url: meetingUrl,
  }

  const existing = await findDistrictSessionForRegistrant(eventId, registrantId)
  if (existing) {
    const { error } = await supabaseAdmin
      .from("event_sessions")
      .update(update)
      .eq("id", existing.id)
      .eq("event_id", eventId)

    if (error) throw new Error(error.message)
    return { sessionId: existing.id, created: false }
  }

  const { data: registrant, error: registrantError } = await supabaseAdmin
    .from("event_registrants")
    .select("id,email,first_name,last_name")
    .eq("event_id", eventId)
    .eq("id", registrantId)
    .maybeSingle<DistrictRegistrant>()

  if (registrantError) throw new Error(registrantError.message)
  if (!registrant) throw new Error("Attendee not found")

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("event_sessions")
    .insert({
      ...update,
      event_id: eventId,
      code: `DISTRICT-${registrantId.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      title: `District room — ${districtRegistrantName(registrant)}`,
      session_kind: "breakout",
      visibility_mode: "assigned",
    })
    .select("id")
    .single()

  if (sessionError) throw new Error(sessionError.message)

  const { error: assignmentError } = await supabaseAdmin
    .from("event_registrant_sessions")
    .insert({ event_id: eventId, registrant_id: registrantId, session_id: session.id })

  if (assignmentError) throw new Error(assignmentError.message)

  return { sessionId: session.id as string, created: true }
}
