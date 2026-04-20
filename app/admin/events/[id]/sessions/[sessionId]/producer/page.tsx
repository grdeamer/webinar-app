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

  return (
    <div className="min-h-screen bg-slate-950 py-8 text-white">
      <div className="w-full space-y-6">
        <div className="px-6">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            {isMainStage ? "Main Stage Producer Room" : "Session Producer Room"}
          </div>

          <h1 className="mt-2 text-3xl font-semibold">{session.title}</h1>

          <p className="mt-2 text-sm text-white/60">
            {isMainStage
              ? "Control the main stage session for attendees."
              : "Choose who appears on stage for this session."}
          </p>

          <div className="mt-3 text-xs text-white/35">
            Event: {eventSlug}
          </div>
        </div>

        <ProducerRoomClient eventId={eventId} sessionId={session.id} />
      </div>
    </div>
  )
}