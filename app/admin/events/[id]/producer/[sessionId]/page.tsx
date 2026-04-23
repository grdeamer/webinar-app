import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import ProducerRoomClient from "../ProducerRoomClient"
import { getSessionLiveContext } from "@/lib/services/sessions/getSessionLiveContext"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

async function resolveEventId(input: string) {
  if (isUuid(input)) return input

  const { data: event, error } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("slug", input)
    .maybeSingle()

  if (error || !event?.id) return null
  return event.id
}

function UnsupportedProducerPanel({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-white/70">{body}</p>
      </div>
    </div>
  )
}

export default async function ProducerSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params

  const eventId = await resolveEventId(id)
  if (!eventId) notFound()

  const liveContext = await getSessionLiveContext(eventId, sessionId)
  if (!liveContext) notFound()

  if (liveContext.deliveryMode !== "livekit" || !liveContext.liveRoomName) {
    return (
      <UnsupportedProducerPanel
        title="Producer room unavailable"
        body="This session is not configured as a LiveKit session, so the producer room cannot open for it."
      />
    )
  }

  return <ProducerRoomClient eventId={eventId} sessionId={sessionId} />
}