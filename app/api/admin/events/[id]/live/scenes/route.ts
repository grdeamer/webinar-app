import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventLiveStageState } from "@/lib/live/stageState"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id)
  if (auth instanceof Response) return auth

  try {
    const { data, error } = await supabaseAdmin
      .from("event_live_scenes")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false })

    if (error) throw new Error(error.message)

    return json({ scenes: data || [] })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to load scenes" }, 500)
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id)
  if (auth instanceof Response) return auth
  const body = await req.json().catch((): null => null)

  const name = String(body?.name || "").trim().slice(0, 120)
  const sceneId = body?.sceneId ? String(body.sceneId) : null
  const previewBlocks = Array.isArray(body?.previewBlocks)
    ? body.previewBlocks.slice(0, 200)
    : []
  const serializedBlocks = JSON.stringify(previewBlocks)
  if (serializedBlocks.length > 2_000_000) {
    return json({ error: "Scene composition is too large" }, 413)
  }
  if (!name) {
    return json({ error: "Scene name is required" }, 400)
  }

  try {
    const state = await getEventLiveStageState(id)

    if (!state) {
      return json({ error: "No stage state found to save" }, 400)
    }

    const sceneJson = {
      layout: state.layout,
      stage_participant_ids: state.stage_participant_ids,
      primary_participant_id: state.primary_participant_id,
      pinned_participant_id: state.pinned_participant_id,
      screen_share_participant_id: state.screen_share_participant_id,
      screen_share_track_id: state.screen_share_track_id,
      preview_blocks: previewBlocks,
      screen_layout_preset: String(body?.screenLayoutPreset || "classic").slice(0, 40),
      thumbnail_url: body?.thumbnailUrl ? String(body.thumbnailUrl).slice(0, 2_000_000) : null,
    }

    const payload = {
        event_id: id,
        name,
        layout: state.layout,
        scene_json: sceneJson,
        is_default: false,
        created_by: auth.user.email ?? auth.user.id,
        updated_at: new Date().toISOString(),
      }

    let query = sceneId
      ? supabaseAdmin
          .from("event_live_scenes")
          .update(payload)
          .eq("id", sceneId)
          .eq("event_id", id)
      : supabaseAdmin.from("event_live_scenes").insert(payload)

    const { data, error } = await query
      .select("*")
      .single()

    if (error) throw new Error(error.message)

    return json({ scene: data })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to save scene" }, 500)
  }
}
