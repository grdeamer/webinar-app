import { NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"
import { getEventBySlug } from "@/lib/events"
import { getSessionById } from "@/lib/repos/sessionsRepo"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ slug: string; id: string }> }
): Promise<Response> {
  const { slug, id } = await ctx.params

  const wsUrl = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!wsUrl || !apiKey || !apiSecret) {
    return json({ error: "LiveKit environment variables are missing" }, 500)
  }

  const event = await getEventBySlug(slug)
  if (!event) {
    return json({ error: "Event not found" }, 404)
  }

  const session = await getSessionById(event.id, id)
  if (!session) {
    return json({ error: "Session not found" }, 404)
  }

  if (session.deliveryMode !== "livekit") {
    return json({ error: "This session is not configured for LiveKit" }, 400)
  }

  const roomName =
    session.liveRoomName?.trim() || `event-${event.id}-session-${session.id}`

  const identity = `presenter-${crypto.randomUUID()}`
  const displayName = "Presenter Test"

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
    ttl: "1h",
  })

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  })

  return json({
    token: await token.toJwt(),
    wsUrl,
    roomName,
  })
}