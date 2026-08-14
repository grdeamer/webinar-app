import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
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
  const { id, sceneId } = await ctx.params
  const auth = await requireEventOperatorAccess(id)
  if (auth instanceof Response) return auth

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
      preview_blocks: Array.isArray(sceneJson.preview_blocks)
        ? sceneJson.preview_blocks
        : current.preview_blocks ?? [],
      scene_version: (current.scene_version || 1) + 1,
      headline: current.headline,
      message: current.message,
      updated_by: auth.user.email ?? auth.user.id,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("event_live_stage_state")
      .update(patch)
      .eq("event_id", id)
      .eq("scene_version", current.scene_version)
      .select("*")
      .maybeSingle()

    if (updateError) throw new Error(updateError.message)
    if (!updated) return json({ error: "Scene changed in another producer console" }, 409)

    await supabaseAdmin.from("event_live_commands").insert({
      event_id: id,
      command_id: crypto.randomUUID(),
      command_type: "APPLY_SCENE",
      expected_version: current.scene_version,
      applied_version: updated.scene_version,
      payload: { scene_id: sceneId },
      actor_id: auth.user.id,
      status: "applied",
    })

    return json({ state: updated, scene })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to apply scene" }, 500)
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; sceneId: string }> }
): Promise<Response> {
  const { id, sceneId } = await ctx.params
  const auth = await requireEventOperatorAccess(id)
  if (auth instanceof Response) return auth
  const body = await req.json().catch((): null => null)
  const name = String(body?.name || "").trim().slice(0, 120)
  if (!name) return json({ error: "Scene name is required" }, 400)

  const { data, error } = await supabaseAdmin
    .from("event_live_scenes")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", sceneId)
    .eq("event_id", id)
    .select("*")
    .maybeSingle()
  if (error) return json({ error: error.message }, 500)
  if (!data) return json({ error: "Scene not found" }, 404)
  return json({ scene: data })
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; sceneId: string }> }
): Promise<Response> {
  const { id, sceneId } = await ctx.params
  const auth = await requireEventOperatorAccess(id)
  if (auth instanceof Response) return auth

  const { error, count } = await supabaseAdmin
    .from("event_live_scenes")
    .delete({ count: "exact" })
    .eq("id", sceneId)
    .eq("event_id", id)
  if (error) return json({ error: error.message }, 500)
  if (!count) return json({ error: "Scene not found" }, 404)
  return json({ ok: true })
}
