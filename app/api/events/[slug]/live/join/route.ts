import { NextResponse } from "next/server"
import { createLiveKitToken } from "@/lib/live/livekit/token"
import { ensureEventLiveRoom } from "@/lib/live/stageState"
import { getEventBySlug } from "@/lib/events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params

  try {
    const event = await getEventBySlug(slug)

    if (!event?.id) {
      return json({ error: "Event not found" }, 404)
    }

    const room = await ensureEventLiveRoom({ eventId: String(event.id) })

    const identity = `guest_${crypto.randomUUID()}`

    const token = await createLiveKitToken({
      roomName: room.room_name,
      identity,
      name: "Guest",
      role: "guest",
      metadata: {
        eventId: String(event.id),
        slug,
      },
    })

    return json(token)
  } catch (err: any) {
    return json({ error: err?.message || "Failed to create join token" }, 500)
  }
}