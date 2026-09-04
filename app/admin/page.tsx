import Link from "next/link"
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, CalendarDays, Check,
  CircleGauge, Clock3, Database, Plus, Radio, Send, ServerCog, ShieldCheck, Users,
} from "lucide-react"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EventRow = { id: string; title: string; slug: string; start_at: string | null; lifecycle_stage: string | null }
type SessionRow = { id: string; event_id: string; presenter: string | null }

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })
const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })

function eventReadiness(eventId: string, sessions: SessionRow[]) {
  const relevant = sessions.filter((session) => session.event_id === eventId)
  const missing = relevant.filter((session) => !session.presenter?.trim()).length
  return { total: relevant.length, missing, value: relevant.length ? Math.round(((relevant.length - missing) / relevant.length) * 100) : 0 }
}

function readinessTone(value: number) {
  if (value >= 85) return { ring: "border-emerald-300/70", text: "text-emerald-200", label: "On track" }
  if (value >= 60) return { ring: "border-amber-300/70", text: "text-amber-200", label: "Needs review" }
  return { ring: "border-orange-300/70", text: "text-orange-200", label: "At risk" }
}

export default async function AdminDashboardPage() {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const cutoff = new Date(now - 45_000).toISOString()
  const [eventsResult, liveResult, activityResult] = await Promise.all([
    supabaseAdmin.from("events").select("id,title,slug,start_at,lifecycle_stage").neq("lifecycle_stage", "archived").order("start_at", { ascending: true, nullsFirst: false }),
    supabaseAdmin.from("event_live_state").select("event_id,is_live,destination_session_id,updated_at").eq("is_live", true).order("updated_at", { ascending: false }),
    supabaseAdmin.from("attendee_activity").select("session_id,current_path,updated_at").gte("updated_at", cutoff).order("updated_at", { ascending: false }),
  ])

  const events = (eventsResult.data ?? []) as EventRow[]
  const liveState = liveResult.data?.[0]
  const liveEvent = events.find((event) => event.id === liveState?.event_id) ?? null
  const upcoming = events
    .filter((event) => event.id !== liveEvent?.id && event.start_at && new Date(event.start_at).getTime() >= now)
    .slice(0, 3)
  const activity = activityResult.data ?? []
  const livePeople = new Set(activity.map((row) => row.session_id)).size
  const eventIds = [...new Set([liveEvent?.id, ...upcoming.map((event) => event.id)].filter(Boolean))] as string[]

  const [sessionResult, registrantsResult, sessionsResult] = await Promise.all([
    liveState?.destination_session_id
      ? supabaseAdmin.from("event_sessions").select("title").eq("id", liveState.destination_session_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    liveEvent
      ? supabaseAdmin.from("event_registrants").select("id", { count: "exact", head: true }).eq("event_id", liveEvent.id)
      : Promise.resolve({ count: 0, error: null }),
    eventIds.length
      ? supabaseAdmin.from("event_sessions").select("id,event_id,presenter").in("event_id", eventIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const sessions = (sessionsResult.data ?? []) as SessionRow[]
  const attendeeCount = livePeople || registrantsResult.count || 0
  const currentSession = sessionResult.data?.title ?? "Audience experience"
  const healthy = !eventsResult.error && !liveResult.error && !activityResult.error && !sessionsResult.error
  const actions = upcoming.flatMap((event) => {
    const readiness = eventReadiness(event.id, sessions)
    return readiness.missing ? [{ event, ...readiness }] : []
  })

  return (
    <div className="global-editorial-page mx-auto max-w-[1500px] space-y-4 pb-8">
      <header className="dashboard-command-header flex flex-col gap-5 px-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-.045em] sm:text-[46px]">Mission Control</h1>
          <p className="mt-2 text-base text-white/58">Everything happening across Jupiter, right now.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#080e1d]/80 px-4 text-sm text-white/75">
            <span className={`h-2.5 w-2.5 rounded-full ${healthy ? "bg-emerald-300" : "bg-amber-300"}`} />
            {healthy ? "All systems operational" : "Service check required"}
          </div>
          <Link href="/admin/events/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-300/35 bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-sm font-semibold shadow-[0_12px_34px_rgba(82,83,255,.2)] hover:brightness-110"><Plus size={17} />Create event</Link>
        </div>
      </header>

      <section className="dashboard-command-panel overflow-hidden rounded-2xl border border-white/10 bg-[#080e1d]/88 shadow-[0_24px_70px_rgba(0,0,0,.2)]">
        <div className="flex items-center justify-between border-b border-white/[.08] px-6 py-4">
          <div className="text-xs font-semibold uppercase tracking-[.18em] text-white/70">Live operations</div>
          {liveState?.updated_at ? <div className="text-xs font-medium text-white/45">State synced {timeFormat.format(new Date(liveState.updated_at))}</div> : null}
        </div>
        {liveEvent ? (
          <div className="grid gap-6 px-6 py-6 xl:grid-cols-[1.3fr_repeat(4,.62fr)_auto] xl:items-center">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/12 px-3 py-1.5 text-xs font-bold text-red-100"><span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />ON AIR</div>
              <h2 className="mt-3 truncate text-2xl font-semibold tracking-[-.025em]">{liveEvent.title}</h2>
              <div className="mt-3 flex flex-wrap gap-x-7 gap-y-2 text-sm"><span className="text-white/40">Current session</span><span className="font-medium text-white/85">{currentSession}</span></div>
            </div>
            <Metric icon={<Users size={17} />} label="Attending" value={String(attendeeCount)} detail="Live now" />
            <Metric icon={<Clock3 size={17} />} label="Routing state" value="Live" detail={liveState.updated_at ? `Synced ${timeFormat.format(new Date(liveState.updated_at))}` : "Connected"} />
            <Metric icon={<Radio size={17} />} label="Signal health" value={healthy ? "Good" : "Check"} detail={healthy ? "All streams stable" : "Review services"} accent />
            <Metric icon={<CircleGauge size={17} />} label="Engagement" value={livePeople ? "Live" : "Ready"} detail={livePeople ? `${livePeople} active signals` : "Awaiting signals"} accent />
            <div className="grid min-w-[205px] gap-2">
              <Link href={`/admin/events/${liveEvent.id}/producer/room`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-sm font-semibold shadow-[0_12px_28px_rgba(77,83,255,.2)] hover:brightness-110">Open Producer Room<ArrowUpRight size={16} /></Link>
              <Link href={`/admin/events/${liveEvent.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[.025] px-5 text-sm font-semibold text-white/75 hover:bg-white/[.06] hover:text-white">View event<ArrowUpRight size={15} /></Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold">No event is live</h2><p className="mt-1.5 text-sm text-white/45">No event is currently broadcasting.</p></div><Link href="/admin/events" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300">View events<ArrowRight size={16} /></Link></div>
        )}
      </section>

      <section className="dashboard-command-panel rounded-2xl border border-white/10 bg-[#080e1d]/82 px-6 py-4">
        <div className="flex items-center gap-3 border-b border-white/[.08] pb-3"><div className="text-xs font-semibold uppercase tracking-[.18em] text-white/70">Action queue</div><span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${actions.length ? "bg-red-500/75" : "bg-emerald-400/15 text-emerald-200"}`}>{actions.length}</span></div>
        {actions.length ? <div className="divide-y divide-white/[.07]">{actions.map(({ event, missing }) => <div key={event.id} className="grid gap-3 py-3 text-sm md:grid-cols-[1.4fr_.55fr_1fr_auto] md:items-center"><div className="flex items-center gap-3 font-medium"><AlertTriangle size={17} className="text-amber-300" />{missing} {missing === 1 ? "speaker needs" : "speakers need"} assignment</div><span className="text-amber-200">Medium</span><span className="truncate text-white/54">{event.title}</span><Link href={`/admin/events/${event.id}/attendees`} className="inline-flex h-9 items-center justify-center rounded-lg border border-white/12 px-4 text-xs font-semibold text-white/75 hover:bg-white/[.06]">Assign speakers</Link></div>)}</div> : <div className="flex items-center gap-3 py-4 text-sm text-white/58"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/12 text-emerald-200"><Check size={15} /></span>All clear. No production blockers need attention.</div>}
      </section>

      <div className="grid gap-4 xl:grid-cols-[.82fr_1.18fr]">
        <section className="dashboard-command-panel rounded-2xl border border-white/10 bg-[#080e1d]/82 p-6">
          <div className="flex items-center justify-between gap-3 border-b border-white/[.08] pb-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-white/70"><CalendarDays size={16} />Upcoming events</div><Link href="/admin/events" className="text-xs font-semibold text-blue-300">View all events</Link></div>
          <div className="divide-y divide-white/[.07]">{upcoming.map((event) => { const status = eventReadiness(event.id, sessions); const tone = readinessTone(status.value); return <Link key={event.id} href={`/admin/events/${event.id}`} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4 hover:bg-white/[.02] sm:grid-cols-[1.2fr_.8fr_auto]"><div className="min-w-0"><div className="truncate font-semibold">{event.title}</div><div className="mt-1 text-xs text-white/35">{status.total} sessions</div></div><div className="hidden text-sm text-white/55 sm:block">{event.start_at ? <><div>{dateFormat.format(new Date(event.start_at))}</div><div className="mt-1 text-xs text-white/35">{timeFormat.format(new Date(event.start_at))}</div></> : "Date TBD"}</div><div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${tone.ring} text-xs font-bold ${tone.text}`}>{status.value}%</span><span className={`hidden text-xs font-medium sm:block ${tone.text}`}>{tone.label}</span><ArrowRight size={15} className="text-white/35" /></div></Link> })}{!upcoming.length ? <div className="py-8 text-sm text-white/42">No upcoming events scheduled.</div> : null}</div>
        </section>

        <section className="dashboard-command-panel rounded-2xl border border-white/10 bg-[#080e1d]/82 p-6">
          <div className="flex items-center justify-between gap-3 border-b border-white/[.08] pb-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-white/70"><Activity size={16} />Recent activity</div><Link href="/admin/activity" className="text-xs font-semibold text-blue-300">View all activity</Link></div>
          <div className="mt-2 divide-y divide-white/[.07]">{activity.slice(0, 4).map((row, index) => <div key={`${row.session_id}-${row.updated_at}`} className="flex items-center gap-4 py-3.5 text-sm"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${index === 0 ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200" : "border-blue-300/20 bg-blue-400/10 text-blue-200"}`}><Activity size={16} /></span><div className="min-w-0 flex-1"><div className="font-medium">Audience signal received</div><div className="mt-1 truncate text-xs text-white/38">{row.current_path}</div></div><time className="text-xs text-white/38">{timeFormat.format(new Date(row.updated_at))}</time></div>)}{!activity.length ? <div className="flex min-h-40 flex-col items-center justify-center py-8 text-center"><Activity size={22} className="text-white/22" /><div className="mt-3 text-sm font-medium text-white/60">No live activity yet</div><div className="mt-1 text-xs text-white/35">Signals appear here as attendees enter the platform.</div></div> : null}</div>
        </section>
      </div>

      <section className="dashboard-command-panel rounded-2xl border border-white/10 bg-[#080e1d]/82 px-6 py-4">
        <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-white/70"><ShieldCheck size={16} />Platform health</div><Link href="/admin/health" className="text-xs font-semibold text-blue-300">View status<ArrowUpRight size={13} className="ml-1 inline" /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Health icon={<Radio size={17} />} label="Live signals" ok={!liveResult.error} /><Health icon={<Send size={17} />} label="Event delivery" ok={!eventsResult.error} /><Health icon={<Database size={17} />} label="Data services" ok={!sessionsResult.error} /><Health icon={<ServerCog size={17} />} label="Admin services" ok={healthy} /></div>
      </section>
    </div>
  )
}

function Metric({ icon, label, value, detail, accent = false }: { icon: React.ReactNode; label: string; value: string; detail: string; accent?: boolean }) {
  return <div className="border-l border-white/[.08] pl-5"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.12em] text-white/40">{icon}{label}</div><div className="mt-2 text-2xl font-semibold tracking-[-.03em]">{value}</div><div className={`mt-1 text-xs ${accent ? "text-emerald-300" : "text-white/35"}`}>{detail}</div></div>
}

function Health({ icon, label, ok }: { icon: React.ReactNode; label: string; ok: boolean }) {
  return <div className="flex items-center gap-3 border-l border-white/[.08] px-4 first:border-l-0 first:pl-0"><span className={ok ? "text-emerald-300" : "text-amber-300"}>{icon}</span><span className="text-sm font-medium">{label}</span><span className={`ml-auto text-xs ${ok ? "text-emerald-300" : "text-amber-300"}`}>{ok ? "Operational" : "Check"}</span></div>
}
