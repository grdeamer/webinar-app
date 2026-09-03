import { NextResponse } from "next/server"
import { assignRegistrantsToDistrict } from "@/lib/districtAccess"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: eventId } = await context.params
    const body = await request.json()
    const { attendee_ids, district_session_id } = body

    if (!Array.isArray(attendee_ids) || attendee_ids.length === 0) {
      return json({ error: "attendee_ids array required" }, 400)
    }

    const attendeeIds = attendee_ids.map((value: unknown) => String(value)).filter(Boolean)
    const sessionId = district_session_id ? String(district_session_id) : null

    const result = await assignRegistrantsToDistrict(eventId, attendeeIds, sessionId)
    return json({ success: true, ...result, cleared: sessionId === null })
  } catch (err) {
    console.error("Bulk district assignment error:", err)
    const message = err instanceof Error ? err.message : "Server error"
    return json({ error: message }, 400)
  }
}
