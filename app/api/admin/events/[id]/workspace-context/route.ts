import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventTeamAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Params): Promise<Response> {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id } = await context.params
  const teamAccess = await getEventTeamAccess(id)
  if (!teamAccess) return NextResponse.json({ error: "Event access denied" }, { status: 403 })

  const [eventResult, liveStateResult, liveSessionResult, presenceResult] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("title,badge_image_url,start_at,end_at")
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
    supabaseAdmin
      .from("event_presence")
      .select("user_id,last_seen")
      .eq("event_id", id),
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

  if (presenceResult.error) {
    return NextResponse.json({ error: presenceResult.error.message }, { status: 400 })
  }

  const activeCutoff = Date.now() - 30_000
  const liveAttendeeCount = new Set(
    (presenceResult.data ?? [])
      .filter((row) => {
        if (!row.last_seen) return false
        const lastSeen = new Date(row.last_seen).getTime()
        return Number.isFinite(lastSeen) && lastSeen >= activeCutoff
      })
      .map((row) => row.user_id)
      .filter((userId): userId is string => Boolean(userId))
  ).size

  return NextResponse.json({
    title: eventResult.data.title,
    badgeImageUrl: eventResult.data.badge_image_url,
    startAt: eventResult.data.start_at,
    endAt: eventResult.data.end_at,
    access: liveStateResult.data?.status === "open" ? "open" : "closed",
    hasLiveSession: (liveSessionResult.data?.length ?? 0) > 0,
    liveAttendeeCount,
    teamRole: teamAccess.role,
    isGlobalAdmin: teamAccess.isGlobalAdmin,
  })
}
