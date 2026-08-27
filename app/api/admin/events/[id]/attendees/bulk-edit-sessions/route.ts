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

    const addIds = Array.isArray(add_session_ids) ? add_session_ids : []
    const removeIds = Array.isArray(remove_session_ids) ? remove_session_ids : []

    let updatedCount = 0

    // Add sessions to attendees
    if (addIds.length > 0) {
      const insertData = []
      for (const attendeeId of attendee_ids) {
        for (const sessionId of addIds) {
          insertData.push({
            registrant_id: attendeeId,
            session_id: sessionId,
          })
        }
      }

      // First, check for existing assignments to avoid duplicates
      const { data: existingAssignments, error: checkError } = await supabaseAdmin
        .from("event_registrant_sessions")
        .select("registrant_id, session_id")
        .in("registrant_id", attendee_ids)
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

      updatedCount += attendee_ids.length
    }

    // Remove sessions from attendees
    if (removeIds.length > 0) {
      const { error: removeError } = await supabaseAdmin
        .from("event_registrant_sessions")
        .delete()
        .in("registrant_id", attendee_ids)
        .in("session_id", removeIds)

      if (removeError) {
        console.error("Error removing sessions:", removeError)
        return NextResponse.json({ error: removeError.message }, { status: 500 })
      }

      updatedCount += attendee_ids.length
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