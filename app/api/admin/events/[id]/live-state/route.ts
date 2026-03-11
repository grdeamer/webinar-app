import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { getEventLiveState, upsertEventLiveState } from "@/lib/app/liveState"
import type { EventLiveMode } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODES: EventLiveMode[] = ["lobby", "general_session", "breakout", "replay", "off_air"]

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const { id } = await context.params

  try {
    const liveState = await getEventLiveState(id)
    return NextResponse.json({ liveState })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load live state" },
      { status: 400 }
    )
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const mode = typeof body?.mode === "string" ? (body.mode as EventLiveMode) : null

  if (!mode || !MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
  }

  try {
    const liveState = await upsertEventLiveState({
      eventId: id,
      mode,
      activeBreakoutId: typeof body?.active_breakout_id === "string" ? body.active_breakout_id : null,
      headline: typeof body?.headline === "string" ? body.headline : null,
      message: typeof body?.message === "string" ? body.message : null,
      forceRedirect: !!body?.force_redirect,
      updatedBy: "admin",
    })

    return NextResponse.json({ liveState })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save live state" },
      { status: 400 }
    )
  }
}
