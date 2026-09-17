import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { normalizeAttendeeComponentState } from "@/lib/attendeeComponents"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status })
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(request: Request): Promise<Response> {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const body = await request.json().catch((): null => null)
  if (!isUuid(body?.event_id)) return json({ error: "A valid event_id is required" }, 400)

  const attendeeComponentState = normalizeAttendeeComponentState(body?.attendee_component_state)
  const syncToken = new Date().toISOString()
  const patch = {
    attendee_component_state: attendeeComponentState,
    updated_at: syncToken,
    updated_by: authResult.user.email || authResult.user.id,
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .update(patch)
    .eq("event_id", body.event_id)
    .select("attendee_component_state,updated_at")
    .maybeSingle()

  if (error) return json({ error: error.message }, 400)
  if (data) {
    await supabaseAdmin.from("refresh_signals").insert({
      scope_type: "event",
      scope_id: body.event_id,
      refresh_token: crypto.randomUUID(),
    })
    return json({ ok: true, ...data, sync_token: data.updated_at })
  }

  const { data: initialized, error: initializeError } = await supabaseAdmin
    .from("event_live_state")
    .insert({
      event_id: body.event_id,
      mode: "lobby",
      status: "closed",
      force_redirect: false,
      ...patch,
    })
    .select("attendee_component_state,updated_at")
    .single()

  if (initializeError) return json({ error: initializeError.message }, 400)
  await supabaseAdmin.from("refresh_signals").insert({
    scope_type: "event",
    scope_id: body.event_id,
    refresh_token: crypto.randomUUID(),
  })
  return json({ ok: true, ...initialized, sync_token: initialized.updated_at })
}
