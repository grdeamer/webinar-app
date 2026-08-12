import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Activity,
  ArrowRight,
  ListOrdered,
  LayoutTemplate,
  Radio,
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
  "relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(8,12,22,0.94),rgba(3,6,13,0.985))] shadow-[0_20px_60px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.045)]"

const DASHBOARD_PANEL_CLASS =
  "relative overflow-hidden rounded-[22px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.016))] shadow-[inset_0_1px_0_rgba(255,255,255,0.028)]"

const DASHBOARD_PANEL_GLOW_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-100/[0.10] to-transparent"

const DASHBOARD_GRID_TEXTURE_CLASS =
  "pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.018)_0px,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_18px)]"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function countLivePresence(rows: Array<{ last_seen: string | null }>) {
  const now = Date.now()
  const activeWindowMs = 30_000

  return rows.filter((row) => {
    if (!row.last_seen) return false
    return now - new Date(row.last_seen).getTime() <= activeWindowMs
  }).length
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
      .from("event_registrants")
      .select("id", { count: "exact", head: true })
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

  const liveNowCount = countLivePresence(presenceResult.data ?? [])
  const transitionLabel = routingStateResult.data?.transition_type
    ? routingStateResult.data.transition_type.replace(/_/g, " ")
    : "None"

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.055),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.065),transparent_26%),linear-gradient(180deg,#050816_0%,#040712_42%,#02040a_100%)] p-4 text-white sm:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <section className={`${DASHBOARD_SHELL_CLASS} p-6 lg:p-7`}>
          <div className={DASHBOARD_GRID_TEXTURE_CLASS} />
          <div className={DASHBOARD_PANEL_GLOW_CLASS} />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/[0.12] bg-violet-300/[0.07] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-violet-50/68">
                <Wand2 size={12} />
                Event Workspace
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white lg:text-4xl">
                {event.title}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                {event.description?.trim()
                  ? event.description
                  : "Monitor event readiness and launch the tools needed to run the show."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <HeaderAction
                href={`/admin/events/${event.id}/producer/room`}
                label="Producer Room"
                icon={<Radio size={15} />}
                primary
              />

              <HeaderAction
                href={`/admin/page-editor/event/${event.slug}`}
                label="Experience"
                icon={<LayoutTemplate size={15} />}
              />
            </div>
          </div>
        </section>

        <section className="grid overflow-hidden rounded-[22px] border border-white/[0.07] bg-white/[0.025] sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Sessions" value={sessionCount} />
          <SummaryStat label="Registrants" value={attendeeCount} />
          <SummaryStat label="Breakouts" value={breakoutCount} />
          <SummaryStat label="Live Now" value={liveNowCount} />
        </section>

        <section className={`${DASHBOARD_PANEL_CLASS} p-6 lg:p-7`}>
          <div className={DASHBOARD_GRID_TEXTURE_CLASS} />
          <div className={DASHBOARD_PANEL_GLOW_CLASS} />

          <div className="relative z-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/40">
                  Live Operations
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                  Audience state
                </h2>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/[0.12] bg-emerald-300/[0.06] px-3 py-1.5 text-xs font-semibold text-emerald-100/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Runtime connected
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="grid gap-px overflow-hidden rounded-[18px] border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2">
                  <StatusItem label="Current Route" value={currentDestinationLabel} />
                  <StatusItem label="Routing Mode" value={formatRoutingMode(routingMode)} />
                  <StatusItem label="Transition" value={transitionLabel} />
                  <StatusItem
                    label="Transition State"
                    value={routingStateResult.data?.transition_active ? "Active" : "Idle"}
                  />
                </div>

                {(routingStateResult.data?.headline || routingStateResult.data?.message) ? (
                  <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-black/20 px-5 py-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/32">
                      Audience Message
                    </div>
                    <div className="mt-2 font-semibold text-white/86">
                      {routingStateResult.data?.headline || "—"}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-white/50">
                      {routingStateResult.data?.message || "—"}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2.5">
                <ActionLink
                  href={`/admin/events/${event.id}/routing`}
                  title="Run Event"
                  description="Control where attendees go."
                  icon={<Activity size={17} />}
                />
                <ActionLink
                  href={`/admin/events/${event.id}/agenda`}
                  title="Run of Show"
                  description="Manage live cues and timing."
                  icon={<ListOrdered size={17} />}
                />
              </div>
            </div>
          </div>
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

function SummaryStat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="border-white/[0.07] px-5 py-4 sm:[&:nth-child(even)]:border-l xl:[&:not(:first-child)]:border-l">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/32">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white/90">
        {value}
      </div>
    </div>
  )
}

function ActionLink({
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
      className="group flex items-center gap-3 rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-violet-200/[0.16] hover:bg-violet-300/[0.05]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-white/[0.07] bg-black/20 text-white/50 transition group-hover:text-violet-100">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-white/86 group-hover:text-white">{title}</div>
        <div className="mt-0.5 text-xs text-white/42">{description}</div>
      </div>
      <ArrowRight size={15} className="text-white/28 transition group-hover:translate-x-0.5 group-hover:text-violet-100" />
    </Link>
  )
}

function StatusItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="bg-[#060912] px-5 py-4">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold capitalize text-white/84">
        {value}
      </div>
    </div>
  )
}

function HeaderAction({
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
        "group inline-flex items-center justify-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm font-semibold transition duration-200",
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
