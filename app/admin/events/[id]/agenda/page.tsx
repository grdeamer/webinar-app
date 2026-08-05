import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { EventAgendaItem, EventRecord } from "@/lib/types"
import AdminAgendaEditor from "./ui"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AdminEventAgendaPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const { data: event, error: e1 } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .eq("id", id)
    .single<EventRecord>()

  if (e1) throw new Error(e1.message)

  const [agendaResult, liveStateResult] = await Promise.all([
    supabaseAdmin
      .from("event_agenda_items")
      .select(
        "id,event_id,start_at,end_at,title,description,location,track,speaker,sort_index,status,button_text,button_url,is_visible,created_at,updated_at"
      )
      .eq("event_id", id)
      .order("start_at", { ascending: true })
      .order("sort_index", { ascending: true })
      .returns<EventAgendaItem[]>(),
    supabaseAdmin
      .from("event_live_state")
      .select("status")
      .eq("event_id", id)
      .maybeSingle(),
  ])

  if (agendaResult.error) throw new Error(agendaResult.error.message)
  if (liveStateResult.error) throw new Error(liveStateResult.error.message)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40">Event</div>
          <h1 className="text-3xl font-bold">Run of Show</h1>
          <div className="mt-1 text-white/60">Manage the live flow of your event.</div>
          <div className="mt-1 text-sm text-white/40">{event.title}</div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/events/${id}`}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
          >
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
        initialAccessOpen={liveStateResult.data?.status === "open"}
        initialItems={(agendaResult.data || []).map((item) => ({
          ...item,
          created_at: item.created_at ?? "",
          sort_index: item.sort_index ?? 0,
        }))}
      />
    </div>
  )
}
