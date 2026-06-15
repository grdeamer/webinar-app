import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  LayoutTemplate,
  Radio,
  Users,
  Wand2,
} from "lucide-react"
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

const DASHBOARD_SHELL_CLASS =
  "relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,12,22,0.94),rgba(3,6,13,0.985))] shadow-[0_24px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.045)]"

const DASHBOARD_PANEL_CLASS =
  "relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] shadow-[inset_0_1px_0_rgba(255,255,255,0.028)]"

const DASHBOARD_PANEL_GLOW_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-100/[0.10] to-transparent"

const DASHBOARD_GRID_TEXTURE_CLASS =
  "pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.018)_0px,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_18px)]"

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.07),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.08),transparent_26%),linear-gradient(180deg,#050816_0%,#040712_42%,#02040a_100%)] px-6 py-6 text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <section className={`${DASHBOARD_SHELL_CLASS} p-8`}>
          <div className={DASHBOARD_GRID_TEXTURE_CLASS} />
          <div className={DASHBOARD_PANEL_GLOW_CLASS} />

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/[0.14] bg-violet-300/[0.08] px-4 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-50/72 shadow-[0_0_18px_rgba(168,85,247,0.08)]">
                <Wand2 size={12} />
                Jupiter Event Workspace
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white xl:text-5xl">
                {event.title}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/54 xl:text-[15px]">
                {event.description?.trim()
                  ? event.description
                  : "Manage routing, sessions, attendees, producer tools, and audience experiences from one cinematic command surface."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[440px]">
              <QuickLink
                href={`/admin/events/${event.id}/producer/room`}
                label="Launch Producer Room"
                icon={<Radio size={15} />}
                primary
              />

              <QuickLink
                href={`/admin/page-editor/event/${event.slug}`}
                label="Open Experience Editor"
                icon={<LayoutTemplate size={15} />}
              />

              <QuickLink
                href={`/admin/events/${event.id}/sessions`}
                label="Manage Sessions"
                icon={<CalendarDays size={15} />}
              />

              <QuickLink
                href={`/admin/events/${event.id}/attendees`}
                label="View Attendees"
                icon={<Users size={15} />}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Sessions" value={sessionCount} />
          <StatCard label="Attendees" value={attendeeCount} />
          <StatCard label="Breakouts" value={breakoutCount} />
          <StatCard label="Live Presence" value={liveNowCount} />
          <StatCard label="Routing Mode" value={formatRoutingMode(routingMode)} />
          <StatCard label="Current Route" value={currentDestinationLabel} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Panel
            title="Live Broadcast State"
            body="Real-time routing and transition telemetry for the audience runtime."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <StatusCard
                label="Routing Mode"
                value={formatRoutingMode(routingMode)}
              />

              <StatusCard
                label="Destination"
                value={currentDestinationLabel}
              />

              <StatusCard
                label="Transition"
                value={
                  routingStateResult.data?.transition_type
                    ? routingStateResult.data.transition_type.replace(/_/g, " ")
                    : "None"
                }
              />

              <StatusCard
                label="Transition State"
                value={routingStateResult.data?.transition_active ? "Active" : "Idle"}
              />
            </div>

            {(routingStateResult.data?.headline || routingStateResult.data?.message) && (
              <div className="relative mt-4 overflow-hidden rounded-[22px] border border-white/[0.07] bg-black/24 p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
                  Audience Messaging
                </div>

                <div className="mt-3 text-xl font-semibold text-white/90">
                  {routingStateResult.data?.headline || "—"}
                </div>

                <div className="mt-2 text-sm leading-7 text-white/56">
                  {routingStateResult.data?.message || "—"}
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="Command Surface"
            body="Fast access into the live operating environment."
          >
            <div className="space-y-3">
              <DashboardCard
                href={`/admin/events/${event.id}/producer/room`}
                title="Producer Room"
                description="Open cinematic switching, overlays, routing, and live control."
                icon={<Radio size={18} />}
              />

              <DashboardCard
                href={`/admin/events/${event.id}/routing`}
                title="Audience Routing"
                description="Control where attendees are sent across the event runtime."
                icon={<Activity size={18} />}
              />
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Broadcast Operations"
            body="Launch production tools, stage orchestration, and runtime control surfaces."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <DashboardCard
                href={`/admin/events/${event.id}/routing`}
                title="Routing"
                description="Manage attendee destinations and live audience flow."
                icon={<Activity size={18} />}
              />

              <DashboardCard
                href={`/admin/events/${event.id}/producer/room`}
                title="Producer"
                description="Operate live switching, overlays, scenes, and transitions."
                icon={<Radio size={18} />}
              />
            </div>
          </Panel>

          <Panel
            title="Experience Management"
            body="Control attendee experiences, sessions, registrations, and event content."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <DashboardCard
                href={`/admin/events/${event.id}/sessions`}
                title="Sessions"
                description="Manage stage programming and schedule structure."
                icon={<CalendarDays size={18} />}
              />

              <DashboardCard
                href={`/admin/events/${event.id}/attendees`}
                title="Attendees"
                description="View registrations, presence, and event participation."
                icon={<Users size={18} />}
              />

              <DashboardCard
                href={`/admin/page-editor/event/${event.slug}`}
                title="Experience"
                description="Design attendee-facing cinematic event pages."
                icon={<LayoutTemplate size={18} />}
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
    <div className={`${DASHBOARD_PANEL_CLASS} p-5`}>
      <div className={DASHBOARD_GRID_TEXTURE_CLASS} />
      <div className="relative z-10">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
          {label}
        </div>

        <div className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">
          {value}
        </div>
      </div>
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
    <div className={`${DASHBOARD_PANEL_CLASS} p-6`}>
      <div className={DASHBOARD_GRID_TEXTURE_CLASS} />
      <div className={DASHBOARD_PANEL_GLOW_CLASS} />

      <div className="relative z-10">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
          {title}
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/52">
          {body}
        </p>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

function DashboardCard({
  href,
  title,
  description,
  icon,
}: {
  href: string
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 transition duration-200 hover:border-violet-200/[0.18] hover:bg-violet-300/[0.05]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white/90 transition group-hover:text-white">
            {title}
          </div>

          <div className="mt-2 text-sm leading-7 text-white/52 transition group-hover:text-white/66">
            {description}
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/[0.08] bg-black/24 text-white/58 transition group-hover:border-violet-200/[0.18] group-hover:bg-violet-300/[0.08] group-hover:text-white">
          {icon}
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-violet-100/72 transition group-hover:text-violet-50">
        Open Workspace
        <ArrowUpRight size={14} />
      </div>
    </Link>
  )
}

function StatusCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/[0.07] bg-black/24 p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/34">
        {label}
      </div>

      <div className="mt-3 text-xl font-semibold text-white/90">
        {value}
      </div>
    </div>
  )
}

function QuickLink({
  href,
  label,
  icon,
  primary = false,
}: {
  href: string
  label: string
  icon?: React.ReactNode
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={[
        "group inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-semibold transition duration-200",
        primary
          ? "border-violet-200/[0.16] bg-violet-300/[0.12] text-white shadow-[0_0_28px_rgba(168,85,247,0.10)] hover:bg-violet-300/[0.18]"
          : "border-white/[0.08] bg-white/[0.04] text-white/72 hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white",
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}