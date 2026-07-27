import Link from "next/link"
import EventChatRoom from "@/components/EventChatRoom"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import { getEventBySlug } from "@/lib/events"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import {
  normalizeEventPageSections,
  withRequiredSystemComponent,
} from "@/lib/page-editor/normalizeEventPageSections"
import type { EventTheme } from "@/lib/page-editor/sectionTypes"
import type { EventPageSection } from "@/lib/page-editor/sectionTypes"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getEngageFallbackSections(eventTitle: string): EventPageSection[] {
  return [
    {
      id: "engage-hero",
      type: "hero",
      config: {
        visible: true,
        title: `${eventTitle} Engage`,
        body: "Event-wide conversation lives here. Chat, audience energy, and shared discussion belong to the whole event experience.",
        adminLabel: "Engage Hero",
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
      id: "engage-chat",
      type: "content",
      config: {
        visible: true,
        title: "",
        body: null,
        adminLabel: "Chat",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "engage-chat-block",
          type: "system_component",
          props: {
            componentKey: "chat",
            containerStyle: "panel",
          },
        },
      ],
    },
  ]
}

export default async function EventChatPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)
  const [pageDocument, { data: eventRow }] = await Promise.all([
    loadEventPageDocument(event.id, "chat"),
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
      : getEngageFallbackSections(event.title)
  const sections = withRequiredSystemComponent(baseSections, "chat", {
    sectionId: "engage-chat-runtime",
    adminLabel: "Chat",
    containerStyle: "panel",
  })
  const eventTheme =
    eventRow?.event_theme && typeof eventRow.event_theme === "object"
      ? (eventRow.event_theme as EventTheme)
      : undefined
  const chatRoom = <EventChatRoom eventSlug={slug} roomKey="general" />

  return (
    <EventPageRenderer
      event={event}
      elements={pageDocument.elements}
      sections={sections}
      systemComponents={{ chat: chatRoom }}
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
