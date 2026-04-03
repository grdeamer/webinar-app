import { supabaseAdmin } from "@/lib/supabase/admin"
import { mapSessionRow } from "@/lib/mappers/sessionMappers"

export async function getSessionById(eventId: string, sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from("event_sessions")
    .select("*")
    .eq("event_id", eventId)
    .eq("id", sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load session: ${error.message}`)
  }

  if (!data) return null
  return mapSessionRow(data)
}
export async function listEventSessions(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from("event_sessions")
    .select("*")
    .eq("event_id", eventId)
    .order("starts_at", { ascending: true })
    .order("sort_order", { ascending: true })

  if (error) {
    throw new Error(`Failed to load sessions: ${error.message}`)
  }

  return (data ?? []).map(mapSessionRow)
}
export async function getAssignedSessionIdsForRegistrantEmail(eventId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase()

  const { data: registrants, error: registrantsError } = await supabaseAdmin
    .from("event_registrants")
    .select("id")
    .eq("event_id", eventId)
    .eq("email", normalizedEmail)

  if (registrantsError) {
    throw new Error(`Failed to load registrants: ${registrantsError.message}`)
  }

  const registrantIds = (registrants ?? []).map((r: { id: string }) => r.id).filter(Boolean)

  if (registrantIds.length === 0) return []

  const { data: assignments, error: assignmentsError } = await supabaseAdmin
    .from("event_registrant_sessions")
    .select("session_id")
    .eq("event_id", eventId)
    .in("registrant_id", registrantIds)

  if (assignmentsError) {
    throw new Error(`Failed to load session assignments: ${assignmentsError.message}`)
  }

  return Array.from(
    new Set(
      (assignments ?? [])
        .map((row: { session_id: string | null }) => row.session_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  )
}