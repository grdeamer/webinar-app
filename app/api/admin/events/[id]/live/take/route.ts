import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  ensureEventLiveProgramState,
  updateEventLiveProgramState,
} from "@/lib/live/state"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    }

    const { data: preview, error } = await supabaseAdmin
      .from("event_live_stage_state")
      .select("*")
      .eq("event_id", id)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to load preview state" },
        { status: 500 }
      )
    }

    if (!preview) {
      return NextResponse.json(
        { error: "No preview state found" },
        { status: 404 }
      )
    }

    await ensureEventLiveProgramState(id)

    const program = await updateEventLiveProgramState(id, {
      layout: preview.layout,
      stage_participant_ids: preview.stage_participant_ids ?? [],
      primary_participant_id: preview.primary_participant_id ?? null,
      pinned_participant_id: preview.pinned_participant_id ?? null,
      screen_share_participant_id: preview.screen_share_participant_id ?? null,
      screen_share_track_id: preview.screen_share_track_id ?? null,
      is_live: Boolean(preview.is_live),
    })

    return NextResponse.json({
      ok: true,
      state: program,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to take program live" },
      { status: 500 }
    )
  }
}