import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { EventAgendaItem, EventRecord } from "@/lib/types"
import AdminAgendaEditor from "./ui"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AdminEventAgendaPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  const { data: event, error: e1 } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .eq("id", id)
    .single<EventRecord>()

  if (e1) throw new Error(e1.message)

  const { data, error } = await supabaseAdmin
    .from("event_agenda_items")
    .select(
      "id,event_id,start_at,end_at,title,description,location,track,speaker,sort_index,created_at"
    )
    .eq("event_id", id)
    .order("start_at", { ascending: true })
    .order("sort_index", { ascending: true })
    .returns<EventAgendaItem[]>()

  if (error) throw new Error(error.message)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40">Event</div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <div className="mt-1 text-white/60">{event.title}</div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/events/${id}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10">
            Back
          </Link>
          <a
            href={`/events/${event.slug}/agenda`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
          >
            View Agenda →
          </a>
        </div>
      </div>

      <AdminAgendaEditor
  eventId={id}
  eventSlug={event.slug}
  initialItems={(data || []).map((item) => ({
    ...item,
    created_at: item.created_at ?? "",
  }))}
/>
    </div>
  )
}
