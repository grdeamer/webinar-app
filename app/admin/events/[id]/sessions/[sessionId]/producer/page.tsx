import { notFound } from "next/navigation"
import { AccessToken } from "livekit-server-sdk"
import { supabaseAdmin } from "@/lib/supabase/admin"
import ProducerRoomClient from "@/components/live/ProducerRoomClient"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export default async function AdminSessionProducerPage(props: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await props.params

  let eventId = id
  let eventSlug = id

  if (!isUuid(id)) {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id,slug")
      .eq("slug", id)
      .maybeSingle()

    if (!event?.id) notFound()

    eventId = event.id
    eventSlug = event.slug
  } else {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id,slug")
      .eq("id", id)
      .maybeSingle()

    if (!event?.id) notFound()

    eventSlug = event.slug
  }

  const { data: session } = await supabaseAdmin
    .from("event_sessions")
    .select("id,title,delivery_mode,live_room_name")
    .eq("event_id", eventId)
    .eq("id", sessionId)
    .maybeSingle()

  if (!session?.id) {
    notFound()
  }

  if (session.delivery_mode !== "livekit") {
    throw new Error("This session is not configured for LiveKit")
  }

  const wsUrl = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!wsUrl || !apiKey || !apiSecret) {
    throw new Error("Missing LiveKit environment variables")
  }

  const roomName =
    session.live_room_name?.trim() || `event-${eventId}-session-${session.id}`

  const token = new AccessToken(apiKey, apiSecret, {
    identity: `producer-${crypto.randomUUID()}`,
    name: "Producer",
    ttl: "4h",
  })

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  })

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Producer Room
          </div>
          <h1 className="mt-2 text-3xl font-semibold">{session.title}</h1>
          <p className="mt-2 text-sm text-white/60">
            Choose who appears on stage for attendees.
          </p>
        </div>

        <ProducerRoomClient
          token={await token.toJwt()}
          serverUrl={wsUrl}
          stageEndpoint={`/api/events/${eventSlug}/sessions/${session.id}/stage`}
        />
      </div>
    </div>
  )
}