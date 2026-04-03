import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

type Body = {
  session_id?: string
  checked?: boolean
}

type SessionRow = {
  session_id: string
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; attendeeId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: eventId, attendeeId } = await context.params
    const body = (await req.json().catch(() => ({}))) as Body

    const sessionId = String(body.session_id || "").trim()
    const checked = Boolean(body.checked)

    if (!sessionId) {
      return json({ error: "session_id is required" }, 400)
    }

    const { data: registrant, error: registrantError } = await supabaseAdmin
      .from("event_registrants")
      .select("id,event_id")
      .eq("id", attendeeId)
      .eq("event_id", eventId)
      .maybeSingle()

    if (registrantError) {
      return json({ error: registrantError.message }, 400)
    }

    if (!registrant) {
      return json({ error: "Registrant not found for this event" }, 404)
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

    if (checked) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("event_registrant_sessions")
        .select("session_id")
        .eq("event_id", eventId)
        .eq("registrant_id", attendeeId)
        .eq("session_id", sessionId)
        .maybeSingle()

      if (existingError) {
        return json({ error: existingError.message }, 400)
      }

      if (!existing) {
        const { error: insertError } = await supabaseAdmin
          .from("event_registrant_sessions")
          .insert({
            event_id: eventId,
            registrant_id: attendeeId,
            session_id: sessionId,
          })

        if (insertError) {
          return json({ error: insertError.message }, 400)
        }
      }
    } else {
      const { error: deleteError } = await supabaseAdmin
        .from("event_registrant_sessions")
        .delete()
        .eq("event_id", eventId)
        .eq("registrant_id", attendeeId)
        .eq("session_id", sessionId)

      if (deleteError) {
        return json({ error: deleteError.message }, 400)
      }
    }

    const { data: rows, error: rowsError } = await supabaseAdmin
      .from("event_registrant_sessions")
      .select("session_id")
      .eq("event_id", eventId)
      .eq("registrant_id", attendeeId)

    if (rowsError) {
      return json({ error: rowsError.message }, 400)
    }

    return json({
      success: true,
      attendee_id: attendeeId,
      session_ids: ((rows || []) as SessionRow[]).map((r) => r.session_id),
    })
  } catch (err: any) {
    console.error("attendee session update error:", err)
    return json({ error: err?.message || "Server error" }, 500)
  }
}