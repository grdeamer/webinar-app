import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Params) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id: eventId } = await ctx.params

  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .select("id,event_id,mode,breakout_id,force_redirect,updated_at")
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) return json({ error: error.message }, 400)

  return json({
    liveState:
      data || {
        event_id: eventId,
        mode: "lobby",
        breakout_id: null,
        force_redirect: false,
        updated_at: null,
      },
  })
}

export async function POST(req: Request, ctx: Params) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id: eventId } = await ctx.params
  const body = await req.json().catch((): null => null)

  const allowedModes = new Set(["lobby", "general", "breakout", "networking", "ondemand"])
  const mode = typeof body?.mode === "string" ? body.mode : "lobby"
  const breakout_id = typeof body?.breakout_id === "string" ? body.breakout_id : null
  const force_redirect = !!body?.force_redirect

  if (!allowedModes.has(mode)) {
    return json({ error: "Invalid mode" }, 400)
  }

  if (mode !== "breakout") {
    const { error } = await supabaseAdmin
      .from("event_live_state")
      .upsert(
        {
          event_id: eventId,
          mode,
          breakout_id: null,
          force_redirect,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      )

    if (error) return json({ error: error.message }, 400)
  } else {
    if (!breakout_id) return json({ error: "Missing breakout_id" }, 400)

    const { error } = await supabaseAdmin
      .from("event_live_state")
      .upsert(
        {
          event_id: eventId,
          mode,
          breakout_id,
          force_redirect,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      )

    if (error) return json({ error: error.message }, 400)
  }

  try {
    await supabaseAdmin
      .from("refresh_signals")
      .insert({
        scope_type: "event",
        scope_id: eventId,
        refresh_token: crypto.randomUUID(),
      })
      .select("id")
      .maybeSingle()
  } catch {
    // ignore refresh signal failures
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .select("id,event_id,mode,breakout_id,force_redirect,updated_at")
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) return json({ error: error.message }, 400)

  return json({ ok: true, liveState: data })
}