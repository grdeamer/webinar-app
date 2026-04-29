import Link from "next/link"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
}

type EventRow = {
  id: string
  slug: string
  title: string
  description: string | null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export default async function AdminEventDashboardPage({ params }: PageProps) {
  const { id } = await params

  let event: EventRow | null = null

  if (isUuid(id)) {
    const { data } = await supabaseAdmin
      .from("events")
      .select("id,slug,title,description")
      .eq("id", id)
      .maybeSingle()

    event = (data as EventRow | null) ?? null
  } else {
    const { data } = await supabaseAdmin
      .from("events")
      .select("id,slug,title,description")
      .eq("slug", id)
      .maybeSingle()

    event = (data as EventRow | null) ?? null
  }

  if (!event) notFound()

  const [
    sessionsResult,
    attendeesResult,
    breakoutsResult,
    routingStateResult,
    presenceResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("event_sessions")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id),

    supabaseAdmin
      .from("event_attendees")
      .select("user_id", { count: "exact", head: true })
      .eq("event_id", event.id),

    supabaseAdmin
      .from("event_breakouts")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id),

    supabaseAdmin
      .from("event_live_state")
      .select("mode,destination_type,destination_session_id,transition_type,transition_active,transition_duration_ms,headline,message")
      .eq("event_id", event.id)
      .maybeSingle(),

    supabaseAdmin
      .from("event_presence")
      .select("user_id,last_seen")
      .eq("event_id", event.id),
  ])

  const sessionCount = sessionsResult.count ?? 0
  const attendeeCount = attendeesResult.count ?? 0
  const breakoutCount = breakoutsResult.count ?? 0

  const routingMode = routingStateResult.data?.mode ?? "not_set"

  let currentDestinationLabel = "Not Set"

  if (routingStateResult.data?.mode === "general_session") {
    currentDestinationLabel = "Main Stage"
  } else if (routingStateResult.data?.mode === "off_air") {
    currentDestinationLabel = "Off Air"
  } else if (
    routingStateResult.data?.destination_session_id &&
    routingStateResult.data?.destination_type === "session"
  ) {
    const destinationId = routingStateResult.data.destination_session_id

    const { data: sessionMatch } = await supabaseAdmin
      .from("event_sessions")
      .select("title")
      .eq("id", destinationId)
      .maybeSingle()

    if (sessionMatch?.title) {
      currentDestinationLabel = sessionMatch.title
    } else {
      const { data: breakoutMatch } = await supabaseAdmin
        .from("event_breakouts")
        .select("title")
        .eq("id", destinationId)
        .maybeSingle()

      if (breakoutMatch?.title) {
        currentDestinationLabel = breakoutMatch.title
      } else {
        currentDestinationLabel = "Unknown Destination"
      }
    }
  }

  const now = Date.now()
  const activeWindowMs = 30_000
  const liveNowCount = (presenceResult.data ?? []).filter((row) => {
    if (!row.last_seen) return false
    return now - new Date(row.last_seen).getTime() <= activeWindowMs
  }).length

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Event Dashboard
          </div>
          <h1 className="mt-2 text-3xl font-semibold">{event.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
            {event.description?.trim()
              ? event.description
              : "Manage routing, sessions, attendees, producer tools, and event pages from one place."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <QuickLink href={`/admin/events/${event.id}/routing`} label="Open Routing" />
            <QuickLink href={`/admin/events/${event.id}/producer/room`} label="Open Producer" />
            <QuickLink href={`/admin/events/${event.id}/sessions`} label="Manage Sessions" />
            <QuickLink href={`/admin/events/${event.id}/attendees`} label="View Attendees" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Sessions" value={sessionCount} />
          <StatCard label="Attendees" value={attendeeCount} />
          <StatCard label="Breakouts" value={breakoutCount} />
          <StatCard label="In Event Now" value={liveNowCount} />
          <StatCard label="Routing Mode" value={formatRoutingMode(routingMode)} />
          <StatCard label="Current Destination" value={currentDestinationLabel} />
        </section>
        <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <Panel
            title="Live Status"
            body="Current event routing and transition state."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Routing Mode
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {formatRoutingMode(routingMode)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Current Destination
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {currentDestinationLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Transition
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {routingStateResult.data?.transition_type
                    ? routingStateResult.data.transition_type.replace(/_/g, " ")
                    : "None"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-white/40">
                  Transition Status
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {routingStateResult.data?.transition_active ? "Active" : "Idle"}
                </div>
              </div>
            </div>

            {(routingStateResult.data?.headline || routingStateResult.data?.message) && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-white/40">
                  On-Screen Messaging
                </div>
                <div className="mt-2 text-base font-medium text-white">
                  {routingStateResult.data?.headline || "—"}
                </div>
                <div className="mt-1 text-sm leading-6 text-white/60">
                  {routingStateResult.data?.message || "—"}
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="Quick Control"
            body="Jump directly into live audience routing."
          >
            <div className="space-y-3">
              <QuickLink href={`/admin/events/${event.id}/routing`} label="Open Routing" />
              <QuickLink href={`/admin/events/${event.id}/producer`} label="Open Producer" />
            </div>
          </Panel>
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Broadcast Control"
            body="Launch live routing controls, producer tools, and stage workflows."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DashboardCard
                href={`/admin/events/${event.id}/routing`}
                title="Routing"
                description="Control where attendees are sent across the event."
              />
              <DashboardCard
                href={`/admin/events/${event.id}/producer/room`}
                title="Producer"
                description="Open the producer room for live switching and stage control."
              />
            </div>
          </Panel>

          <Panel
            title="Event Setup"
            body="Manage your sessions, attendee list, and event pages."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <DashboardCard
                href={`/admin/events/${event.id}/sessions`}
                title="Sessions"
                description="Edit sessions and main stage setup."
              />
              <DashboardCard
                href={`/admin/events/${event.id}/attendees`}
                title="Attendees"
                description="View registrations and live presence."
              />
              <DashboardCard
                href={`/admin/page-editor/event/${event.slug}`}
                title="Pages"
                description="Edit attendee-facing event pages."
              />
            </div>
          </Panel>
        </section>
      </div>
    </div>
  )
}

function formatRoutingMode(value: string) {
  if (value === "general_session") return "Main Stage"
  if (value === "off_air") return "Off Air"
  if (value === "not_set") return "Not Set"
  return value.replace(/_/g, " ")
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-xs uppercase tracking-[0.14em] text-white/40">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
    </div>
  )
}

function Panel({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
      <div className="mt-5">{children}</div>
    </div>
  )
}

function DashboardCard({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      <div className="text-base font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>
      <div className="mt-4 text-sm font-medium text-sky-200">Open →</div>
    </Link>
  )
}

function QuickLink({
  href,
  label,
}: {
  href: string
  label: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
    >
      {label}
    </Link>
  )
}