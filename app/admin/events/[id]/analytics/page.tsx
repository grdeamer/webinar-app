import type { ReactNode } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Clapperboard,
  Download,
  FileSpreadsheet,
  MessageSquareText,
  Radio,
  Users,
} from "lucide-react"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EventRow = {
  id: string
  slug: string
  title: string
}

type SessionRow = {
  id: string
  title: string | null
  runtime_status: string | null
  is_general_session: boolean | null
}

type PresenceRow = {
  user_id: string | null
  last_seen: string | null
}

type ChartDatum = {
  label: string
  value: number
  color: string
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function getActiveCutoffTimestamp(): number {
  return Date.now() - 60_000
}

export default async function AdminEventAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const eventQuery = supabaseAdmin.from("events").select("id,slug,title")
  const { data, error: eventError } = isUuid(id)
    ? await eventQuery.eq("id", id).maybeSingle()
    : await eventQuery.eq("slug", id).maybeSingle()
  const event = (data as EventRow | null) ?? null

  if (eventError) throw new Error(eventError.message)
  if (!event) notFound()

  const [sessions, attendees, agenda, breakouts, questions, sponsors, presence] =
    await Promise.all([
      supabaseAdmin
        .from("event_sessions")
        .select("id,title,runtime_status,is_general_session")
        .eq("event_id", event.id),
      supabaseAdmin
        .from("event_registrants")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabaseAdmin
        .from("event_agenda_items")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabaseAdmin
        .from("event_breakouts")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabaseAdmin
        .from("qa_messages")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabaseAdmin
        .from("event_sponsors")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabaseAdmin
        .from("event_presence")
        .select("user_id,last_seen")
        .eq("event_id", event.id),
    ])

  const results = [sessions, attendees, agenda, breakouts, questions, sponsors, presence]
  const firstError = results.find((result) => result.error)?.error
  if (firstError) throw new Error(firstError.message)

  const sessionRows = (sessions.data ?? []) as SessionRow[]
  const presenceRows = (presence.data ?? []) as PresenceRow[]
  const activeCutoff = getActiveCutoffTimestamp()
  const activeNow = new Set(
    presenceRows
      .filter((row) => {
        const lastSeen = row.last_seen ? new Date(row.last_seen).getTime() : 0
        return Number.isFinite(lastSeen) && lastSeen >= activeCutoff
      })
      .map((row) => row.user_id)
      .filter((userId): userId is string => Boolean(userId))
  ).size

  const statusCounts = sessionRows.reduce<Record<string, number>>((counts, session) => {
    const status = session.runtime_status || "holding"
    counts[status] = (counts[status] ?? 0) + 1
    return counts
  }, {})

  const programData: ChartDatum[] = [
    { label: "Sessions", value: sessionRows.length, color: "#5798ff" },
    { label: "Run-of-show cues", value: agenda.count ?? 0, color: "#8d72ff" },
    { label: "Breakout rooms", value: breakouts.count ?? 0, color: "#43b9b1" },
    { label: "Sponsor assets", value: sponsors.count ?? 0, color: "#c48b54" },
  ]

  const audienceData: ChartDatum[] = [
    { label: "Registered", value: attendees.count ?? 0, color: "#5798ff" },
    { label: "Live now", value: activeNow, color: "#49c993" },
    { label: "Questions", value: questions.count ?? 0, color: "#d68a65" },
  ]

  const statusData: ChartDatum[] = [
    { label: "Holding", value: statusCounts.holding ?? 0, color: "#73839f" },
    { label: "Live", value: statusCounts.live ?? 0, color: "#ef6868" },
    { label: "Paused", value: statusCounts.paused ?? 0, color: "#d3a85c" },
    { label: "Ended", value: statusCounts.ended ?? 0, color: "#5ea989" },
  ]

  const base = `/admin/events/${event.id}`
  const exportBase = `/api/admin/events/${event.id}/analytics/export`

  return (
    <main className="relative min-h-screen overflow-hidden px-5 pb-16 pt-9 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_100%,rgba(118,46,38,0.1),transparent_35%)]" />
      <div className="relative mx-auto max-w-[1500px]">
        <header className="border-b border-white/[0.09] pb-9">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#63c9f5]">
                Analytics / Event signal
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                Read the room.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8f9bb3] sm:text-base">
                A live operational view of audience reach, program readiness, and participation for {event.title}.
              </p>
            </div>
            <a
              href={`${exportBase}?report=summary`}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-[9px] border border-white/[0.12] bg-white/[0.045] px-4 text-sm font-semibold text-white/78 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Download className="h-4 w-4" /> Download summary
            </a>
          </div>

          <div className="mt-9 grid border-y border-white/[0.08] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/[0.08]">
            <SignalMetric label="Registered" value={attendees.count ?? 0} icon={<Users />} />
            <SignalMetric label="Live now" value={activeNow} icon={<Radio />} accent />
            <SignalMetric label="Sessions" value={sessionRows.length} icon={<CalendarDays />} />
            <SignalMetric label="Questions" value={questions.count ?? 0} icon={<MessageSquareText />} />
          </div>
        </header>

        <div className="grid border-b border-white/[0.09] xl:grid-cols-2 xl:divide-x xl:divide-white/[0.09]">
          <AnalyticsSection eyebrow="Program structure" title="What has been built">
            <EditorialBarChart data={programData} />
          </AnalyticsSection>
          <AnalyticsSection eyebrow="Audience signal" title="Reach and response">
            <EditorialBarChart data={audienceData} />
          </AnalyticsSection>
        </div>

        <div className="grid border-b border-white/[0.09] xl:grid-cols-[1.2fr_.8fr] xl:divide-x xl:divide-white/[0.09]">
          <AnalyticsSection eyebrow="Runtime" title="Session state">
            <StatusRail data={statusData} />
            <p className="mt-7 max-w-2xl text-sm leading-6 text-white/38">
              This is the current operational state. A true attendance-over-time chart requires append-only telemetry; Jupiter currently stores the latest audience location rather than a historical series.
            </p>
          </AnalyticsSection>

          <AnalyticsSection eyebrow="Reports" title="Take the data with you">
            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              <ReportLink href={`${exportBase}?report=summary`} icon={<BarChart3 />} title="Event summary" detail="Key totals and current live signal" />
              <ReportLink href={`${exportBase}?report=sessions`} icon={<FileSpreadsheet />} title="Session report" detail="Schedule, delivery, and runtime status" />
              <ReportLink href={`${exportBase}?report=questions`} icon={<MessageSquareText />} title="Audience questions" detail="Questions, status, and timestamps" />
            </div>
          </AnalyticsSection>
        </div>

        <section className="flex flex-col gap-5 border-b border-white/[0.09] py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/34">Live operations</div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">Need to change the signal?</h2>
            <p className="mt-2 text-sm text-white/42">Open the control room for stage, media, and audience routing.</p>
          </div>
          <Link href={`${base}/producer/room`} className="inline-flex h-11 w-fit items-center gap-2 rounded-[9px] bg-[#1f6eff] px-5 text-sm font-semibold transition hover:bg-[#3b80ff]">
            <Clapperboard className="h-4 w-4" /> Open Producer Room
          </Link>
        </section>
      </div>
    </main>
  )
}

