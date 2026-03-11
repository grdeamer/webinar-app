import Link from "next/link"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import RemoteRefreshListener from "@/components/RemoteRefreshListener"
import EventBreakoutMagnifyList from "@/components/EventBreakoutMagnifyList"
import { getBreakoutRuntimeStatus, getEventLiveDestination, getEventLiveState } from "@/lib/app/liveState"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type BreakoutRow = {
  id: string
  title: string
  description: string | null
  join_link: string | null
  start_at: string | null
  end_at: string | null
  speaker_name: string | null
  speaker_avatar_url: string | null
  manual_live: boolean | null
  auto_open: boolean | null
}

function formatWhen(start_at: string | null, end_at: string | null) {
  if (!start_at && !end_at) return "Time TBA"

  const start = start_at ? new Date(start_at) : null
  const end = end_at ? new Date(end_at) : null

  const startLabel = start
    ? start.toLocaleString([], {
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null

  const endLabel = end
    ? end.toLocaleString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null

  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`
  return startLabel || endLabel || "Time TBA"
}

export default async function EventBreakoutsPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)

  const [{ data, error }, liveState] = await Promise.all([
    supabaseAdmin
      .from("event_breakouts")
      .select("id,title,description,join_link,start_at,end_at,speaker_name,speaker_avatar_url,manual_live,auto_open")
      .eq("event_id", event.id)
      .order("manual_live", { ascending: false })
      .order("start_at", { ascending: true, nullsFirst: false }),
    getEventLiveState(event.id),
  ])

  if (error) throw new Error(error.message)

  const items = (data || []) as BreakoutRow[]
  const destination = getEventLiveDestination({
    slug,
    liveState,
    breakouts: items.map((item) => ({ ...item, event_id: event.id, created_at: item.id })),
  })

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <RemoteRefreshListener scopeType="event" scopeId={event.id} hardReload />

      <div className="mx-auto max-w-5xl px-6 py-10">
        <section className="mb-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Live routing</div>
              <div className="mt-2 text-xl font-semibold">{destination.label}</div>
              <p className="mt-2 text-sm leading-6 text-white/65">{destination.description}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/65">
              <div>Mode: <span className="text-white">{liveState?.mode || "lobby"}</span></div>
              <div className="mt-1">Destination: <span className="text-emerald-200">{destination.href}</span></div>
            </div>
          </div>
        </section>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/50">
              Event
            </div>
            <h1 className="mt-2 text-4xl font-semibold">{event.title} Breakouts</h1>
            <p className="mt-3 max-w-2xl text-white/65">
              Explore breakout rooms, side sessions, and focused discussions.
            </p>
          </div>

          <Link
            href={`/events/${slug}`}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Back to event
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">
            No breakouts have been added yet.
          </div>
        ) : (
          <EventBreakoutMagnifyList
            items={items.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              join_link: item.join_link,
              whenLabel: formatWhen(item.start_at, item.end_at),
              speakerName: item.speaker_name,
              speakerAvatarUrl: item.speaker_avatar_url,
              status: getBreakoutRuntimeStatus(
                { id: item.id, start_at: item.start_at, end_at: item.end_at, manual_live: !!item.manual_live },
                liveState
              ),
              autoOpen: !!item.auto_open,
            }))}
          />
        )}
      </div>
    </main>
  )
}