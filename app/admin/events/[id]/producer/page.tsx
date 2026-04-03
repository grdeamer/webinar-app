import { supabaseAdmin } from "@/lib/supabase/admin"
import ProducerRoomClient from "./ProducerRoomClient"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export default async function ProducerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let eventId = id

  if (!isUuid(id)) {
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("slug", id)
      .maybeSingle()

    if (error || !event?.id) {
      return (
        <div className="min-h-screen bg-black p-8 text-white">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <h1 className="text-xl font-semibold">Producer room not found</h1>
            <p className="mt-2 text-sm text-white/70">
              Could not resolve this event from the URL.
            </p>
            <div className="mt-3 text-xs text-white/50">Input: {id}</div>
          </div>
        </div>
      )
    }

    eventId = event.id
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <ProducerRoomClient eventId={eventId} sessionId="legacy-producer" />
    </div>
  )
}