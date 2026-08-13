import Link from "next/link"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"

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

  return (
    <main className="event-editorial-page">
      <div className="mx-auto max-w-[1180px]">
        <section className="pt-4 lg:pt-8">
          <div className="editorial-eyebrow">{event.title.split(" ")[0]} &nbsp;·&nbsp; {monthYear(event.start_at)}</div>
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="editorial-title max-w-3xl">Prepare the room.<br />Shape the moment.</h1>
              <p className="mt-7 text-lg text-[#9aa8c5]">{event.title}</p>
            </div>
            <Link href={`/admin/events/${event.id}/producer/room`} className="mt-5 min-h-11 rounded-full bg-[linear-gradient(90deg,#1b75ff,#7444ef)] px-8 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(58,71,255,.22)]">Open Producer Room</Link>
          </div>
        </section>

        <div className="editorial-rule mt-10 border-t" />

        <section className="my-5 grid gap-6 rounded-[20px] border border-[#26324d] bg-black/20 px-6 py-7 md:grid-cols-[1.25fr_1px_.72fr_.72fr_.8fr] md:items-center">
          <div><div className="editorial-eyebrow !text-[#8291ad]">Event readiness</div><div className="mt-4 text-3xl font-medium tracking-[-.04em]">{peopleCount} people ready</div><div className="mt-1 text-xs text-[#73809a]">Audience list verified</div></div>
          <div className="hidden h-16 bg-[#2c3851] md:block" />
          <Metric value={sessionCount} label="sessions" note="Program built" />
          <Metric value={roomCount} label="rooms" note="Spaces assigned" />
          <div><div className="text-sm font-medium text-[#d9deea]">{isOpen ? `${liveNow} live now` : "Broadcast offline"}</div><div className="mt-2 text-xs text-[#6f7a91]">{isOpen ? "Audience connected" : "Rehearsal is next"}</div></div>
        </section>

        <div className="editorial-rule border-t" />

        <section className="grid gap-10 py-8 lg:grid-cols-[1fr_420px] lg:items-start">
          <div>
            <div className="editorial-eyebrow !text-[#95a2bb]">Readiness</div>
            <h2 className="mt-6 text-3xl font-medium tracking-[-.035em]">Ready for rehearsal.</h2>
            <p className="mt-3 text-base text-[#8f9bb5]">The audience, program, and experience are connected.</p>
            <dl className="mt-8 grid max-w-xl grid-cols-[150px_1fr] gap-y-6 text-sm">
              <dt>Audience</dt><dd className="text-[#8f9bb5]">{peopleCount} people ready</dd>
              <dt>Program</dt><dd className="text-[#8f9bb5]">{sessionCount} sessions built</dd>
              <dt>Experience</dt><dd className="text-[#8f9bb5]">Published</dd>
            </dl>
          </div>
          <aside className="rounded-[24px] border border-[#164e9d] bg-[linear-gradient(135deg,rgba(4,29,72,.8),rgba(31,10,53,.78))] p-7">
            <div className="editorial-eyebrow">Next</div>
            <h2 className="mt-6 text-3xl font-semibold tracking-[-.035em]">Run a rehearsal</h2>
            <p className="mt-3 leading-6 text-[#9ca9c3]">Walk through the show before your audience arrives.</p>
            <Link href={`/admin/events/${event.id}/agenda`} className="mt-8 min-h-11 w-full rounded-full bg-[linear-gradient(90deg,#1b75ff,#7444ef)] px-6 text-sm font-semibold">Open Run of Show →</Link>
          </aside>
        </section>
      </div>
    </main>
  )
}

function Metric({ value, label, note }: { value: number; label: string; note: string }) {
  return <div><div className="text-lg font-medium">{value} {label}</div><div className="mt-2 text-xs text-[#73809a]">{note}</div></div>
}
