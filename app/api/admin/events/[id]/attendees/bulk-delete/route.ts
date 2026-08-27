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
    const { attendee_ids } = body

    if (!Array.isArray(attendee_ids) || attendee_ids.length === 0) {
      return NextResponse.json({ error: "attendee_ids array required" }, { status: 400 })
    }

    // Delete from event_registrant_sessions first (foreign key constraint)
    const { error: sessionsError } = await supabaseAdmin
      .from("event_registrant_sessions")
      .delete()
      .in("registrant_id", attendee_ids)

    if (sessionsError) {
      console.error("Error deleting registrant sessions:", sessionsError)
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    // Delete from event_registrants
    const { error: registrantsError } = await supabaseAdmin
      .from("event_registrants")
      .delete()
      .in("id", attendee_ids)

    if (registrantsError) {
      console.error("Error deleting registrants:", registrantsError)
      return NextResponse.json({ error: registrantsError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      deleted_count: attendee_ids.length 
    })
  } catch (err) {
    console.error("Bulk delete error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}