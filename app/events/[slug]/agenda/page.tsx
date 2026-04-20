import Link from "next/link"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import EventScheduleRail from "@/components/EventScheduleRail"
import { getEventUserOrNull } from "@/lib/eventAuth"
import EventEmailGate from "../EventEmailGate"
import type { EventPageSection, EventTheme, SectionBlock } from "@/lib/page-editor/sectionTypes"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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

function renderAgendaRail(
  slug: string,
  agenda: Array<{
    id: string
    title?: string | null
    start_at?: string | null
    end_at?: string | null
    track?: string | null
    speaker?: string | null
  }>
) {
  if (agenda.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white/70">
        No agenda items yet.
      </div>
    )
  }

  return (
    <EventScheduleRail
      items={agenda.map((item) => ({
        id: item.id,
        title: item.title ?? "Untitled",
        start_at: item.start_at ?? "",
        end_at: item.end_at ?? "",
        track: item.track ?? undefined,
        speaker: item.speaker ?? undefined,
      }))}
      eventSlug={slug}
    />
  )
}

function renderBlock(
  block: SectionBlock,
  slug: string,
  agenda: Array<{
    id: string
    title?: string | null
    start_at?: string | null
    end_at?: string | null
    track?: string | null
    speaker?: string | null
  }>
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
      case "agenda":
      case "schedule_rail":
        return renderAgendaRail(slug, agenda)

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



export default async function EventAgendaPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)
  const authed = await getEventUserOrNull({ slug })

  if (!authed) {
    return <EventEmailGate slug={slug} eventTitle={event.title} />
  }

  const [{ data: eventRow }, { data: pageRow }, { data: agendaRows }] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("event_theme")
      .eq("id", event.id)
      .maybeSingle(),

    supabaseAdmin
      .from("event_page_sections")
      .select("sections")
      .eq("event_id", event.id)
      .eq("page_key", "agenda")
      .maybeSingle(),

    supabaseAdmin
      .from("event_agenda_items")
      .select("id,title,start_at,end_at,track,speaker,description")
      .eq("event_id", event.id)
      .order("start_at", { ascending: true, nullsFirst: false }),
  ])

  const eventTheme = normalizeTheme(eventRow?.event_theme)
  const storedSections = normalizeSections(pageRow?.sections)
  const agenda = (agendaRows ?? []) as Array<{
    id: string
    title?: string | null
    start_at?: string | null
    end_at?: string | null
    track?: string | null
    speaker?: string | null
    description?: string | null
  }>

  if (storedSections.length === 0) {
    return (
      <main className="min-h-screen text-white" style={getPageStyle(eventTheme)}>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="mb-6 text-4xl font-semibold">{event.title} Agenda</h1>

          {renderAgendaRail(slug, agenda)}

          <Link
            href={`/events/${slug}`}
            className="mt-6 inline-block text-cyan-300"
          >
            ← Back to event
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-white" style={getPageStyle(eventTheme)}>
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
                        {title || `${event.title} Agenda`}
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
                      <div key={block.id}>{renderBlock(block, slug, agenda)}</div>
                    ))}
                  </div>
                </section>
              )
            })}

          <Link
            href={`/events/${slug}`}
            className="inline-block text-cyan-300"
          >
            ← Back to event
          </Link>
        </div>
      </div>
    </main>
  )
}