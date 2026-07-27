import Link from "next/link"
import { redirect } from "next/navigation"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { canViewerAccessSession } from "@/lib/domain/access"
import { listEventSessions } from "@/lib/repos/sessionsRepo"
import { buildEventViewerContext } from "@/lib/services/events/buildEventViewerContext"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import {
  normalizeEventPageSections,
  withRequiredSystemComponent,
} from "@/lib/page-editor/normalizeEventPageSections"
import type { EventPageSection, EventTheme } from "@/lib/page-editor/sectionTypes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

function getSessionsFallbackSections(eventTitle: string): EventPageSection[] {
  return [
    {
      id: "sessions-hero",
      type: "hero",
      config: {
        visible: true,
        title: `${eventTitle} — My Sessions`,
        body: "View only the sessions available to your current event access.",
        adminLabel: "Sessions Hero",
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
      id: "sessions-content",
      type: "content",
      config: {
        visible: true,
        title: "",
        body: null,
        adminLabel: "Sessions List",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "sessions-list-block",
          type: "system_component",
          props: {
            componentKey: "sessions_list",
            containerStyle: "none",
          },
        },
      ],
    },
  ]
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

  const pageDocument = await loadEventPageDocument(event.id, "sessions")

  const eventTheme = normalizeTheme(eventRow?.event_theme)
  const savedSections = normalizeEventPageSections(pageDocument.sections)
  const baseSections =
    savedSections.length > 0
      ? savedSections
      : getSessionsFallbackSections(event.title)
  const sections = withRequiredSystemComponent(
    baseSections,
    "sessions_list",
    {
      sectionId: "sessions-list-runtime",
      adminLabel: "Sessions List",
    },
  )

  return (
    <EventPageRenderer
      event={event}
      elements={pageDocument.elements}
      sections={sections}
      systemComponents={{
        sessions_list: renderSessionsGrid(sessions, slug),
      }}
      eventTheme={eventTheme ?? undefined}
      layout="card-stack"
      stackedPadding="spacious"
    />
  )
}
