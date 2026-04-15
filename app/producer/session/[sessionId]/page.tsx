import crypto from "crypto"
import { AccessToken } from "livekit-server-sdk"
import { supabaseAdmin } from "@/lib/supabase/admin"
import ProducerRoomClient from "@/components/live/ProducerRoomClient"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function ProducerSessionPage(props: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await props.params

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("event_sessions")
    .select("id,event_id,title,live_room_name")
    .eq("id", sessionId)
    .maybeSingle()

  if (sessionError) {
    throw new Error(sessionError.message)
  }

  if (!session?.id) {
    throw new Error("Session not found")
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,slug")
    .eq("id", session.event_id)
    .maybeSingle()

  if (eventError) {
    throw new Error(eventError.message)
  }

  if (!event?.slug) {
    throw new Error("Event slug not found")
  }

  const wsUrl = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!wsUrl || !apiKey || !apiSecret) {
    throw new Error("Missing LiveKit environment variables")
  }

  const roomName =
    session.live_room_name?.trim() ||
    `event-${session.event_id}-session-${session.id}`

  const token = new AccessToken(apiKey, apiSecret, {
    identity: `producer-${crypto.randomUUID()}`,
    name: "Producer",
    ttl: "4h",
  })

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  })

  return (
    <ProducerRoomClient
      token={await token.toJwt()}
      serverUrl={wsUrl}
      stageEndpoint={`/api/events/${event.slug}/sessions/${session.id}/stage`}
      sessionId={session.id}
    />
  )
}