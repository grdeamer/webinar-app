import Link from "next/link"
import NetworkingRoom from "@/components/NetworkingRoom"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import { getEventBySlug } from "@/lib/events"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import {
  normalizeEventPageSections,
  withRequiredSystemComponent,
} from "@/lib/page-editor/normalizeEventPageSections"
import type {
  EventPageSection,
  EventTheme,
} from "@/lib/page-editor/sectionTypes"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getNetworkingFallbackSections(eventTitle: string): EventPageSection[] {
  return [
    {
      id: "networking-hero",
      type: "hero",
      config: {
        visible: true,
        title: `${eventTitle} Networking`,
        body: "Meet attendees and join the event-wide networking space.",
        adminLabel: "Networking Hero",
        backgroundStyle: "subtle",
        contentWidth: "xl",
        paddingY: "lg",
        textAlign: "left",
        divider: "bottom",
        hideOnMobile: false,
      },
      blocks: [],
    },
    {
      id: "networking-room",
      type: "content",
      config: {
        visible: true,
        title: "",
        body: null,
        adminLabel: "Networking Room",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "networking-room-block",
          type: "system_component",
          props: {
            componentKey: "networking",
            containerStyle: "none",
          },
        },
      ],
    },
  ]
}

export default async function EventNetworkingPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)
  const [pageDocument, { data: eventRow }] = await Promise.all([
    loadEventPageDocument(event.id, "networking"),
    supabaseAdmin
      .from("events")
      .select("event_theme")
      .eq("id", event.id)
      .maybeSingle(),
  ])
  const savedSections = normalizeEventPageSections(pageDocument.sections)
  const baseSections =
    savedSections.length > 0
      ? savedSections
      : getNetworkingFallbackSections(event.title)
  const sections = withRequiredSystemComponent(baseSections, "networking", {
    sectionId: "networking-room-runtime",
    adminLabel: "Networking Room",
  })
  const eventTheme =
    eventRow?.event_theme && typeof eventRow.event_theme === "object"
      ? (eventRow.event_theme as EventTheme)
      : undefined

  const networkingRoom = <NetworkingRoom eventSlug={slug} />

  return (
    <EventPageRenderer
      event={event}
      elements={pageDocument.elements}
      sections={sections}
      systemComponents={{ networking: networkingRoom }}
      eventTheme={eventTheme}
      standalone
      afterSections={
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Link
            href={`/events/${slug}`}
            className="mt-6 inline-block text-cyan-300"
          >
            ← Back to event
          </Link>
        </div>
      }
    />
  )
}
