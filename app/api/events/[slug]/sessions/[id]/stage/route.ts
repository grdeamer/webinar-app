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

        transition_type: state.transition_type,
        transition_started_at: state.transition_started_at,

        live_moment_type: state.live_moment_type,
        qa_origin_cue_visible: state.qa_origin_cue_visible,
        qa_origin_region: state.qa_origin_region,
        qa_origin_moon_mode: state.qa_origin_moon_mode,
        qa_origin_question_label: state.qa_origin_question_label,
        qa_origin_treatment: state.qa_origin_treatment,
        qa_origin_lat: state.qa_origin_lat,
        qa_origin_lng: state.qa_origin_lng,
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

          live_moment_type?: "audience_origin" | null
          qa_origin_cue_visible?: boolean
          qa_origin_region?: string | null
          qa_origin_moon_mode?: boolean
          qa_origin_question_label?: string | null
          qa_origin_treatment?: "default" | "qa_origin_blend" | null
          qa_origin_lat?: number | null
          qa_origin_lng?: number | null
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
        ? body.stage_participant_ids.filter((v): v is string => typeof v === "string")
        : [],
      preview_primary_participant_id:
        typeof body?.primary_participant_id === "string"
          ? body.primary_participant_id
          : null,

      live_moment_type: body?.live_moment_type,
      qa_origin_cue_visible: body?.qa_origin_cue_visible,
      qa_origin_region: body?.qa_origin_region,
      qa_origin_moon_mode: body?.qa_origin_moon_mode,
      qa_origin_question_label: body?.qa_origin_question_label,
      qa_origin_treatment: body?.qa_origin_treatment,
      qa_origin_lat:
        typeof body?.qa_origin_lat === "number" ? body.qa_origin_lat : null,
      qa_origin_lng:
        typeof body?.qa_origin_lng === "number" ? body.qa_origin_lng : null,
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

        transition_type: state.transition_type,
        transition_started_at: state.transition_started_at,

        live_moment_type: state.live_moment_type,
        qa_origin_cue_visible: state.qa_origin_cue_visible,
        qa_origin_region: state.qa_origin_region,
        qa_origin_moon_mode: state.qa_origin_moon_mode,
        qa_origin_question_label: state.qa_origin_question_label,
        qa_origin_treatment: state.qa_origin_treatment,
        qa_origin_lat: state.qa_origin_lat,
        qa_origin_lng: state.qa_origin_lng,
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