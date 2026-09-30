import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: eventId } = await context.params
    const access = await requireEventOperatorAccess(eventId, ["event_admin"], "people")
    if (access instanceof Response) return access
    const body = await request.json()
    const { attendee_ids } = body

    if (!Array.isArray(attendee_ids) || attendee_ids.length === 0 || attendee_ids.length > 1000 || attendee_ids.some((id: unknown) => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      return NextResponse.json({ error: "attendee_ids array required" }, { status: 400 })
    }

    const { data: people, error: lookupError } = await supabaseAdmin
      .from("event_registrants").select("id").eq("event_id", access.eventId).in("id", attendee_ids)
    if (lookupError) return NextResponse.json({ error: "Unable to validate attendees" }, { status: 500 })
    const ids = [...new Set(attendee_ids)]
    if (!people || people.length !== ids.length) {
      return NextResponse.json({ error: "One or more attendees do not belong to this event" }, { status: 400 })
    }

    // Scope every mutation, even after validating the complete requested set.
    const { error: sessionsError } = await supabaseAdmin
      .from("event_registrant_sessions")
      .delete()
      .eq("event_id", access.eventId)
      .in("registrant_id", ids)

    if (sessionsError) {
      console.error("Error deleting registrant sessions:", sessionsError)
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    // Delete from event_registrants
    const { error: registrantsError } = await supabaseAdmin
      .from("event_registrants")
      .delete()
      .eq("event_id", access.eventId)
      .in("id", ids)

    if (registrantsError) {
      console.error("Error deleting registrants:", registrantsError)
      return NextResponse.json({ error: registrantsError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      deleted_count: ids.length
    })
  } catch (err) {
    console.error("Bulk delete error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}