import type { ReactNode } from "react"
import Link from "next/link"
import { getEventBySlug } from "@/lib/events"
import { getEventUserOrNull } from "@/lib/eventAuth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import EventEmailGate from "./EventEmailGate"
import EventSpeakerCards from "@/components/EventSpeakerCards"
import EventCountdownCard from "@/components/EventCountdownCard"
import EventScheduleRail from "@/components/EventScheduleRail"
import EventSpeakerSpotlight from "@/components/EventSpeakerSpotlight"
import { parseSpeakerCards } from "@/lib/eventExperience"
import RemoteRefreshListener from "@/components/RemoteRefreshListener"
import { getEventLiveDestination, getEventLiveState } from "@/lib/app/liveState"
import type { EventBreakoutPreview, EventLiveDestination, EventLiveStateRecord } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function EventHomePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)
  const authed = await getEventUserOrNull({ slug })

  const [{ data: agenda }, { data: sponsors }, { data: webinarRows }, { data: breakouts }, liveState] = await Promise.all([
    supabaseAdmin
      .from("event_agenda_items")
      .select("id,title,start_at,end_at,track,speaker,description")
      .eq("event_id", event.id)
      .order("start_at", { ascending: true, nullsFirst: false })
      .limit(6),
    supabaseAdmin
      .from("event_sponsors")
      .select("id,name,description,logo_url,website_url,tier,sort_index")
      .eq("event_id", event.id)
      .order("sort_index", { ascending: true })
      .limit(8),
    supabaseAdmin
      .from("event_user_webinars")
      .select("webinars:webinar_id(id,title,description,webinar_date,speaker,tag,thumbnail_url,speaker_cards)")
      .eq("event_id", event.id)
      .limit(6),
    supabaseAdmin
      .from("event_breakouts")
      .select("id,title,description,join_link,start_at,end_at")
      .eq("event_id", event.id)
      .order("start_at", { ascending: true, nullsFirst: false })
      .limit(3),
    getEventLiveState(event.id),
  ])

  const sessions = (webinarRows || []).map((row: any) => row.webinars).filter(Boolean)
  const liveDestination = getEventLiveDestination({
  slug,
  liveState,
  breakouts: (((breakouts as EventBreakoutPreview[] | null) || []).map(
    (item): any => ({
      ...item,
      event_id: event.id,
      speaker_name: null as string | null,
      speaker_avatar_url: null as string | null,
      manual_live: false,
      auto_open: false,
      created_at: item.start_at ?? new Date().toISOString(),
    })
  )),
})
 
  const featuredSpeakers = parseSpeakerCards(
    ...(agenda || []).map((item: any) => item.speaker),
    ...sessions.map((session: any) => session.speaker_cards),
    ...sessions.map((session: any) => session.speaker)
  ).slice(0, 6)

  const spotlightSpeaker = featuredSpeakers[0] || null
  const nextAgenda = (agenda || []).find((item: any) => item?.start_at) || (agenda || [])[0] || null
  const countdownTarget = nextAgenda?.start_at || event.start_at || null

  return (
    <div className="space-y-6">
      <RemoteRefreshListener scopeType="event" scopeId={event.id} />
      <section className="rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5 shadow-xl shadow-black/20">
        <LiveStateCard liveState={liveState} destination={liveDestination} />
      </section>

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_24%),linear-gradient(135deg,rgba(2,6,23,1),rgba(15,23,42,0.96),rgba(30,41,59,0.94))] p-6 shadow-2xl shadow-black/30 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
              Powered by Jupiter.events
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight lg:text-5xl">{event.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">
              {event.description ||
                "Welcome to your Jupiter event experience. Explore the schedule, speakers, sponsors, and live sessions from one polished event hub."}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/65">
              <Badge>{formatEventWindow(event.start_at, event.end_at)}</Badge>
              <Badge>{agenda?.length || 0} agenda item{agenda?.length === 1 ? "" : "s"}</Badge>
              <Badge>{sponsors?.length || 0} sponsor{(sponsors?.length || 0) === 1 ? "" : "s"}</Badge>
              <Badge>{breakouts?.length || 0} featured breakout{(breakouts?.length || 0) === 1 ? "" : "s"}</Badge>
              {authed ? <Badge>Signed in as {(authed.user as any).email}</Badge> : <Badge>"Jupiter guest preview"</Badge>}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {authed ? (
                <Link href={`/events/${slug}/lobby`} className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
                  Enter your lobby
                </Link>
              ) : (
                <a href="#event-access" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">
                  Get event access
                </a>
              )}
              <Link href={`/events/${slug}/agenda`} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium hover:bg-white/15">
                View agenda
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-white/40">Spotlight</div>
              <div className="mt-3 text-2xl font-semibold">{nextAgenda?.title || "Your headline session goes here"}</div>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {nextAgenda?.speaker ? `Featuring ${nextAgenda.speaker}. ` : "Use this area as your polished homepage headline. "}
                {nextAgenda
                  ? formatAgendaRange(nextAgenda.start_at, nextAgenda.end_at)
                  : "Add agenda items to give attendees an immediate sense of what is coming next."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric label="Sessions" value={String(sessions.length)} />
              <Metric label="Sponsors" value={String(sponsors?.length || 0)} />
              <Metric label="Live areas" value="5" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <EventCountdownCard
  title={nextAgenda?.title || event.title}
  targetIso={countdownTarget}
  subtitle={nextAgenda ? "Countdown to next session" : "Countdown to event start"}
/>

        <EventSpeakerSpotlight speaker={spotlightSpeaker} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Featured breakouts</h2>
                <p className="mt-1 text-sm text-white/55">Give attendees quick paths into smaller rooms and side programming.</p>
              </div>
              <Link href={`/events/${slug}/agenda`} className="text-sm text-sky-200 hover:text-sky-100">
                Explore agenda →
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {(breakouts || []).length === 0 ? (
                <div className="md:col-span-3 rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/60">
                  Add breakout rooms in the admin panel to populate these homepage tiles.
                </div>
              ) : (
                (breakouts || []).map((item: any, index: number) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(2,6,23,0.96))] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Breakout {index + 1}</div>
                    <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 min-h-[72px] text-sm leading-6 text-white/60">{item.description || "Add a short description so attendees know what makes this room special."}</p>
                    <div className="mt-3 text-xs text-white/45">{formatAgendaRange(item.start_at, item.end_at)}</div>
                    {item.join_link ? (
                      <a href={item.join_link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
                        Open breakout ↗
                      </a>
                    ) : (
                      <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/45">Join link coming soon</div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Featured schedule</h2>
                <p className="mt-1 text-sm text-white/55">A homepage-style preview of what attendees should check first.</p>
              </div>
              <Link href={`/events/${slug}/agenda`} className="text-sm text-sky-200 hover:text-sky-100">
                Full agenda →
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {(agenda || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/60">
                  No agenda items have been added yet.
                </div>
              ) : (
                (agenda || []).map((item: any, index: number) => (
                  <article key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium text-sky-200">
                            {index === 0 ? "Next up" : "Agenda"}
                          </span>
                          {item.track ? <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/55">{item.track}</span> : null}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/60">{item.description || "Add a short summary in admin so attendees know why to click in."}</p>
                        {item.speaker ? <div className="mt-3 text-sm text-white/55">Speaker: {item.speaker}</div> : null}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                        {formatAgendaRange(item.start_at, item.end_at)}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>

        <EventScheduleRail items={(agenda || []).map((item: any) => ({ id: item.id, title: item.title, start_at: item.start_at, end_at: item.end_at, track: item.track, speaker: item.speaker }))} eventSlug={slug} />
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Sponsors</h2>
            <p className="mt-1 text-sm text-white/55">A branded carousel strip for homepage credibility and partner visibility.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/45">
            {(sponsors || []).length} partner{(sponsors || []).length === 1 ? "" : "s"}
          </span>
        </div>

        {(sponsors || []).length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-white/60">
            Add event sponsors to light up this carousel with logo cards and outbound links.
          </div>
        ) : (
          <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
            {(sponsors || []).map((sponsor: any) => (
              <a
                key={sponsor.id}
                href={sponsor.website_url || "#"}
                target={sponsor.website_url ? "_blank" : undefined}
                rel={sponsor.website_url ? "noopener noreferrer" : undefined}
                className="min-w-[240px] flex-1 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-4 hover:bg-white/10"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                    {sponsor.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sponsor.logo_url} alt={sponsor.name} className="h-full w-full object-contain p-2" />
                    ) : (
                      <span className="text-lg font-semibold text-white/70">{initials(sponsor.name)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-white/45">{sponsor.tier || "Sponsor"}</div>
                    <div className="mt-1 truncate text-base font-semibold text-white">{sponsor.name}</div>
                    <p className="mt-2 text-sm leading-6 text-white/58">{sponsor.description || "Partner branding appears here."}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <EventSpeakerCards speakers={featuredSpeakers} title="Speaker lineup" />

      {!authed ? (
        <div id="event-access">
          <EventEmailGate slug={slug} eventTitle={event.title} />
        </div>
      ) : null}
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2">{children}</div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

function formatEventWindow(start: string | null, end: string | null) {
  if (!start && !end) return "Dates to be announced"
  if (start && end) return `${new Date(start).toLocaleDateString()} – ${new Date(end).toLocaleDateString()}`
  return start ? new Date(start).toLocaleDateString() : new Date(end as string).toLocaleDateString()
}

function formatAgendaRange(start: string | null, end: string | null) {
  if (!start) return "Time TBD"
  const s = new Date(start)
  const startLabel = s.toLocaleString()
  if (!end) return startLabel
  const e = new Date(end)
  return `${startLabel} – ${e.toLocaleTimeString()}`
}

function LiveStateCard({
  liveState,
  destination,
}: {
  liveState: EventLiveStateRecord | null
  destination: EventLiveDestination
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Live routing</div>
        <div className="mt-2 text-xl font-semibold text-white">{destination.label}</div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">{destination.description}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/65">
        <div>Mode: <span className="text-white">{liveState?.mode || "lobby"}</span></div>
        <div className="mt-1">Destination: <span className="text-emerald-200">{destination.href}</span></div>
        <div className="mt-1">Redirect: <span className="text-white">{liveState?.force_redirect ? "On" : "Off"}</span></div>
      </div>
    </div>
  )
}
