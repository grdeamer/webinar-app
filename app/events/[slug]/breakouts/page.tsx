import Link from "next/link"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import RemoteRefreshListener from "@/components/RemoteRefreshListener"
import EventBreakoutMagnifyList from "@/components/EventBreakoutMagnifyList"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import EventEmailGate from "../EventEmailGate"
import { getEventUserOrNull } from "@/lib/eventAuth"
import {
  getBreakoutRuntimeStatus,
  getEventLiveDestination,
  getEventLiveState,
} from "@/lib/app/liveState"
import type { EventTheme, SectionBlock } from "@/lib/page-editor/sectionTypes"

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

type StoredSection = {
  id: string
  type: string
  config?: Record<string, unknown> | null
  blocks?: SectionBlock[]
}

function normalizeSections(input: unknown): StoredSection[] {
  if (!Array.isArray(input)) return []

  return input.map((section: any, idx: number) => ({
    id:
      typeof section?.id === "string" && section.id.trim().length > 0
        ? section.id
        : `section-${idx + 1}`,
    type: typeof section?.type === "string" ? section.type : "content",
    config:
      section?.config && typeof section.config === "object" ? section.config : {},
    blocks: Array.isArray(section?.blocks) ? section.blocks : [],
  }))
}

function normalizeTheme(input: unknown): EventTheme | null {
  if (!input || typeof input !== "object") return null
  return input as EventTheme
}

function getPageStyle(theme: EventTheme | null): React.CSSProperties {
  const colorA = theme?.gradientColorA || "#020617"
  const colorB = theme?.gradientColorB || "#020617"
  const angle = theme?.gradientAngle || "135deg"

  return {
    color: theme?.textColor || "#ffffff",
    backgroundColor: theme?.pageBackgroundColor || "#020617",
    backgroundImage: `linear-gradient(${angle}, ${colorA}, ${colorB})`,
  }
}

function getPanelStyle(theme: EventTheme | null): React.CSSProperties {
  return {
    backgroundColor: theme?.panelBackgroundColor || "rgba(255,255,255,0.04)",
    borderColor: theme?.panelBorderColor || "rgba(255,255,255,0.10)",
    color: theme?.textColor || "#ffffff",
  }
}

function getSectionStyle(
  section: StoredSection,
  theme: EventTheme | null
): React.CSSProperties {
  const config = section.config ?? {}
  const themeMode = String(config.themeMode ?? "inherit")
  const fillType = String(config.sectionBackgroundFillType ?? "solid")

  if (themeMode !== "custom") {
    return getPanelStyle(theme)
  }

  const backgroundColor = String(config.sectionBackgroundColor ?? "")
  const borderColor = String(config.sectionBorderColor ?? "")
  const textColor = String(config.sectionTextColor ?? "")
  const gradientColorA = String(config.sectionGradientColorA ?? "")
  const gradientColorB = String(config.sectionGradientColorB ?? "")
  const gradientAngle = String(config.sectionGradientAngle ?? "135deg")

  const style: React.CSSProperties = {
    backgroundColor:
      fillType === "solid"
        ? backgroundColor || theme?.panelBackgroundColor || "rgba(255,255,255,0.04)"
        : undefined,
    borderColor: borderColor || theme?.panelBorderColor || "rgba(255,255,255,0.10)",
    color: textColor || theme?.textColor || "#ffffff",
  }

  if (fillType === "linear-gradient" && gradientColorA && gradientColorB) {
    style.backgroundImage = `linear-gradient(${gradientAngle}, ${gradientColorA}, ${gradientColorB})`
  }

  return style
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
  eventId: string,
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

function renderBlock(
  block: SectionBlock,
  items: BreakoutRow[],
  eventId: string,
  slug: string,
  liveState: Awaited<ReturnType<typeof getEventLiveState>>
) {
  if (block.type === "rich_text") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        {block.props.title ? (
          <h3 className="text-lg font-semibold">{String(block.props.title)}</h3>
        ) : null}
        {block.props.body ? (
          <p className="mt-2 text-white/70">{String(block.props.body)}</p>
        ) : null}
      </div>
    )
  }

  if (block.type === "system_component") {
    switch (block.props.componentKey) {
      case "featured_breakouts":
        return renderBreakoutsList(items, eventId, slug, liveState)

      default:
        return (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-white/45">
            {String(block.props.componentKey)} preview is not enabled on this page yet.
          </div>
        )
    }
  }

  return null
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

  const [{ data: eventRow }, { data: pageRow }, { data, error }, liveState] = await Promise.all([
    supabaseAdmin.from("events").select("event_theme").eq("id", event.id).maybeSingle(),

    supabaseAdmin
      .from("event_page_sections")
      .select("sections")
      .eq("event_id", event.id)
      .eq("page_key", "breakouts")
      .maybeSingle(),

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
  const storedSections = normalizeSections(pageRow?.sections)

  const destination = getEventLiveDestination({
    slug,
    liveState,
    breakouts: items.map((item) => ({
      ...item,
      event_id: event.id,
      created_at: item.id,
    })),
  })

  if (storedSections.length === 0) {
    return (
      <main className="min-h-screen text-white" style={getPageStyle(eventTheme)}>
        <RemoteRefreshListener scopeType="event" scopeId={event.id} hardReload />

        <div className="mx-auto max-w-5xl px-6 py-10">
          <section className="mb-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-5">
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

          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Event</div>
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

          {renderBreakoutsList(items, event.id, slug, liveState)}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-white" style={getPageStyle(eventTheme)}>
      <RemoteRefreshListener scopeType="event" scopeId={event.id} hardReload />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-8">
          {storedSections
            .filter((section) => section.config?.visible !== false)
            .map((section) => {
              const config = section.config ?? {}
              const title = String(config.title ?? "")
              const body = String(config.body ?? "")

              if (section.type === "hero") {
                return (
                  <section
                    key={section.id}
                    className="rounded-3xl border p-8 md:p-10"
                    style={getSectionStyle(section, eventTheme)}
                  >
                    <div className="max-w-3xl">
                      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                        {title || `${event.title} Breakouts`}
                      </h1>

                      {body ? (
                        <p className="mt-3 text-base text-white/70 md:text-lg">{body}</p>
                      ) : null}
                    </div>
                  </section>
                )
              }

              return (
                <section
                  key={section.id}
                  className="rounded-3xl border p-6 md:p-8"
                  style={getSectionStyle(section, eventTheme)}
                >
                  {title ? <h2 className="text-2xl font-semibold">{title}</h2> : null}
                  {body ? <p className="mt-2 text-white/70">{body}</p> : null}

                  <div className="mt-6 space-y-6">
                    {(section.blocks ?? []).map((block) => (
                      <div key={block.id}>
                        {renderBlock(block, items, event.id, slug, liveState)}
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}

          <Link href={`/events/${slug}`} className="inline-block text-cyan-300">
            ← Back to event
          </Link>
        </div>
      </div>
    </main>
  )
}