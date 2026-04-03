import { NextResponse } from "next/server"
import { getEventBySlug } from "@/lib/events"
import { getEventLiveState } from "@/lib/app/liveState"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await ctx.params

  try {
    const event = await getEventBySlug(slug)

    if (!event?.id) {
      return json({ error: "Event not found" }, 404)
    }

    const state = await getEventLiveState(String(event.id))

    return json({
      eventId: String(event.id),
      slug,
      state: state || null,
    })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to load live state" }, 500)
  }
}