function SignalMetric({ label, value, icon, accent = false }: { label: string; value: number; icon: ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-5 px-4 py-5 lg:px-6">
      <div><div className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/35">{label}</div><div className={`mt-2 text-3xl font-semibold tabular-nums ${accent ? "text-[#67d6a8]" : "text-white"}`}>{value}</div></div>
      <span className={accent ? "text-[#67d6a8]" : "text-[#6e83a8]"}>{icon}</span>
    </div>
  )
}

function AnalyticsSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <section className="min-w-0 px-0 py-9 xl:px-9 xl:first:pl-0 xl:last:pr-0"><div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7183a6]">{eyebrow}</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{title}</h2><div className="mt-8">{children}</div></section>
}

function EditorialBarChart({ data }: { data: ChartDatum[] }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  return <div className="space-y-5">{data.map((item) => <div key={item.label} className="grid grid-cols-[132px_minmax(0,1fr)_42px] items-center gap-3"><span className="text-sm text-white/55">{item.label}</span><div className="h-2 bg-white/[0.055]"><div className="h-full min-w-px transition-[width]" style={{ width: `${Math.max(item.value > 0 ? 4 : 0, (item.value / max) * 100)}%`, backgroundColor: item.color }} /></div><span className="text-right text-sm font-semibold tabular-nums text-white/80">{item.value}</span></div>)}</div>
}

function StatusRail({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  return <div><div className="flex h-3 w-full overflow-hidden bg-white/[0.05]">{data.filter((item) => item.value > 0).map((item) => <span key={item.label} style={{ width: `${(item.value / Math.max(1, total)) * 100}%`, backgroundColor: item.color }} />)}</div><div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">{data.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3"><span className="flex items-center gap-2 text-sm text-white/48"><span className="h-2 w-2" style={{ backgroundColor: item.color }} />{item.label}</span><strong className="text-sm tabular-nums">{item.value}</strong></div>)}</div></div>
}

function ReportLink({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail: string }) {
  return <a href={href} className="group grid grid-cols-[34px_1fr_auto] items-center gap-3 py-4"><span className="text-[#7195cd]">{icon}</span><span><strong className="block text-sm font-semibold text-white/82">{title}</strong><span className="mt-1 block text-xs text-white/36">{detail}</span></span><span className="flex items-center gap-2 text-xs font-semibold text-white/38 group-hover:text-white/78"><Download className="h-3.5 w-3.5" /><ArrowUpRight className="h-3.5 w-3.5" /></span></a>
}
