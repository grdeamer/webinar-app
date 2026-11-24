import { SessionLayouts } from "@/components/events/SessionLayouts"
import { sanitizeMeetingUrl } from "@/lib/meetingLinks"
import { redirect } from "next/navigation"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import { getEventBySlug } from "@/lib/events"
import { canViewerAccessSession } from "@/lib/domain/access"
import { listEventSessions } from "@/lib/repos/sessionsRepo"
import { buildEventViewerContext } from "@/lib/services/events/buildEventViewerContext"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import {
  normalizeEventPageSections,
  withRequiredSystemComponent,
} from "@/lib/page-editor/normalizeEventPageSections"
import type { EventPageSection } from "@/lib/page-editor/sectionTypes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

function meetingHref(value?: string | null) {
  try { return sanitizeMeetingUrl(value ?? "") }
  catch { return null }
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

  const pageDocument = await loadEventPageDocument(event.id, "sessions")
  const eventTheme = pageDocument.eventTheme
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

  const settings = sections.flatMap((section) => section.blocks ?? []).find((block) =>
    block.type === "system_component" && block.props.componentKey === "sessions_list"
  )?.props
  const items = sessions.map((session) => {
    const start = session.startsAt ? new Date(session.startsAt) : null
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      presenter: session.presenter,
      date: start?.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }),
      time: start?.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", timeZoneName: "short" }),
      status: session.runtimeStatus === "live" ? "Live now" : session.runtimeStatus === "ended" ? "Ended" : start && +start > Date.now() ? "Upcoming" : undefined,
      detailsHref: `/events/${slug}/sessions/${session.id}`,
      joinHref: session.deliveryMode === "external" ? meetingHref(session.externalJoinUrl || session.joinLink) : null,
    }
  })

  return (
    <EventPageRenderer
      event={event}
      elements={pageDocument.elements}
      sections={sections}
      systemComponents={{
        sessions_list: <SessionLayouts items={items} theme={eventTheme} settings={settings as Record<string, unknown> | undefined} />,
      }}
      eventTheme={eventTheme ?? undefined}
      layout="card-stack"
      stackedPadding="spacious"
    />
  )
}
