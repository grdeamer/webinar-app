import { NextResponse } from "next/server"
import { getEventBySlug } from "@/lib/events"
import { getEventLiveDestination, getEventLiveState } from "@/lib/app/liveState"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { EventBreakout } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params

  try {
    const event = await getEventBySlug(slug)
    const liveState = await getEventLiveState(event.id)

    const { data: breakouts } = await supabaseAdmin
      .from("event_breakouts")
      .select("id,event_id,title,description,join_link,start_at,end_at,speaker_name,speaker_avatar_url,manual_live,auto_open,created_at")
      .eq("event_id", event.id)

    const destination = getEventLiveDestination({
      slug,
      liveState,
      breakouts: (breakouts as EventBreakout[] | null) ?? [],
    })

    return NextResponse.json({ liveState, destination })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load live state" },
      { status: 400 }
    )
  }
}
