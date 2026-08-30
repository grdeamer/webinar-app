import Link from "next/link"
import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import EventAccessActions from "./EventAccessActions"
import { canManageEventAccess, getEventTeamAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PageProps = { params: Promise<{ id: string }> }
type EventRow = { id: string; slug: string; title: string; description: string | null; start_at: string | null }

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function countLivePresence(rows: Array<{ last_seen: string | null }>) {
  const cutoff = Date.now() - 30_000
  return rows.filter((row) => row.last_seen && new Date(row.last_seen).getTime() >= cutoff).length
}

function monthYear(value: string | null) {
  if (!value) return "Schedule pending"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Schedule pending" : date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export default async function AdminEventDashboardPage({ params }: PageProps) {
  const { id } = await params
  const access = await getEventTeamAccess(id)
  if (!access) notFound()
  const eventQuery = supabaseAdmin.from("events").select("id,slug,title,description,start_at")
  const { data } = isUuid(id) ? await eventQuery.eq("id", id).maybeSingle() : await eventQuery.eq("slug", id).maybeSingle()
  const event = data as EventRow | null
  if (!event) notFound()

  const [sessions, people, breakouts, liveState, presence] = await Promise.all([
    supabaseAdmin.from("event_sessions").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    supabaseAdmin.from("event_registrants").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    supabaseAdmin.from("event_breakouts").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    supabaseAdmin.from("event_live_state").select("status").eq("event_id", event.id).maybeSingle(),
    supabaseAdmin.from("event_presence").select("last_seen").eq("event_id", event.id),
  ])

  const sessionCount = sessions.count ?? 0
  const peopleCount = people.count ?? 0
  const roomCount = Math.max(1, (breakouts.count ?? 0) + (sessionCount > 0 ? 1 : 0))
  const liveNow = countLivePresence(presence.data ?? [])
  const isOpen = liveState.data?.status === "open"
  const canOperate = access.isGlobalAdmin || access.role === "event_admin" || access.role === "producer"

  const checklist = [
    { label: "People", detail: `${peopleCount} people imported and verified`, complete: peopleCount > 0 },
    { label: "Program", detail: `${sessionCount} sessions built`, complete: sessionCount > 0 },
    { label: "Experience", detail: "Event experience is connected", complete: true },
    { label: "Rehearsal", detail: isOpen ? "Event is currently open" : "Producer room has not been tested", complete: isOpen },
  ]
  const completeCount = checklist.filter((item) => item.complete).length

  return <main className="event-editorial-page"><div className="mx-auto max-w-[1100px] space-y-4">
    <section className="flex flex-col gap-5 border-b border-[#1a2231] pb-5 lg:flex-row lg:items-center lg:justify-between">
      <div><div className="text-[9px] font-bold tracking-[.16em] text-[#68758c]">EVENT&nbsp;&nbsp;/&nbsp;&nbsp;OVERVIEW</div><h2 className="mt-2 text-[32px] font-medium tracking-[-.035em]">Good morning.</h2><p className="mt-1 text-sm text-[#9aa6bb]">{event.title} is nearly ready for rehearsal.</p></div>
      <div className="flex flex-wrap gap-2"><Link href={`/events/${event.slug}`} className="min-h-10 rounded-xl bg-[#3974df] px-4 text-sm font-semibold">Attendee preview&nbsp; →</Link>{canOperate ? <Link href={`/admin/events/${event.id}/producer/room`} className="min-h-10 rounded-xl bg-[#6750d3] px-4 text-sm font-semibold">Open Producer Room&nbsp; →</Link> : null}{canManageEventAccess(access) ? <EventAccessActions eventId={event.id} eventTitle={event.title} /> : null}</div>
    </section>

    <section className="rounded-2xl border border-[#1a2231] bg-[#070c16] p-4">
      <div className="flex items-center justify-between"><div className="text-[9px] font-bold tracking-[.16em] text-[#68758c]">EVENT READINESS</div><Status tone="success">READY FOR REHEARSAL</Status></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric value={peopleCount} label="People" note="Audience verified" /><Metric value={sessionCount} label="Sessions" note="Program built" /><Metric value={roomCount} label="Rooms" note="Routing assigned" /><Metric value={liveNow} label="Live now" note={isOpen ? "Audience connected" : "Broadcast offline"} /></div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
      <div className="rounded-2xl border border-[#1a2231] bg-[#070c16] p-4"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Launch checklist</h2><p className="mt-1 text-xs text-[#9aa6bb]">Four foundations for a confident rehearsal.</p></div><Status tone="success">{completeCount} OF 4 COMPLETE</Status></div><div className="mt-4 space-y-2">{checklist.map((item) => <div key={item.label} className="flex min-h-[52px] items-center justify-between gap-4 rounded-[10px] bg-[#1a2231] px-3 py-2"><div><div className="text-xs font-medium">{item.label}</div><div className="mt-1 text-[11px] text-[#9aa6bb]">{item.detail}</div></div><Status tone={item.complete ? "success" : "warning"}>{item.complete ? "COMPLETE" : "ACTION NEEDED"}</Status></div>)}</div></div>
      {canOperate ? <aside className="rounded-2xl border border-[#4f8cff] bg-[#4d3aa8] p-4"><Status tone="warning" solid>NEXT</Status><h2 className="mt-4 text-2xl font-medium">Run a rehearsal</h2><p className="mt-3 text-sm leading-5 text-[#c9c8e4]">Walk through the show, confirm presenter access, and test audience routing before opening the event.</p><div className="my-4 border-t border-white/15" /><div className="text-[9px] font-bold tracking-[.15em] text-white/45">RECOMMENDED · 30 MINUTES</div><Link href={`/admin/events/${event.id}/agenda`} className="mt-4 min-h-10 w-full rounded-xl bg-[#6750d3] px-4 text-sm font-semibold">Open Run of Show&nbsp; →</Link><Link href={`/admin/events/${event.id}/producer/room`} className="mt-2 min-h-9 w-full rounded-xl bg-[#030714] px-4 text-xs font-semibold text-[#9aa6bb]">View rehearsal workspace</Link></aside> : null}
    </section>

    <section className="rounded-2xl border border-[#1a2231] bg-[#070c16] p-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Recent activity</h2><Link href={`/admin/events/${event.id}/analytics`} className="rounded-lg bg-[#030714] px-4 py-2 text-[11px] text-[#9aa6bb]">View all</Link></div><div className="mt-3 divide-y divide-[#1a2231] text-sm"><ActivityRow label="Experience connected" time="Ready" /><ActivityRow label={`${sessionCount} sessions in the program`} time={monthYear(event.start_at)} /><ActivityRow label={`${peopleCount} people in the audience`} time="Current" /></div></section>
  </div></main>
}

function Metric({ value, label, note }: { value: number; label: string; note: string }) {
  return <div><div className="flex items-baseline gap-1.5"><span className="text-xl font-semibold">{value}</span><span className="text-sm text-[#9aa6bb]">{label}</span></div><div className="mt-1 text-[11px] text-[#68758c]">{note}</div></div>
}

function Status({ children, tone, solid = false }: { children: ReactNode; tone: "success" | "warning"; solid?: boolean }) { const color = tone === "success" ? "#54e5a5" : "#f0bc67"; return <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[9px] font-bold tracking-[.08em]" style={{ borderColor: color, color: solid ? "#030714" : color, background: solid ? color : "#070c16" }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: solid ? "#030714" : color }} />{children}</span> }
function ActivityRow({ label, time }: { label: string; time: string }) { return <div className="flex items-center justify-between gap-4 py-2"><span>{label}</span><span className="text-[11px] text-[#68758c]">{time}</span></div> }
