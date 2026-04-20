import Link from "next/link"
import type { CSSProperties } from "react"
import { redirect } from "next/navigation"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { canViewerAccessSession } from "@/lib/domain/access"
import { listEventSessions } from "@/lib/repos/sessionsRepo"
import { buildEventViewerContext } from "@/lib/services/events/buildEventViewerContext"
import type { EventTheme, SectionBlock } from "@/lib/page-editor/sectionTypes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type StoredSection = {
  id: string
  type: string
  config?: Record<string, unknown> | null
  blocks?: SectionBlock[]
}

function formatDatePretty(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function isUpcoming(iso: string | null) {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() >= Date.now()
}

function sessionBadge(iso: string | null) {
  if (isUpcoming(iso)) {
    return {
      label: "UPCOMING",
      cls: "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/30",
    }
  }

  return {
    label: "ASSIGNED",
    cls: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  }
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

async function getVisibleEventSessions(
  eventId: string,
  viewer: Awaited<ReturnType<typeof buildEventViewerContext>>
) {
  const sessions = await listEventSessions(eventId)

  const visibleSessions = sessions.filter((session) => {
    const access = canViewerAccessSession(session, viewer)
    return access.canView
  })

  visibleSessions.sort((a, b) => {
    const ta = a.startsAt ? new Date(a.startsAt).getTime() : Infinity
    const tb = b.startsAt ? new Date(b.startsAt).getTime() : Infinity
    return ta - tb
  })

  return visibleSessions
}

function getPageStyle(theme: EventTheme | null): CSSProperties {
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
): CSSProperties {
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

  const style: CSSProperties = {
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

function renderSessionsGrid(
  sessions: Awaited<ReturnType<typeof getVisibleEventSessions>>,
  slug: string
) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
        <h2 className="text-xl font-semibold">No sessions available</h2>
        <p className="mt-2 text-white/60">
          If you think this is a mistake, contact the event admin.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {sessions.map((session) => {
        const badge = sessionBadge(session.startsAt)
        const datePretty = formatDatePretty(session.startsAt)
        const joinHref = session.externalJoinUrl || session.joinLink || null

        return (
          <div
            key={session.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-7"
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}
              >
                {badge.label}
              </span>

              {datePretty ? (
                <span className="text-xs text-white/60">{datePretty}</span>
              ) : null}
            </div>

            <h3 className="mt-4 text-xl font-semibold">{session.title}</h3>

            {session.description ? (
              <p className="mt-3 text-white/65">{session.description}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/events/${slug}/sessions/${session.id}`}
                className="rounded-xl bg-white px-5 py-3 font-medium text-slate-950"
              >
                View Session
              </Link>

              {session.deliveryMode === "external" && joinHref ? (
                <a
                  href={joinHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-500"
                >
                  Join session
                </a>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function renderBlock(
  block: SectionBlock,
  sessions: Awaited<ReturnType<typeof getVisibleEventSessions>>,
  slug: string
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
      case "sessions_list":
        return renderSessionsGrid(sessions, slug)

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

export default async function EventSessionsPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params

  const event = await getEventBySlug(slug)
  const viewer = await buildEventViewerContext(slug, event.id)

  if (viewer.type === "guest") {
    redirect(`/events/${slug}`)
  }

  const sessions = await getVisibleEventSessions(event.id, viewer)

  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select("event_theme")
    .eq("id", event.id)
    .maybeSingle()

  const { data: pageRow } = await supabaseAdmin
    .from("event_page_sections")
    .select("sections")
    .eq("event_id", event.id)
    .eq("page_key", "sessions")
    .maybeSingle()

  const eventTheme = normalizeTheme(eventRow?.event_theme)
  const sections = normalizeSections(pageRow?.sections)

  const hasSavedSections = sections.length > 0

  if (!hasSavedSections) {
    return (
      <main className="min-h-screen text-white" style={getPageStyle(eventTheme)}>
        <div className="relative mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {event.title} — My Sessions
              </h1>
              <p className="mt-1 text-white/60">
                View only the sessions available to your current event access.
              </p>
            </div>
          </div>

          <div className="mt-8">{renderSessionsGrid(sessions, slug)}</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-white" style={getPageStyle(eventTheme)}>
      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="space-y-8">
          {sections
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
                      {title ? (
                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                          {title}
                        </h1>
                      ) : (
                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                          {event.title} — My Sessions
                        </h1>
                      )}

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
                      <div key={block.id}>{renderBlock(block, sessions, slug)}</div>
                    ))}
                  </div>
                </section>
              )
            })}
        </div>
      </div>
    </main>
  )
}