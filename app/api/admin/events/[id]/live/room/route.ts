import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { ensureEventLiveRoom, getEventLiveRoom } from "@/lib/live/stageState"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const { id } = await ctx.params

  try {
    const room = await getEventLiveRoom(id)
    return json({ room })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to load live room" }, 500)
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))

  try {
    const room = await ensureEventLiveRoom({
      eventId: id,
      audienceMode: body?.audience_mode || "embedded",
      enabled: body?.enabled ?? true,
    })

    return json({ room })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to save live room" }, 500)
  }
}