import Link from "next/link"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import { getEventUserOrNull } from "@/lib/eventAuth"
import EventEmailGate from "../EventEmailGate"
import type { EventPageSection, EventTheme, SectionBlock } from "@/lib/page-editor/sectionTypes"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Sponsor = {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  tier: string | null
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

function renderSponsorsGrid(sponsors: Sponsor[]) {
  if (sponsors.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white/70">
        No sponsors yet.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sponsors.map((sponsor) => (
        <article
          key={sponsor.id}
          className="rounded-2xl border border-white/10 bg-black/20 p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{sponsor.name}</h3>
            {sponsor.tier ? (
              <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
                {sponsor.tier}
              </div>
            ) : null}
          </div>

          {sponsor.logo_url ? (
            <img
              src={sponsor.logo_url}
              alt={sponsor.name}
              className="mt-4 h-14 w-auto max-w-full object-contain"
            />
          ) : null}

          {sponsor.description ? (
            <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/70">
              {sponsor.description}
            </div>
          ) : null}

          {sponsor.website_url ? (
            <a
              href={sponsor.website_url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Visit booth →
            </a>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function renderBlock(block: SectionBlock, sponsors: Sponsor[]) {
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
    return renderSponsorsGrid(sponsors)
  }

  return null
}

function getFallbackSections(eventTitle: string): EventPageSection[] {
  return [
    {
      id: "hero",
      type: "hero",
      config: {
        visible: true,
        adminLabel: "Sponsors Hero",
        title: `${eventTitle} Sponsors`,
        body: "Thanks to the teams who help make this event possible.",
        backgroundStyle: "transparent",
        contentWidth: "full",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      } as any,
      blocks: [],
    },
    {
      id: "sponsors",
      type: "content",
      config: {
        visible: true,
        adminLabel: "Sponsor Grid",
        title: "Sponsor Booths",
        body: "Browse sponsor profiles, logos, and booth links.",
        backgroundStyle: "panel",
        contentWidth: "full",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      } as any,
      blocks: [
{
  id: "sponsor-cards-block",
  type: "rich_text",
  props: {
    title: "",
    body: "",
  },
},
      ],
    },
  ]
}

export default async function SponsorsPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)
  const authed = await getEventUserOrNull({ slug })

  if (!authed) {
    return <EventEmailGate slug={slug} eventTitle={event.title} />
  }

  const [{ data: eventRow }, { data: pageRow }, { data, error }] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("event_theme")
      .eq("id", event.id)
      .maybeSingle(),

    supabaseAdmin
      .from("event_page_sections")
      .select("sections")
      .eq("event_id", event.id)
      .eq("page_key", "sponsors")
      .maybeSingle(),

    supabaseAdmin
      .from("event_sponsors")
      .select("id,name,description,logo_url,website_url,tier")
      .eq("event_id", event.id)
      .order("sort_index", { ascending: true }),
  ])

  if (error) throw new Error(error.message)

  const sponsors = (data || []) as Sponsor[]
  const eventTheme = normalizeTheme(eventRow?.event_theme)
  const storedSections = normalizeSections(pageRow?.sections)

  if (storedSections.length === 0) {
    return (
      <main className="min-h-screen text-white" style={getPageStyle(eventTheme)}>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="mb-2 text-4xl font-semibold">{event.title} Sponsors</h1>
          <p className="mb-6 text-white/60">Thanks to the teams who make this possible.</p>

          {renderSponsorsGrid(sponsors)}

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
                        {title || `${event.title} Sponsors`}
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
                      <div key={block.id}>{renderBlock(block, sponsors)}</div>
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