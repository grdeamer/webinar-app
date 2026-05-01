import { NextResponse } from "next/server"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await ctx.params

  try {
    const event = await getEventBySlug(slug)

    if (!event?.id) {
      return json({ error: "Event not found" }, 404)
    }
    const { data: program, error: programError } = await supabaseAdmin
      .from("event_live_program_state")
      .select(
        "event_id,room_id,is_live,layout,stage_participant_ids,primary_participant_id,pinned_participant_id,screen_share_participant_id,screen_share_track_id,scene_version,updated_at"
      )
      .eq("event_id", String(event.id))
      .maybeSingle()

    if (programError) {
      return json({ error: programError.message }, 500)
    }

    return json({
      eventId: String(event.id),
      slug,
      state: program || null,
    })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to load live state" }, 500)
  }
}