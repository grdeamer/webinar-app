import { NextResponse } from "next/server"
import { getEventBySlug } from "@/lib/events"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import {
  getStageState,
  takeProgramLive,
  type StageTransitionType,
} from "@/lib/app/sessionStageState"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
): Promise<Response> {
  try {
    const { slug, id } = await ctx.params
    const body = (await req.json().catch((): null => null)) as
      | {
          transition_type?: StageTransitionType
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

    const transitionType: StageTransitionType =
      body?.transition_type === "fade" || body?.transition_type === "dip_to_black"
        ? body.transition_type
        : "cut"

    await takeProgramLive({
      sessionId: session.id,
      transitionType,
    })

    const state = await getStageState(session.id)

    return NextResponse.json({
      ok: true,
      state: {
        session_id: state.session_id,
        preview_layout: state.preview_layout,
        preview_stage_participant_ids: state.preview_stage_participant_ids,
        preview_primary_participant_id: state.preview_primary_participant_id,
        program_layout: state.program_layout,
        program_stage_participant_ids: state.program_stage_participant_ids,
        program_primary_participant_id: state.program_primary_participant_id,
        transition_type: state.transition_type,
        transition_started_at: state.transition_started_at,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to take program live",
      },
      { status: 500 }
    )
  }
}