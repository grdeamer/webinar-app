import { NextResponse } from "next/server"
import { getEventBySlug } from "@/lib/events"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import {
  createSessionStageScene,
  listSessionStageScenes,
} from "@/lib/app/sessionStageScenes"

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

    const scenes = await listSessionStageScenes(session.id)

    return NextResponse.json({ scenes })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load scenes",
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
          name?: string
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

    const scene = await createSessionStageScene({
      session_id: session.id,
      name: body?.name?.trim() || "Untitled Scene",
      layout:
        body?.layout === "grid" || body?.layout === "screen_speaker"
          ? body.layout
          : "solo",
      stage_participant_ids: Array.isArray(body?.stage_participant_ids)
        ? body.stage_participant_ids.filter(
            (value): value is string => typeof value === "string"
          )
        : [],
      primary_participant_id:
        typeof body?.primary_participant_id === "string"
          ? body.primary_participant_id
          : null,
    })

    return NextResponse.json({ ok: true, scene })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save scene",
      },
      { status: 500 }
    )
  }
}