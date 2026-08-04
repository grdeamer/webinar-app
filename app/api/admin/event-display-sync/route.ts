import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status })
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  const body = await req.json().catch((): null => null)
  if (!isUuid(body?.event_id)) {
    return json({ error: "A valid event_id is required" }, 400)
  }

  const syncToken = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .update({ updated_at: syncToken })
    .eq("event_id", body.event_id)
    .select("updated_at")
    .maybeSingle()

  if (error) {
    return json({ error: error.message }, 400)
  }

  if (data) {
    return json({ ok: true, sync_token: data.updated_at })
  }

  const { data: initialized, error: initializeError } = await supabaseAdmin
    .from("event_live_state")
    .insert({
      event_id: body.event_id,
      mode: "lobby",
      force_redirect: false,
      updated_at: syncToken,
    })
    .select("updated_at")
    .single()

  if (initializeError) {
    if (initializeError.code === "23505") {
      const { data: retried, error: retryError } = await supabaseAdmin
        .from("event_live_state")
        .update({ updated_at: syncToken })
        .eq("event_id", body.event_id)
        .select("updated_at")
        .single()

      if (retryError) return json({ error: retryError.message }, 400)
      return json({ ok: true, sync_token: retried.updated_at })
    }

    return json({ error: initializeError.message }, 400)
  }

  return json({ ok: true, sync_token: initialized.updated_at })
}
