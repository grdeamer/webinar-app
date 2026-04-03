import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { getEventLiveStageState, ensureEventLiveStageState } from "@/lib/live/stageState"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const { id } = await ctx.params
  const body = await req.json().catch((): null => null)

  if (typeof body?.enabled !== "boolean") {
    return json({ error: "enabled must be boolean" }, 400)
  }

  try {
    const current =
      (await getEventLiveStageState(id)) ||
      (await ensureEventLiveStageState(id))

    const patch = {
      event_id: id,
      room_id: current.room_id,
      is_live: current.is_live,
      auto_director_enabled: body.enabled,
      layout: current.layout,
      stage_participant_ids: current.stage_participant_ids,
      primary_participant_id: current.primary_participant_id,
      pinned_participant_id: current.pinned_participant_id,
      screen_share_participant_id: current.screen_share_participant_id,
      screen_share_track_id: current.screen_share_track_id,
      scene_version: (current.scene_version || 1) + 1,
      headline: current.headline,
      message: current.message,
      updated_by: auth.user.email ?? auth.user.id,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from("event_live_stage_state")
      .upsert(patch, { onConflict: "event_id" })
      .select(
        "event_id,room_id,is_live,auto_director_enabled,layout,stage_participant_ids,primary_participant_id,pinned_participant_id,screen_share_participant_id,screen_share_track_id,scene_version,headline,message,updated_by,updated_at"
      )
      .single()

    if (error) throw new Error(error.message)

    return json({ state: data })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to update Auto Director" }, 500)
  }
}