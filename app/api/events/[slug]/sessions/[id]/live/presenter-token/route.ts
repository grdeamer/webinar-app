import { NextResponse } from "next/server"
import { AccessToken, TrackSource } from "livekit-server-sdk"
import { getEventBySlug } from "@/lib/events"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import { buildEventRoomName } from "@/lib/live/config"
import {
  presenterAssignmentIsActive,
  verifyPresenterAccessToken,
} from "@/lib/presenterAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(
  req: Request,
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

  const requestUrl = new URL(req.url)
  const accessToken = requestUrl.searchParams.get("access")
  const monitorOnly = requestUrl.searchParams.get("mode") === "monitor"
  const presenterAccess = verifyPresenterAccessToken(accessToken)
  if (
    !presenterAccess ||
    presenterAccess.eventId !== String(event.id) ||
    presenterAccess.sessionId !== String(session.id) ||
    !(await presenterAssignmentIsActive(presenterAccess))
  ) {
    return json({ error: "Presenter access is invalid or has expired" }, 403)
  }

  const roomName = buildEventRoomName(String(event.id))

  const identity = `${monitorOnly ? "presenter-monitor" : "presenter"}-${presenterAccess.presenterId}-${crypto.randomUUID()}`
  const displayName = presenterAccess.name || presenterAccess.email

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
    metadata: JSON.stringify({
      role: "presenter",
      eventId: String(event.id),
      sessionId: String(session.id),
    }),
    ttl: "1h",
  })

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: !monitorOnly,
    ...(monitorOnly
      ? {}
      : {
          canPublishSources: [
            TrackSource.CAMERA,
            TrackSource.MICROPHONE,
            TrackSource.SCREEN_SHARE,
            TrackSource.SCREEN_SHARE_AUDIO,
          ],
        }),
    canPublishData: false,
    canSubscribe: true,
    canUpdateOwnMetadata: false,
  })

  return json({
    token: await token.toJwt(),
    wsUrl,
    roomName,
  })
}
