import Link from "next/link"
import { AlertTriangle, ArrowUpRight, CalendarDays, Plus } from "lucide-react"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EventRow = {
  id: string
  title: string
  slug: string
  start_at: string | null
  lifecycle_stage: string | null
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
})

export default async function AdminDashboardPage() {
  // Server-rendered operational data needs a request-time freshness boundary.
  // eslint-disable-next-line react-hooks/purity
  const cutoff = new Date(Date.now() - 45_000).toISOString()
  const [eventsResult, liveStateResult, activityResult] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("id,title,slug,start_at,lifecycle_stage")
      .neq("lifecycle_stage", "archived")
      .order("start_at", { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from("event_live_state")
      .select("event_id,is_live,destination_session_id,updated_at")
      .eq("is_live", true)
      .order("updated_at", { ascending: false }),
    supabaseAdmin
      .from("attendee_activity")
      .select("session_id,current_path,updated_at")
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false }),
  ])

  const events = (eventsResult.data ?? []) as EventRow[]
  const liveState = liveStateResult.data?.[0]
  const liveEvent = events.find((event) => event.id === liveState?.event_id) ?? null
  const upcoming = events.find((event) => event.id !== liveEvent?.id) ?? liveEvent ?? events[0] ?? null
  const activity = activityResult.data ?? []
  const livePeople = new Set(activity.map((row) => row.session_id)).size

  const [currentSessionResult, registrantsResult, upcomingSessionsResult] = await Promise.all([
    liveState?.destination_session_id
      ? supabaseAdmin.from("event_sessions").select("title").eq("id", liveState.destination_session_id).maybeSingle()
      : Promise.resolve({ data: null }),
    liveEvent
      ? supabaseAdmin.from("event_registrants").select("id", { count: "exact", head: true }).eq("event_id", liveEvent.id)
      : Promise.resolve({ count: 0 }),
    upcoming
      ? supabaseAdmin.from("event_sessions").select("id,presenter").eq("event_id", upcoming.id)
      : Promise.resolve({ data: [] }),
  ])

  const attendeeCount = livePeople || registrantsResult.count || 0
  const currentSession = currentSessionResult.data?.title ?? "Audience experience"
  const upcomingSessions = upcomingSessionsResult.data ?? []
  const missingPresenters = upcomingSessions.filter((session) => !session.presenter?.trim()).length
  const readiness = upcomingSessions.length
    ? Math.max(35, Math.round(((upcomingSessions.length - missingPresenters) / upcomingSessions.length) * 100))
    : 0

  return (
    <div className="global-editorial-page dashboard-editorial-page mx-auto max-w-[1440px] space-y-5">
      <header className="dashboard-atmospheric-header flex flex-col gap-5 sm:flex-row sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[.24em] text-white/36">Jupiter.events Admin</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Mission Control</h1>
          <p className="mt-3 text-base text-white/58">Real-time overview of the Jupiter Events platform.</p>
        </div>
        <Link href="/admin/events/new" className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/55 bg-blue-500/15 px-5 py-3 text-sm font-semibold text-blue-50 transition hover:bg-blue-500/24">
          <Plus size={17} />Create Event
        </Link>
      </header>

      <section className="editorial-panel rounded-2xl px-6 py-7 sm:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />Live now</div>
        {liveEvent ? (
          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold tracking-[-.025em] sm:text-3xl">{liveEvent.title}</h2><span className="rounded-md border border-emerald-300/15 bg-emerald-300/[.07] px-2.5 py-1 text-xs font-semibold text-emerald-200">Live</span></div>
              <div className="mt-7 flex flex-wrap gap-x-12 gap-y-5 text-sm"><div><div className="text-white/38">Current session</div><div className="mt-1.5 text-lg font-medium">{currentSession}</div></div><div className="border-l border-white/12 pl-10"><div className="text-2xl font-semibold">{attendeeCount}</div><div className="text-white/48">attending</div></div></div>
            </div>
            <Link href={`/admin/events/${liveEvent.id}`} className="inline-flex items-center justify-center gap-3 rounded-xl border border-blue-400/55 bg-blue-500/15 px-6 py-3 text-sm font-semibold text-blue-50 transition hover:bg-blue-500/24">Open Event<ArrowUpRight size={16} /></Link>
          </div>
        ) : <div className="mt-7 text-white/48">No event is currently live. Your next scheduled event appears below.</div>}
      </section>

      <section className="editorial-panel rounded-2xl px-6 py-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-200"><AlertTriangle size={16} />Needs attention</div>
        <div className="mt-5 grid divide-y divide-white/10 text-sm md:grid-cols-3 md:divide-x md:divide-y-0">
          <Link href={upcoming ? `/admin/events/${upcoming.id}/attendees` : "/admin/events"} className="flex items-center justify-between gap-3 py-3 md:px-5 md:first:pl-0"><span><strong className="mr-2 text-amber-200">{missingPresenters}</strong>presenters need assignments</span><ArrowUpRight size={15} className="text-white/35" /></Link>
          <Link href={upcoming ? `/admin/events/${upcoming.id}/experience` : "/admin/events"} className="flex items-center justify-between gap-3 py-3 md:px-5"><span>Review attendee experience</span><ArrowUpRight size={15} className="text-white/35" /></Link>
          <Link href={upcoming ? `/admin/events/${upcoming.id}/emails` : "/admin/events"} className="flex items-center justify-between gap-3 py-3 md:px-5 md:last:pr-0"><span>Confirm audience communications</span><ArrowUpRight size={15} className="text-white/35" /></Link>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <section className="editorial-panel rounded-2xl p-6 sm:p-7">
          <div className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={17} className="text-white/60" />Coming next</div>
          {upcoming ? <><h2 className="mt-8 text-2xl font-semibold tracking-[-.025em]">{upcoming.title}</h2><p className="mt-2 text-white/48">{upcoming.start_at ? dateFormatter.format(new Date(upcoming.start_at)) : "Date to be confirmed"}</p><div className="mt-7 border-t border-white/10 pt-6"><div className="text-xs uppercase tracking-[.18em] text-white/36">Event readiness</div><div className="mt-3 flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-300/70 text-sm font-semibold">{readiness}%</div><div><div className="font-semibold text-emerald-200">{readiness >= 80 ? "On track" : "In progress"}</div><div className="mt-1 text-sm text-white/45">{upcomingSessions.length} sessions · {missingPresenters} assignments remaining</div></div></div></div><Link href={`/admin/events/${upcoming.id}`} className="mt-7 inline-flex items-center justify-center gap-3 rounded-xl border border-white/12 bg-white/[.045] px-5 py-3 text-sm font-semibold hover:bg-white/[.08]">Open Event<ArrowUpRight size={16} /></Link></> : <p className="mt-8 text-white/45">Create an event to begin planning.</p>}
        </section>

        <section className="editorial-panel rounded-2xl p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Recent activity</h2><Link href="/admin/activity" className="text-xs font-semibold text-blue-300 hover:text-blue-200">View all activity</Link></div>
          <div className="mt-6 divide-y divide-white/[.08]">
            {activity.slice(0, 5).map((row, index) => <div key={`${row.session_id}-${row.updated_at}`} className="flex items-center gap-3 py-4 text-sm"><span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-emerald-300" : "bg-blue-400"}`} /><span className="min-w-0 flex-1 truncate">Audience activity at <span className="text-white/55">{row.current_path}</span></span><span className="text-xs text-white/35">{new Date(row.updated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}</span></div>)}
            {activity.length === 0 ? <div className="py-8 text-sm text-white/42">Live signals will appear here when attendees enter the platform.</div> : null}
          </div>
        </section>
      </div>
    </div>
  )
}
