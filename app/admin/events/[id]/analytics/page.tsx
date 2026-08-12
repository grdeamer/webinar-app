import type { ReactNode } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  CalendarDays,
  Clapperboard,
  ImageIcon,
  ListOrdered,
  MessageSquareText,
  Network,
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
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

  const [sessions, attendees, agenda, breakouts, questions, sponsors] = await Promise.all([
    supabaseAdmin
      .from("event_sessions")
      .select("id", { count: "exact", head: true })
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
  ])

  const firstError = [sessions, attendees, agenda, breakouts, questions, sponsors].find(
    (result) => result.error
  )?.error

  if (firstError) throw new Error(firstError.message)

  const base = `/admin/events/${event.id}`

  return (
    <div className="space-y-6 p-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_38%),rgba(255,255,255,0.04)] p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100/50">
          Event Analytics
        </div>
        <h1 className="mt-3 text-3xl font-semibold">{event.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
          A focused inventory of the people, programming, audience questions, and assets prepared for this event.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Metric href={`${base}/attendees`} label="Registrants" value={attendees.count ?? 0} icon={<Users size={18} />} />
        <Metric href={`${base}/sessions`} label="Sessions" value={sessions.count ?? 0} icon={<CalendarDays size={18} />} />
        <Metric href={`${base}/agenda`} label="Run of Show" value={agenda.count ?? 0} icon={<ListOrdered size={18} />} />
        <Metric href={`${base}/breakouts`} label="Breakouts" value={breakouts.count ?? 0} icon={<Network size={18} />} />
        <Metric label="Audience Questions" value={questions.count ?? 0} icon={<MessageSquareText size={18} />} />
        <Metric href={`${base}/sponsors`} label="Sponsor Assets" value={sponsors.count ?? 0} icon={<ImageIcon size={18} />} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Live operations</h2>
            <p className="mt-2 text-sm text-white/60">
              When the show is live, open the switcher for stage control.
            </p>
          </div>
          <Link
            href={`${base}/producer/room`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-200 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-100"
          >
            <Clapperboard size={16} />
            Open Producer Room
          </Link>
        </div>
      </section>
    </div>
  )
}

function Metric({
  href,
  label,
  value,
  icon,
}: {
  href?: string
  label: string
  value: number
  icon: ReactNode
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3 text-white/45">
        <span className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</span>
        {icon}
      </div>
      <div className="mt-5 text-4xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-xs text-white/40">{href ? "Open details →" : "Event total"}</div>
    </>
  )

  const className =
    "rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-violet-200/20 hover:bg-violet-300/[0.05]"

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}
