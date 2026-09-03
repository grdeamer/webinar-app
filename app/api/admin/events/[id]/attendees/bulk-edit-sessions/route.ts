import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: eventId } = await context.params
    const body = await request.json()
    const { attendee_ids, add_session_ids, remove_session_ids } = body

    if (!Array.isArray(attendee_ids) || attendee_ids.length === 0) {
      return NextResponse.json({ error: "attendee_ids array required" }, { status: 400 })
    }

    if (!Array.isArray(add_session_ids) && !Array.isArray(remove_session_ids)) {
      return NextResponse.json({ error: "add_session_ids or remove_session_ids array required" }, { status: 400 })
    }

    const addIds = (Array.isArray(add_session_ids) ? add_session_ids : []).map((value: unknown) => String(value)).filter(Boolean)
    const removeIds = (Array.isArray(remove_session_ids) ? remove_session_ids : []).map((value: unknown) => String(value)).filter(Boolean)
    const attendeeIds = attendee_ids.map((value: unknown) => String(value)).filter(Boolean)

    const { data: eventSessions, error: sessionsError } = await supabaseAdmin
      .from("event_sessions")
      .select("id")
      .eq("event_id", eventId)
      .in("id", [...new Set([...addIds, ...removeIds])])

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    const eventSessionIds = new Set((eventSessions || []).map((session) => session.id))
    if ([...addIds, ...removeIds].some((sessionId) => !eventSessionIds.has(sessionId))) {
      return NextResponse.json({ error: "A session does not belong to this event" }, { status: 400 })
    }

    const { data: eventRegistrants, error: registrantsError } = await supabaseAdmin
      .from("event_registrants")
      .select("id")
      .eq("event_id", eventId)
      .in("id", attendeeIds)

    if (registrantsError) {
      return NextResponse.json({ error: registrantsError.message }, { status: 500 })
    }

    const eventAttendeeIds = (eventRegistrants || []).map((registrant) => registrant.id)
    if (eventAttendeeIds.length !== new Set(attendeeIds).size) {
      return NextResponse.json({ error: "An attendee does not belong to this event" }, { status: 400 })
    }

    let updatedCount = 0

    // Add sessions to attendees
    if (addIds.length > 0) {
      const insertData = []
      for (const attendeeId of eventAttendeeIds) {
        for (const sessionId of addIds) {
          insertData.push({
            event_id: eventId,
            registrant_id: attendeeId,
            session_id: sessionId,
          })
        }
      }

      // First, check for existing assignments to avoid duplicates
      const { data: existingAssignments, error: checkError } = await supabaseAdmin
        .from("event_registrant_sessions")
        .select("registrant_id, session_id")
        .eq("event_id", eventId)
        .in("registrant_id", eventAttendeeIds)
        .in("session_id", addIds)

      if (checkError) {
        console.error("Error checking existing assignments:", checkError)
        return NextResponse.json({ error: checkError.message }, { status: 500 })
      }

      // Filter out existing assignments
      const existingSet = new Set(
        (existingAssignments || []).map(a => `${a.registrant_id}-${a.session_id}`)
      )
      const newAssignments = insertData.filter(
        a => !existingSet.has(`${a.registrant_id}-${a.session_id}`)
      )

      if (newAssignments.length > 0) {
        const { error: addError } = await supabaseAdmin
          .from("event_registrant_sessions")
          .insert(newAssignments)

        if (addError) {
          console.error("Error adding sessions:", addError)
          return NextResponse.json({ error: addError.message }, { status: 500 })
        }
      }

      updatedCount += eventAttendeeIds.length
    }

    // Remove sessions from attendees
    if (removeIds.length > 0) {
      const { error: removeError } = await supabaseAdmin
        .from("event_registrant_sessions")
        .delete()
        .eq("event_id", eventId)
        .in("registrant_id", eventAttendeeIds)
        .in("session_id", removeIds)

      if (removeError) {
        console.error("Error removing sessions:", removeError)
        return NextResponse.json({ error: removeError.message }, { status: 500 })
      }

      updatedCount += eventAttendeeIds.length
    }

    return NextResponse.json({ 
      success: true, 
      updated_count: updatedCount 
    })
  } catch (err) {
    console.error("Bulk edit sessions error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
