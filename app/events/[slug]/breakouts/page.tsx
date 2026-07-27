import Link from "next/link"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import RemoteRefreshListener from "@/components/RemoteRefreshListener"
import EventBreakoutMagnifyList from "@/components/EventBreakoutMagnifyList"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import EventEmailGate from "../EventEmailGate"
import { getEventUserOrNull } from "@/lib/eventAuth"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import {
  hasSystemComponent,
  normalizeEventPageSections,
  withRequiredSystemComponent,
} from "@/lib/page-editor/normalizeEventPageSections"
import {
  getBreakoutRuntimeStatus,
  getEventLiveDestination,
  getEventLiveState,
} from "@/lib/app/liveState"
import type { EventPageSection, EventTheme } from "@/lib/page-editor/sectionTypes"

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

function normalizeTheme(input: unknown): EventTheme | null {
  if (!input || typeof input !== "object") return null
  return input as EventTheme
}

function formatWhen(startAt: string | null, endAt: string | null) {
  if (!startAt && !endAt) return "Time TBA"

  const start = startAt ? new Date(startAt) : null
  const end = endAt ? new Date(endAt) : null

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

function renderBreakoutsList(
  items: BreakoutRow[],
  slug: string,
  liveState: Awaited<ReturnType<typeof getEventLiveState>>
) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">
        No breakouts have been added yet.
      </div>
    )
  }

  return (
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
          {
            id: item.id,
            start_at: item.start_at,
            end_at: item.end_at,
            manual_live: !!item.manual_live,
          },
          liveState
        ),
        autoOpen: !!item.auto_open,
      }))}
    />
  )
}

function getBreakoutsFallbackSections(eventTitle: string): EventPageSection[] {
  return [
    {
      id: "breakouts-live-state",
      type: "content",
      config: {
        visible: true,
        title: "",
        body: null,
        adminLabel: "Live Routing",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "breakouts-live-state-block",
          type: "system_component",
          props: {
            componentKey: "live_state",
            containerStyle: "none",
          },
        },
      ],
    },
    {
      id: "breakouts-hero",
      type: "hero",
      config: {
        visible: true,
        title: `${eventTitle} Breakouts`,
        body: "Explore breakout rooms, side sessions, and focused discussions.",
        adminLabel: "Breakouts Hero",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [],
    },
    {
      id: "breakouts-content",
      type: "content",
      config: {
        visible: true,
        title: "",
        body: null,
        adminLabel: "Breakout Rooms",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "breakouts-list-block",
          type: "system_component",
          props: {
            componentKey: "featured_breakouts",
            containerStyle: "none",
          },
        },
      ],
    },
  ]
}

export default async function EventBreakoutsPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)
  const authed = await getEventUserOrNull({ slug })

  if (!authed) {
    return <EventEmailGate slug={slug} eventTitle={event.title} />
  }

  const [{ data: eventRow }, pageDocument, { data, error }, liveState] = await Promise.all([
    supabaseAdmin.from("events").select("event_theme").eq("id", event.id).maybeSingle(),

    loadEventPageDocument(event.id, "breakouts"),

    supabaseAdmin
      .from("event_breakouts")
      .select(
        "id,title,description,join_link,start_at,end_at,speaker_name,speaker_avatar_url,manual_live,auto_open"
      )
      .eq("event_id", event.id)
      .order("manual_live", { ascending: false })
      .order("start_at", { ascending: true, nullsFirst: false }),

    getEventLiveState(event.id),
  ])

  if (error) throw new Error(error.message)

  const items = (data || []) as BreakoutRow[]
  const eventTheme = normalizeTheme(eventRow?.event_theme)
  const storedSections = normalizeEventPageSections(pageDocument.sections)

  const destination = getEventLiveDestination({
    slug,
    liveState,
    breakouts: items.map((item) => ({
      ...item,
      event_id: event.id,
      created_at: item.id,
    })),
  })

  const liveRouting = (
    <section className="rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
            Live routing
          </div>
          <div className="mt-2 text-xl font-semibold">{destination.label}</div>
          <p className="mt-2 text-sm leading-6 text-white/65">
            {destination.description}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/65">
          <div>
            Mode: <span className="text-white">{liveState?.mode || "lobby"}</span>
          </div>
          <div className="mt-1">
            Destination: <span className="text-emerald-200">{destination.href}</span>
          </div>
        </div>
      </div>
    </section>
  )
  const breakoutsList = renderBreakoutsList(items, slug, liveState)
  const baseSections =
    storedSections.length > 0
      ? storedSections
      : getBreakoutsFallbackSections(event.title)
  const sections =
    hasSystemComponent(baseSections, "breakouts") ||
    hasSystemComponent(baseSections, "featured_breakouts")
      ? baseSections
      : withRequiredSystemComponent(baseSections, "featured_breakouts", {
          sectionId: "breakouts-runtime",
          adminLabel: "Breakout Rooms",
        })

  return (
    <EventPageRenderer
      event={event}
      elements={pageDocument.elements}
      sections={sections}
      systemComponents={{
        live_state: liveRouting,
        breakouts: breakoutsList,
        featured_breakouts: breakoutsList,
      }}
      eventTheme={eventTheme ?? undefined}
      layout="card-stack"
      beforeSections={
        <RemoteRefreshListener scopeType="event" scopeId={event.id} hardReload />
      }
      afterSections={
        <Link href={`/events/${slug}`} className="inline-block text-cyan-300">
          ← Back to event
        </Link>
      }
    />
  )
}
