import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ensureEventLiveStageState } from "@/lib/live/stageState"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; sceneId: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const { id, sceneId } = await ctx.params

  try {
    const { data: scene, error: sceneError } = await supabaseAdmin
      .from("event_live_scenes")
      .select("*")
      .eq("id", sceneId)
      .eq("event_id", id)
      .single()

    if (sceneError || !scene) {
      return json({ error: "Scene not found" }, 404)
    }

    const current = await ensureEventLiveStageState(id)

    const sceneJson = (scene.scene_json || {}) as Record<string, any>

    const patch = {
      event_id: id,
      room_id: current.room_id,
      is_live: current.is_live,
      layout: sceneJson.layout || scene.layout || current.layout,
      stage_participant_ids: Array.isArray(sceneJson.stage_participant_ids)
        ? sceneJson.stage_participant_ids
        : current.stage_participant_ids,
      primary_participant_id:
        sceneJson.primary_participant_id ?? current.primary_participant_id,
      pinned_participant_id:
        sceneJson.pinned_participant_id ?? current.pinned_participant_id,
      screen_share_participant_id:
        sceneJson.screen_share_participant_id ?? current.screen_share_participant_id,
      screen_share_track_id:
        sceneJson.screen_share_track_id ?? current.screen_share_track_id,
      scene_version: (current.scene_version || 1) + 1,
      headline: current.headline,
      message: current.message,
      updated_by: auth.user.email ?? auth.user.id,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("event_live_stage_state")
      .upsert(patch, { onConflict: "event_id" })
      .select("*")
      .single()

    if (updateError) throw new Error(updateError.message)

    return json({ state: updated, scene })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to apply scene" }, 500)
  }
}