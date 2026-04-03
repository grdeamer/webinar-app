import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

type Body = {
  attendee_id?: string
  session_id?: string
  assign?: boolean
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: eventId } = await context.params
    const body = (await req.json().catch((): null => null)) as Body | null

    const attendeeId = String(body?.attendee_id || "").trim()
    const sessionId = String(body?.session_id || "").trim()
    const assign = Boolean(body?.assign)

    if (!attendeeId || !sessionId) {
      return json({ error: "attendee_id and session_id are required" }, 400)
    }

    const { data: attendee, error: attendeeError } = await supabaseAdmin
      .from("event_registrants")
      .select("id,event_id")
      .eq("id", attendeeId)
      .eq("event_id", eventId)
      .maybeSingle()

    if (attendeeError) {
      return json({ error: attendeeError.message }, 400)
    }

    if (!attendee) {
      return json({ error: "Attendee not found for this event" }, 404)
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("event_sessions")
      .select("id,event_id,title")
      .eq("id", sessionId)
      .eq("event_id", eventId)
      .maybeSingle()

    if (sessionError) {
      return json({ error: sessionError.message }, 400)
    }

    if (!session) {
      return json({ error: "Session not found for this event" }, 404)
    }

    if (assign) {
      const { error: upsertError } = await supabaseAdmin
        .from("event_registrant_sessions")
        .upsert(
          {
            registrant_id: attendeeId,
            session_id: sessionId,
          },
          { onConflict: "registrant_id,session_id" }
        )

      if (upsertError) {
        return json({ error: upsertError.message }, 400)
      }
    } else {
      const { error: deleteError } = await supabaseAdmin
        .from("event_registrant_sessions")
        .delete()
        .eq("registrant_id", attendeeId)
        .eq("session_id", sessionId)

      if (deleteError) {
        return json({ error: deleteError.message }, 400)
      }
    }

    return json({
      success: true,
      attendee_id: attendeeId,
      session_id: sessionId,
      assign,
    })
  } catch (err) {
    console.error(err)
    return json({ error: "Server error" }, 500)
  }
}