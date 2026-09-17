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
    <div className="global-editorial-page mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="dashboard-command-header flex flex-col gap-6 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[.24em] text-blue-300/70">Mission Control</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-.045em] sm:text-[50px]">Good afternoon.</h1>
          <p className="mt-2 text-base text-white/58">Here’s what needs your attention across Jupiter.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#080e1d]/72 px-4 text-sm text-white/68">
            <span className={`h-2 w-2 rounded-full ${healthy ? "bg-emerald-300" : "bg-amber-300"}`} />
            {healthy ? "Systems ready" : "Service check required"}
          </div>
          <Link href="/admin/events/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-300/35 bg-gradient-to-r from-blue-600 to-violet-600 px-5 text-sm font-semibold shadow-[0_12px_34px_rgba(82,83,255,.2)] hover:brightness-110"><Plus size={17} />Create event</Link>
        </div>
      </header>

      <section className="dashboard-command-panel relative overflow-hidden rounded-[28px] border border-blue-300/15 bg-[radial-gradient(circle_at_82%_18%,rgba(83,82,255,.16),transparent_34%),linear-gradient(135deg,rgba(10,18,39,.98),rgba(5,10,25,.96))] shadow-[0_30px_90px_rgba(0,0,0,.28)]">
        <div className="absolute inset-y-0 right-0 hidden w-[38%] bg-[linear-gradient(135deg,transparent,rgba(95,70,255,.06))] xl:block" />
        {liveEvent ? (
          <div className="relative grid min-h-[360px] gap-8 p-7 sm:p-9 xl:grid-cols-[1.15fr_.85fr] xl:items-stretch xl:p-10">
            <div className="flex min-w-0 flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-red-100"><span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />Live now</div>
                <h2 className="mt-6 max-w-3xl text-3xl font-semibold tracking-[-.045em] sm:text-5xl">{liveEvent.title}</h2>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-base"><span className="text-white/42">On stage</span><span className="font-medium text-white/88">{currentSession}</span></div>
              </div>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href={`/admin/events/${liveEvent.id}/producer/room`} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 text-sm font-semibold shadow-[0_16px_35px_rgba(77,83,255,.25)] hover:brightness-110">Open Producer Room<ArrowUpRight size={16} /></Link>
                <Link href={`/admin/events/${liveEvent.id}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[.025] px-6 text-sm font-semibold text-white/72 hover:bg-white/[.06] hover:text-white">View event<ArrowUpRight size={15} /></Link>
              </div>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[.09] bg-white/[.09] sm:grid-cols-2">
              <PrimaryMetric icon={<Users size={18} />} label="Attending now" value={String(attendeeCount)} detail="Live audience" />
              <PrimaryMetric icon={<Clock3 size={18} />} label="Routing" value="Live" detail={liveState.updated_at ? `Synced ${timeFormat.format(new Date(liveState.updated_at))}` : "Connected"} />
              <PrimaryMetric icon={<Radio size={18} />} label="Signal health" value={healthy ? "Good" : "Check"} detail={healthy ? "All streams stable" : "Review services"} accent />
              <PrimaryMetric icon={<CircleGauge size={18} />} label="Engagement" value={livePeople ? "Active" : "Ready"} detail={livePeople ? `${livePeople} live signals` : "Awaiting signals"} accent />
            </div>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col justify-center gap-5 p-9 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[.2em] text-blue-300/70">Next up</div><h2 className="mt-3 text-3xl font-semibold tracking-[-.035em]">No event is live</h2><p className="mt-2 text-base text-white/48">Your next production will appear here when it goes live.</p></div><Link href="/admin/events" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300">View events<ArrowRight size={16} /></Link></div>
        )}
      </section>

      <section className="dashboard-command-panel rounded-2xl border border-white/10 bg-[#080e1d]/72 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${actions.length ? "bg-amber-400/10 text-amber-200" : "bg-emerald-400/10 text-emerald-200"}`}>{actions.length ? <AlertTriangle size={18} /> : <Check size={18} />}</span>
            <div><div className="font-semibold">{actions.length ? `${actions.length} ${actions.length === 1 ? "item needs" : "items need"} attention` : "You’re ready to go"}</div><div className="mt-1 text-sm text-white/42">{actions.length ? "Complete these before your upcoming events." : "No production blockers need attention."}</div></div>
          </div>
          {actions.length ? <div className="flex flex-wrap gap-2">{actions.slice(0, 2).map(({ event, missing }) => <Link key={event.id} href={`/admin/events/${event.id}/attendees`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white/72 hover:bg-white/[.06]"><span className="font-semibold text-amber-200">{missing}</span><span className="max-w-44 truncate">speaker assignments</span><ArrowRight size={14} /></Link>)}</div> : null}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
        <section className="dashboard-command-panel rounded-2xl border border-white/10 bg-[#080e1d]/76 p-6">
          <div className="flex items-center justify-between gap-3 border-b border-white/[.08] pb-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-white/70"><CalendarDays size={16} />Upcoming events</div><Link href="/admin/events" className="text-xs font-semibold text-blue-300">View all events</Link></div>
          <div className="divide-y divide-white/[.07]">{upcoming.map((event) => { const status = eventReadiness(event.id, sessions); const tone = readinessTone(status.value); return <Link key={event.id} href={`/admin/events/${event.id}`} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4 hover:bg-white/[.02] sm:grid-cols-[1.2fr_.8fr_auto]"><div className="min-w-0"><div className="truncate font-semibold">{event.title}</div><div className="mt-1 text-xs text-white/35">{status.total} sessions</div></div><div className="hidden text-sm text-white/55 sm:block">{event.start_at ? <><div>{dateFormat.format(new Date(event.start_at))}</div><div className="mt-1 text-xs text-white/35">{timeFormat.format(new Date(event.start_at))}</div></> : "Date TBD"}</div><div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${tone.ring} text-xs font-bold ${tone.text}`}>{status.value}%</span><span className={`hidden text-xs font-medium sm:block ${tone.text}`}>{tone.label}</span><ArrowRight size={15} className="text-white/35" /></div></Link> })}{!upcoming.length ? <div className="py-8 text-sm text-white/42">No upcoming events scheduled.</div> : null}</div>
        </section>

        <section className="dashboard-command-panel rounded-2xl border border-white/10 bg-[#080e1d]/70 p-6">
          <div className="flex items-center justify-between gap-3 border-b border-white/[.08] pb-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-white/70"><Activity size={16} />Recent activity</div><Link href="/admin/activity" className="text-xs font-semibold text-blue-300">View all activity</Link></div>
          <div className="mt-2 divide-y divide-white/[.07]">{activity.slice(0, 4).map((row, index) => <div key={`${row.session_id}-${row.updated_at}`} className="flex items-center gap-4 py-3.5 text-sm"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${index === 0 ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200" : "border-blue-300/20 bg-blue-400/10 text-blue-200"}`}><Activity size={16} /></span><div className="min-w-0 flex-1"><div className="font-medium">Audience signal received</div><div className="mt-1 truncate text-xs text-white/38">{row.current_path}</div></div><time className="text-xs text-white/38">{timeFormat.format(new Date(row.updated_at))}</time></div>)}{!activity.length ? <div className="flex min-h-32 items-center gap-4 py-7"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[.07] bg-white/[.025]"><Activity size={19} className="text-white/25" /></span><div><div className="text-sm font-medium text-white/62">Quiet for now</div><div className="mt-1 text-sm text-white/35">Audience activity will appear here when it begins.</div></div></div> : null}</div>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-white/[.08] bg-[#080e1d]/52 px-6 py-4 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center justify-between gap-5 lg:pr-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-white/55"><ShieldCheck size={16} />Platform health</div><Link href="/admin/health" className="text-xs font-semibold text-blue-300 lg:hidden">View status</Link></div>
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><Health icon={<Radio size={17} />} label="Live signals" ok={!liveResult.error} /><Health icon={<Send size={17} />} label="Event delivery" ok={!eventsResult.error} /><Health icon={<Database size={17} />} label="Data services" ok={!sessionsResult.error} /><Health icon={<ServerCog size={17} />} label="Admin services" ok={healthy} /></div>
        <Link href="/admin/health" className="hidden shrink-0 text-xs font-semibold text-blue-300 lg:block">View status<ArrowUpRight size={13} className="ml-1 inline" /></Link>
      </section>
    </div>
  )
}

function PrimaryMetric({ icon, label, value, detail, accent = false }: { icon: React.ReactNode; label: string; value: string; detail: string; accent?: boolean }) {
  return <div className="bg-[#070d1d]/88 p-5 sm:p-6"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-white/40">{icon}{label}</div><div className="mt-4 text-3xl font-semibold tracking-[-.04em]">{value}</div><div className={`mt-1.5 text-xs ${accent ? "text-emerald-300" : "text-white/35"}`}>{detail}</div></div>
}

function Health({ icon, label, ok }: { icon: React.ReactNode; label: string; ok: boolean }) {
  return <div className="flex items-center gap-3 border-l border-white/[.08] px-4 first:border-l-0 first:pl-0"><span className={ok ? "text-emerald-300" : "text-amber-300"}>{icon}</span><span className="text-sm font-medium">{label}</span><span className={`ml-auto text-xs ${ok ? "text-emerald-300" : "text-amber-300"}`}>{ok ? "Operational" : "Check"}</span></div>
}
