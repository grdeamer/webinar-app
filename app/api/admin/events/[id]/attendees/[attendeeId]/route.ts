import { NextResponse } from "next/server"
import { assignRegistrantsToDistrict } from "@/lib/districtAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; attendeeId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: eventId, attendeeId } = await context.params
    const body = await request.json()
    const { first_name, last_name, email, role, district_meeting_url, district_session_id } = body

    const updateData: Record<string, unknown> = {}
    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name
    if (email !== undefined) updateData.email = email
    if (role !== undefined) {
      updateData.tag = role === "presenter" ? "presenter" : null
    }

    const { data, error } = await supabaseAdmin
      .from("event_registrants")
      .update(updateData)
      .eq("id", attendeeId)
      .eq("event_id", eventId)
      .select("id,email,first_name,last_name,tag")
      .single()

    if (error) {
      return json({ error: error.message }, 400)
    }

    const districtSessionId = district_session_id ? String(district_session_id) : null
    if (district_session_id !== undefined) {
      await assignRegistrantsToDistrict(
        eventId,
        [attendeeId],
        districtSessionId,
        districtSessionId ? "add" : "clear"
      )
    }

    if (district_meeting_url !== undefined && districtSessionId) {
      const meetingUrl = String(district_meeting_url).trim()
      if (!/^https:\/\//i.test(meetingUrl)) {
        return json({ error: "District meeting URL must use HTTPS" }, 400)
      }

      const { error: sessionError } = await supabaseAdmin
        .from("event_sessions")
        .update({ external_join_url: meetingUrl })
        .eq("id", districtSessionId)
        .eq("event_id", eventId)

      if (sessionError) {
        return json({ error: sessionError.message }, 400)
      }
    }

    return json({ success: true, data })
  } catch (err) {
    console.error("Update attendee error:", err)
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500)
  }
}
