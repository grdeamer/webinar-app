import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { getEventLiveState, upsertEventLiveState } from "@/lib/app/liveState"
import type { EventLiveMode } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODES: EventLiveMode[] = ["lobby", "general_session", "breakout", "replay", "off_air"]

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id } = await context.params

  try {
    const liveState = await getEventLiveState(id)
    return json({ liveState })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Failed to load live state" },
      400
    )
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const mode = typeof body?.mode === "string" ? (body.mode as EventLiveMode) : null

  if (!mode || !MODES.includes(mode)) {
    return json({ error: "Invalid mode" }, 400)
  }

  try {
    const liveState = await upsertEventLiveState({
      eventId: id,
      mode,
      activeBreakoutId:
        typeof body?.active_breakout_id === "string" ? body.active_breakout_id : null,
      headline: typeof body?.headline === "string" ? body.headline : null,
      message: typeof body?.message === "string" ? body.message : null,
      forceRedirect: !!body?.force_redirect,
      updatedBy: "admin",
    })

    return json({ liveState })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Failed to save live state" },
      400
    )
  }
}