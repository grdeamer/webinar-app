import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

type EventSessionRow = {
  id: string
  event_id: string
  code: string | null
  title: string
  starts_at: string | null
  ends_at: string | null
}

type RegistrantRow = {
  id: string
  event_id: string
  email: string
  first_name: string | null
  last_name: string | null
}

type RegistrantSessionRow = {
  registrant_id: string
  session_id: string
}

type EventAttendeeRow = {
  user_id: string
}

type UserRow = {
  id: string
  email: string | null
}

type LegacyAssignmentRow = {
  user_id: string
  webinar_id: string
}

type ApiAttendee = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  name: string
  session_ids: string[]
  source: "event_registrants" | "event_attendees"
}

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: eventId } = await context.params

    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("event_sessions")
      .select("id,event_id,code,title,starts_at,ends_at")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("starts_at", { ascending: true, nullsFirst: false })

    if (sessionsError) {
      return json({ error: sessionsError.message }, 400)
    }

    const safeSessions = ((sessions || []) as EventSessionRow[]).map((session) => ({
      id: session.id,
      event_id: session.event_id,
      code: session.code,
      title: session.title,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
    }))

    const attendees: ApiAttendee[] = []

    const { data: registrants, error: registrantsError } = await supabaseAdmin
      .from("event_registrants")
      .select("id,event_id,email,first_name,last_name")
      .eq("event_id", eventId)
      .order("email", { ascending: true })

    if (registrantsError) {
      return json({ error: registrantsError.message }, 400)
    }

    if (registrants && registrants.length > 0) {
      const registrantIds = (registrants as RegistrantRow[]).map((r) => r.id)

      const { data: registrantSessions, error: registrantSessionsError } =
        await supabaseAdmin
          .from("event_registrant_sessions")
          .select("registrant_id,session_id")
          .in("registrant_id", registrantIds)

      if (registrantSessionsError) {
        return json({ error: registrantSessionsError.message }, 400)
      }

      const registrantSessionMap: Record<string, string[]> = {}

      for (const row of (registrantSessions || []) as RegistrantSessionRow[]) {
        if (!registrantSessionMap[row.registrant_id]) {
          registrantSessionMap[row.registrant_id] = []
        }
        registrantSessionMap[row.registrant_id].push(row.session_id)
      }

      // ✅ FIXED HERE
      attendees.push(
        ...(registrants as RegistrantRow[]).map((r): ApiAttendee => ({
          id: r.id,
          email: r.email,
          first_name: r.first_name ?? null,
          last_name: r.last_name ?? null,
          name:
            [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || r.email,
          session_ids: registrantSessionMap[r.id] || [],
          source: "event_registrants",
        }))
      )
    }

    const { data: eventAttendees, error: attendeesError } = await supabaseAdmin
      .from("event_attendees")
      .select("user_id")
      .eq("event_id", eventId)

    if (attendeesError) {
      return json({ error: attendeesError.message }, 400)
    }

    if (eventAttendees && eventAttendees.length > 0) {
      const userIds = (eventAttendees as EventAttendeeRow[]).map((a) => a.user_id)

      const { data: users, error: usersError } = await supabaseAdmin
        .from("users")
        .select("id,email")
        .in("id", userIds)

      if (usersError) {
        return json({ error: usersError.message }, 400)
      }

      const { data: legacyAssignments, error: assignmentsError } = await supabaseAdmin
        .from("event_user_webinars")
        .select("user_id,webinar_id")
        .eq("event_id", eventId)

      if (assignmentsError) {
        return json({ error: assignmentsError.message }, 400)
      }

      const legacySessionMap: Record<string, string[]> = {}

      for (const row of (legacyAssignments || []) as LegacyAssignmentRow[]) {
        if (!legacySessionMap[row.user_id]) {
          legacySessionMap[row.user_id] = []
        }
        legacySessionMap[row.user_id].push(row.webinar_id)
      }

      const existingIds = new Set(attendees.map((a) => a.id))

      // ✅ FIXED HERE TOO
      attendees.push(
        ...((users || []) as UserRow[])
          .filter((u) => !existingIds.has(u.id))
          .map((u): ApiAttendee => ({
            id: u.id,
            email: u.email || "",
            first_name: null,
            last_name: null,
            name: u.email || "Unknown attendee",
            session_ids: legacySessionMap[u.id] || [],
            source: "event_attendees",
          }))
      )
    }

    return json({
      attendees,
      sessions: safeSessions,
    })
  } catch (err) {
    console.error(err)
    return json({ error: "Server error" }, 500)
  }
}