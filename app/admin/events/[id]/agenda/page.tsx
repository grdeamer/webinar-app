import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { EventAgendaItem, EventRecord } from "@/lib/types"
import { Button } from "@/components/ui/button"
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
        "id,event_id,start_at,end_at,title,description,location,track,speaker,speaker_title,speaker_bio,speaker_photo_url,speakers,show_session_details,show_speaker_photo,resources,show_resources,icon_key,sort_index,status,button_text,button_url,is_visible,created_at,updated_at"
      )
      .eq("event_id", id)
      .order("start_at", { ascending: true })
      .order("sort_index", { ascending: true })
      .returns<EventAgendaItem[]>(),
    supabaseAdmin
      .from("event_live_state")
      .select("status,survey_url,show_survey")
      .eq("event_id", id)
      .maybeSingle(),
  ])

  if (agendaResult.error) throw new Error(agendaResult.error.message)
  if (liveStateResult.error) throw new Error(liveStateResult.error.message)

  return (
    <main className="event-editorial-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="editorial-eyebrow">Live operations &nbsp;/&nbsp; Run of Show</div>
          <h1 className="mt-6 text-5xl font-semibold tracking-[-.045em]">Direct the day.</h1>
          <div className="mt-2 max-w-xl text-white/60">A broadcast rundown with one clear moment at a time.</div>
          <div className="mt-2 text-sm font-medium text-cyan-100/55">{event.title}</div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="jupiterSecondary" size="lg">
            <Link href={`/admin/events/${id}`}>Back to event</Link>
          </Button>

          <Button asChild variant="jupiterPrimary" size="lg">
            <a href={`/events/${event.slug}/agenda`} target="_blank" rel="noreferrer">View attendee agenda →</a>
          </Button>
        </div>
      </div>

      <AdminAgendaEditor
        eventId={id}
        eventSlug={event.slug}
        initialAccessOpen={liveStateResult.data?.status === "open"}
        initialSurveyUrl={liveStateResult.data?.survey_url || ""}
        initialShowSurvey={liveStateResult.data?.show_survey === true}
        initialItems={(agendaResult.data || []).map((item) => ({
          ...item,
          created_at: item.created_at ?? "",
          sort_index: item.sort_index ?? 0,
        }))}
      />
    </main>
  )
}
