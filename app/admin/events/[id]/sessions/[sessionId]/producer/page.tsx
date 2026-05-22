import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import ProducerRoomClient from "@/app/admin/events/[id]/producer/ProducerRoomClient"

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
      .select("id, slug")
      .eq("slug", id)
      .maybeSingle()

    if (!event?.id) notFound()

    eventId = event.id
    eventSlug = event.slug
  } else {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, slug")
      .eq("id", id)
      .maybeSingle()

    if (!event?.id) notFound()

    eventSlug = event.slug
  }

  const { data: session } = await supabaseAdmin
    .from("event_sessions")
    .select("id, title, delivery_mode, live_room_name, is_general_session, session_kind")
    .eq("event_id", eventId)
    .eq("id", sessionId)
    .maybeSingle()

  if (!session?.id) {
    notFound()
  }

  const isMainStage =
    !!session.is_general_session || session.session_kind === "general"

  void eventSlug
  void isMainStage

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-slate-950 text-white">
      <ProducerRoomClient eventId={eventId} sessionId={session.id} />
    </div>
  )
}