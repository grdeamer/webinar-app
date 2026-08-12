import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Params): Promise<Response> {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id } = await context.params

  const [eventResult, liveStateResult, liveSessionResult] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("title,start_at,end_at")
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("event_live_state")
      .select("status")
      .eq("event_id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("event_agenda_items")
      .select("id")
      .eq("event_id", id)
      .eq("status", "live")
      .limit(1),
  ])

  if (eventResult.error) {
    return NextResponse.json({ error: eventResult.error.message }, { status: 400 })
  }

  if (!eventResult.data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  if (liveStateResult.error) {
    return NextResponse.json({ error: liveStateResult.error.message }, { status: 400 })
  }

  if (liveSessionResult.error) {
    return NextResponse.json({ error: liveSessionResult.error.message }, { status: 400 })
  }

  return NextResponse.json({
    title: eventResult.data.title,
    startAt: eventResult.data.start_at,
    endAt: eventResult.data.end_at,
    access: liveStateResult.data?.status === "open" ? "open" : "closed",
    hasLiveSession: (liveSessionResult.data?.length ?? 0) > 0,
  })
}
