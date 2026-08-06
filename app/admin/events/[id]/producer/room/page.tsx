import Link from "next/link"
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

export default async function AdminProducerRoomPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  let eventId = id
  if (!isUuid(id)) {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, slug")
      .eq("slug", id)
      .maybeSingle()

    if (!event?.id) notFound()

    eventId = event.id
  } else {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id, slug")
      .eq("id", id)
      .maybeSingle()

    if (!event?.id) notFound()
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
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/60">
            Producer Room Setup
          </div>
          <h1 className="mt-3 text-3xl font-semibold">Add a Main Stage session first</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            The switcher needs one session marked as the general session or Main Stage. Create it in Sessions, then return here.
          </p>
          <Link
            href={`/admin/events/${eventId}/sessions`}
            className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Open Sessions
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 py-8 text-white">
      <div className="w-full space-y-6">
        <div className="px-6">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Producer Room
          </div>
          <h1 className="mt-2 text-3xl font-semibold">{session.title}</h1>
          <p className="mt-2 text-sm text-white/60">
            Choose who appears on stage for attendees.
          </p>
        </div>

        <ProducerRoomClient eventId={eventId} sessionId={session.id} />
      </div>
    </div>
  )
}
