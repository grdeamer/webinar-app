import { redirect } from "next/navigation"
import Link from "next/link"
import RemoteRefreshListener from "@/components/RemoteRefreshListener"
import EventCountdownCard from "@/components/EventCountdownCard"
import EventScheduleRail from "@/components/EventScheduleRail"
import EventSpeakerCards from "@/components/EventSpeakerCards"
import EventSpeakerSpotlight from "@/components/EventSpeakerSpotlight"
import StagePlayer from "@/components/live/StagePlayer"
import StageTransitionOverlay from "@/components/live/StageTransitionOverlay"
import EventLiveRedirectWatcher from "@/components/live/EventLiveRedirectWatcher"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import EventEmailGate from "./EventEmailGate"
import EventLiveDestinationCard from "@/components/events/EventLiveDestinationCard"
import { getEventBySlug } from "@/lib/events"
import { getEventUserOrNull } from "@/lib/eventAuth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { parseSpeakerCards } from "@/lib/eventExperience"
import { createDefaultEventHomeSections } from "@/lib/page-editor/sectionRegistry"
import { buildEventViewerContext } from "@/lib/services/events/buildEventViewerContext"
import { getEventLiveDestination } from "@/lib/services/events/getEventLiveDestination"
import type { EventBreakoutPreview } from "@/lib/types"
import type { EventPageSection } from "@/lib/page-editor/sectionTypes"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function getBuilderSections(eventId: string): Promise<EventPageSection[]> {
  const { data, error } = await supabaseAdmin
    .from("event_page_sections")
    .select("sections")
    .eq("event_id", eventId)
    .eq("page_key", "event_home")
    .maybeSingle()

  if (error) {
    console.error("Failed to load event home builder sections:", error.message)
    return []
  }

  const sections = data?.sections
  return Array.isArray(sections) ? (sections as EventPageSection[]) : []
}

function formatAgendaRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Schedule coming soon"

  const formatTime = (value?: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return [formatTime(start), formatTime(end)].filter(Boolean).join(" – ")
}

