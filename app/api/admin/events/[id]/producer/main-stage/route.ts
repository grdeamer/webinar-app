import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EventRow = {
  id: string
  title: string
  start_at: string | null
  end_at: string | null
}

type SessionRow = {
  id: string
  code: string
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function mainStageCode(sessions: SessionRow[]) {
  const existingCodes = new Set(sessions.map((session) => session.code?.toUpperCase()).filter(Boolean))
  if (!existingCodes.has("MAIN")) return "MAIN"

  let suffix = 2
  while (existingCodes.has(`MAIN-${suffix}`)) suffix += 1
  return `MAIN-${suffix}`
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await requireAdmin()

  const { id } = await context.params
  const eventQuery = supabaseAdmin
    .from("events")
    .select("id,title,start_at,end_at")

  const { data: event, error: eventError } = isUuid(id)
    ? await eventQuery.eq("id", id).maybeSingle<EventRow>()
    : await eventQuery.eq("slug", id).maybeSingle<EventRow>()

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 400 })
  }
  if (!event?.id) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  const { data: existingMainStage, error: existingError } = await supabaseAdmin
    .from("event_sessions")
    .select("id,code")
    .eq("event_id", event.id)
    .or("is_general_session.eq.true,session_kind.eq.general")
    .order("is_general_session", { ascending: false })
    .limit(1)
    .maybeSingle<SessionRow>()

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 })
  }
  if (existingMainStage?.id) {
    return NextResponse.json({ ok: true, created: false, session: existingMainStage })
  }

  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from("event_sessions")
    .select("id,code")
    .eq("event_id", event.id)

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 400 })
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("event_sessions")
    .insert({
      event_id: event.id,
      code: mainStageCode((sessions || []) as SessionRow[]),
      title: "Main Stage",
      description: `Primary live production stage for ${event.title}.`,
      starts_at: event.start_at,
      ends_at: event.end_at,
      sort_order: 0,
      session_kind: "general",
      visibility_mode: "all",
      delivery_mode: "livekit",
      live_provider: "livekit",
      is_general_session: true,
      manual_live: false,
      runtime_status: "holding",
    })
    .select("id,code")
    .single<SessionRow>()

  if (createError) {
    const { data: recovered } = await supabaseAdmin
      .from("event_sessions")
      .select("id,code")
      .eq("event_id", event.id)
      .or("is_general_session.eq.true,session_kind.eq.general")
      .limit(1)
      .maybeSingle<SessionRow>()

    if (recovered?.id) {
      return NextResponse.json({ ok: true, created: false, session: recovered })
    }

    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, created: true, session: created }, { status: 201 })
}
