import { NextResponse } from "next/server"
import { getEventBySlug } from "@/lib/events"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import {
  getStageState,
  upsertPreviewStageState,
} from "@/lib/app/sessionStageState"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
): Promise<Response> {
  try {
    const { slug, id } = await ctx.params

    const event = await getEventBySlug(slug)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const session = await getSessionById(event.id, id)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const state = await getStageState(session.id)

    return NextResponse.json({
      state: {
        session_id: state.session_id,
        layout: state.program_layout || "solo",
        stage_participant_ids: state.program_stage_participant_ids || [],
        primary_participant_id: state.program_primary_participant_id || null,
        preview_layout: state.preview_layout,
        preview_stage_participant_ids: state.preview_stage_participant_ids,
        preview_primary_participant_id: state.preview_primary_participant_id,
        program_layout: state.program_layout,
        program_stage_participant_ids: state.program_stage_participant_ids,
        program_primary_participant_id: state.program_primary_participant_id,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load stage state",
      },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
): Promise<Response> {
  try {
    const { slug, id } = await ctx.params
    const body = (await req.json().catch((): null => null)) as
      | {
          layout?: "solo" | "grid" | "screen_speaker"
          stage_participant_ids?: string[]
          primary_participant_id?: string | null
        }
      | null

    const event = await getEventBySlug(slug)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const session = await getSessionById(event.id, id)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    await upsertPreviewStageState({
      session_id: session.id,
      preview_layout: body?.layout ?? "solo",
      preview_stage_participant_ids: Array.isArray(body?.stage_participant_ids)
        ? body!.stage_participant_ids.filter((v): v is string => typeof v === "string")
        : [],
      preview_primary_participant_id:
        typeof body?.primary_participant_id === "string"
          ? body.primary_participant_id
          : null,
    })

    const state = await getStageState(session.id)

    return NextResponse.json({
      ok: true,
      state: {
        session_id: state.session_id,
        layout: state.program_layout || "solo",
        stage_participant_ids: state.program_stage_participant_ids || [],
        primary_participant_id: state.program_primary_participant_id || null,
        preview_layout: state.preview_layout,
        preview_stage_participant_ids: state.preview_stage_participant_ids,
        preview_primary_participant_id: state.preview_primary_participant_id,
        program_layout: state.program_layout,
        program_stage_participant_ids: state.program_stage_participant_ids,
        program_primary_participant_id: state.program_primary_participant_id,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save preview stage state",
      },
      { status: 500 }
    )
  }
}