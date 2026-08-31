import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import ProducerRoomClient from "@/app/admin/events/[id]/producer/ProducerRoomClient"
import ProducerRoomSetup from "./ProducerRoomSetup"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export default async function AdminProducerRoomPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  let eventId = id
  let eventTitle = "Event"
  let eventAccent = "blue"
  if (!isUuid(id)) {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, slug, title, accent_color")
      .eq("slug", id)
      .maybeSingle()

    if (!event?.id) notFound()

    eventId = event.id
    eventTitle = event.title || eventTitle
    eventAccent = event.accent_color || eventAccent
  } else {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, slug, title, accent_color")
      .eq("id", id)
      .maybeSingle()

    if (!event?.id) notFound()
    eventTitle = event.title || eventTitle
    eventAccent = event.accent_color || eventAccent
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("event_sessions")
    .select("id, title, delivery_mode, live_room_name, is_general_session, session_kind, sort_order")
    .eq("event_id", eventId)
    .or("is_general_session.eq.true,session_kind.eq.general")
    .order("is_general_session", { ascending: false })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (sessionError) throw new Error(sessionError.message)

  if (!session?.id) {
    return <ProducerRoomSetup eventId={eventId} />
  }

  return (
    <ProducerRoomClient
      eventId={eventId}
      sessionId={session.id}
      sessionTitle={session.title}
      eventTitle={eventTitle}
      eventAccent={eventAccent}
    />
  )
}