function FeaturedBreakouts({
  slug,
  breakouts,
}: {
  slug: string
  breakouts: Array<{
    id: string
    title: string
    description?: string | null
    join_link?: string | null
    start_at?: string | null
    end_at?: string | null
  }>
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Featured breakouts</h2>
          <p className="mt-1 text-sm text-white/55">
            Quick paths into smaller rooms and side programming.
          </p>
        </div>

        <Link
          href={`/events/${slug}/agenda`}
          className="text-sm text-sky-200 hover:text-sky-100"
        >
          Explore agenda →
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {breakouts.length === 0 ? (
          <div className="md:col-span-3 rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/60">
            Add breakout rooms in the admin panel to populate these homepage tiles.
          </div>
        ) : (
          breakouts.map((item, index) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(2,6,23,0.96))] p-4"
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                Breakout {index + 1}
              </div>

              <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>

              <p className="mt-2 min-h-[72px] text-sm leading-6 text-white/60">
                {item.description ||
                  "Add a short description so attendees know what makes this room special."}
              </p>

              <div className="mt-3 text-xs text-white/45">
                {formatAgendaRange(item.start_at, item.end_at)}
              </div>

              {item.join_link ? (
                <a
                  href={item.join_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                >
                  Open breakout ↗
                </a>
              ) : (
                <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/45">
                  Join link coming soon
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function AgendaSection({
  agenda,
  slug,
}: {
  agenda: Array<{
    id: string
    title?: string | null
    start_at?: string | null
    end_at?: string | null
    track?: string | null
    speaker?: string | null
    description?: string | null
  }>
  slug: string
}) {
  return (
    <EventScheduleRail
      items={(agenda || []).map((item) => ({
        id: item.id,
        title: item.title ?? "Untitled",
        start_at: item.start_at ?? "",
        end_at: item.end_at ?? "",
        track: item.track ?? undefined,
        speaker: item.speaker ?? undefined,
      }))}
      eventSlug={slug}
    />
  )
}

function SessionsList({
  slug,
  sessions,
}: {
  slug: string
  sessions: Array<{
    id?: string
    title?: string | null
    description?: string | null
    webinar_date?: string | null
    speaker?: string | null
    tag?: string | null
    thumbnail_url?: string | null
  }>
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Sessions</h2>
          <p className="mt-1 text-sm text-white/55">
            Featured programming pulled from your event sessions.
          </p>
        </div>

        <Link
          href={`/events/${slug}/agenda`}
          className="text-sm text-sky-200 hover:text-sky-100"
        >
          View full agenda →
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sessions.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/60">
            No sessions found yet. Add sessions in admin to populate this block.
          </div>
        ) : (
          sessions.map((session, index) => (
            <article
              key={session.id ?? `${session.title ?? "session"}-${index}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(2,6,23,0.96))]"
            >
              {session.thumbnail_url ? (
                <img
                  src={session.thumbnail_url}
                  alt={session.title ?? "Session thumbnail"}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-white/5 text-sm text-white/35">
                  Session Preview
                </div>
              )}

              <div className="p-4">
                {session.tag ? (
                  <div className="text-[11px] uppercase tracking-[0.18em] text-sky-200/70">
                    {session.tag}
                  </div>
                ) : null}

                <h3 className="mt-2 text-lg font-semibold text-white">
                  {session.title || "Untitled Session"}
                </h3>

                {session.speaker ? (
                  <div className="mt-2 text-sm text-white/55">{session.speaker}</div>
                ) : null}

                <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/60">
                  {session.description || "Add a session description to improve this card."}
                </p>

                {session.webinar_date ? (
                  <div className="mt-3 text-xs text-white/45">
                    {new Date(session.webinar_date).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default async function EventHomePage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params

  const event = await getEventBySlug(slug)
  const authedUser = await getEventUserOrNull({ slug })
  const viewer = await buildEventViewerContext(slug, event.id)

  const [
    { data: agenda },
    { data: webinarRows },
    { data: breakouts },
    builderSections,
  ] = await Promise.all([
    supabaseAdmin
      .from("event_agenda_items")
      .select("id,title,start_at,end_at,track,speaker,description")
      .eq("event_id", event.id)
      .order("start_at", { ascending: true, nullsFirst: false })
      .limit(6),

    supabaseAdmin
      .from("event_user_webinars")
      .select(
        "webinars:webinar_id(id,title,description,webinar_date,speaker,tag,thumbnail_url,speaker_cards)"
      )
      .eq("event_id", event.id)
      .limit(6),

    supabaseAdmin
      .from("event_breakouts")
      .select("id,title,description,join_link,start_at,end_at")
      .eq("event_id", event.id)
      .order("start_at", { ascending: true, nullsFirst: false })
      .limit(3),

    getBuilderSections(event.id),
  ])

  const sessions = (webinarRows || []).map((row: any) => row.webinars).filter(Boolean)

  const breakoutPreviews: EventBreakoutPreview[] = ((breakouts || []) as any[]).map((item) => ({
    ...item,
    event_id: event.id,
    speaker_name: null,
    speaker_avatar_url: null,
    manual_live: false,
    auto_open: false,
    created_at: item.start_at ?? new Date().toISOString(),
  }))

  void breakoutPreviews
  void authedUser

  const liveDestination = await getEventLiveDestination(slug, event.id, viewer)

  if (
    liveDestination.forceRedirect &&
    (Boolean(liveDestination.sessionId) || liveDestination.href === "/general-session")
  ) {
    redirect(liveDestination.href)
  }

  const featuredSpeakers = parseSpeakerCards(
    ...(agenda || []).map((item: any) => item.speaker),
    ...sessions.map((session: any) => session.speaker_cards),
    ...sessions.map((session: any) => session.speaker)
  ).slice(0, 6)

  const spotlightSpeaker = featuredSpeakers[0] || null
  const nextAgenda =
    (agenda || []).find((item: any) => item?.start_at) || (agenda || [])[0] || null
  const countdownTarget = nextAgenda?.start_at || event.start_at || null

  const resolvedSections =
    builderSections.length > 0
      ? builderSections
      : createDefaultEventHomeSections({
          title: event.title,
          description: event.description,
        })

  const stageIsActive =
    Boolean(liveDestination.sessionId) ||
    liveDestination.href === "/general-session" ||
    liveDestination.href === `/events/${slug}/breakouts`

  const systemComponents = {
    live_state: <EventLiveDestinationCard destination={liveDestination} />,

    stage_player: (
      <>
        <StageTransitionOverlay active={stageIsActive} />
        <StagePlayer slug={slug} />
      </>
    ),

    countdown: (
      <EventCountdownCard
        title={nextAgenda?.title || event.title}
        targetIso={countdownTarget}
        subtitle={nextAgenda ? "Countdown to next session" : "Countdown to event start"}
      />
    ),

    speaker_spotlight: <EventSpeakerSpotlight speaker={spotlightSpeaker} />,

    speaker_cards: <EventSpeakerCards speakers={featuredSpeakers} />,

    agenda: <AgendaSection agenda={agenda || []} slug={slug} />,

    schedule_rail: (
      <EventScheduleRail
        items={(agenda || []).map((item: any) => ({
          id: item.id,
          title: item.title ?? "Untitled",
          start_at: item.start_at ?? "",
          end_at: item.end_at ?? "",
          track: item.track ?? undefined,
          speaker: item.speaker ?? undefined,
        }))}
        eventSlug={slug}
      />
    ),

    sessions_list: <SessionsList slug={slug} sessions={sessions} />,

    access_gate:
      viewer.type !== "guest" ? (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/events/${slug}/lobby`}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100"
          >
            Enter your lobby
          </Link>

          <Link
            href={`/events/${slug}/agenda`}
            className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium hover:bg-white/15"
          >
            View agenda
          </Link>
        </div>
      ) : (
        <div id="event-access" className="space-y-4">
          <EventEmailGate slug={slug} />
        </div>
      ),

    featured_breakouts: <FeaturedBreakouts slug={slug} breakouts={breakouts || []} />,
  }

  return (
    <>
      <RemoteRefreshListener scopeType="event" scopeId={event.id} />
      <EventLiveRedirectWatcher slug={slug} />

      <EventPageRenderer
        event={{
          title: event.title,
          description: event.description,
        }}
        sections={resolvedSections}
        systemComponents={systemComponents}
      />
    </>
  )
}