import Link from "next/link"
import EventChatRoom from "@/components/EventChatRoom"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import PersistedPageElementLayer from "@/components/page-renderer/PersistedPageElementLayer"
import { getEventBySlug } from "@/lib/events"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import {
  hasSystemComponent,
  normalizeEventPageSections,
} from "@/lib/page-editor/normalizeEventPageSections"
import type { EventTheme } from "@/lib/page-editor/sectionTypes"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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
  const sections = normalizeEventPageSections(pageDocument.sections)
  const eventTheme =
    eventRow?.event_theme && typeof eventRow.event_theme === "object"
      ? (eventRow.event_theme as EventTheme)
      : undefined
  const chatRoom = <EventChatRoom eventSlug={slug} roomKey="general" />

  if (sections.length > 0) {
    const rendersChatSection = hasSystemComponent(sections, "chat")

    return (
      <main className="relative min-h-screen bg-[#050816] text-white">
        <EventPageRenderer
          event={event}
          elements={pageDocument.elements}
          sections={sections}
          systemComponents={{ chat: chatRoom }}
          eventTheme={eventTheme}
        />

        <div className="mx-auto max-w-6xl px-6 py-10">
          {!rendersChatSection ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6">
              {chatRoom}
            </div>
          ) : null}

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
    <main className="relative min-h-screen bg-[#050816] text-white">
      <PersistedPageElementLayer elements={pageDocument.elements} />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.28em] text-white/45">
            Engage
          </div>
          <h1 className="mt-2 text-4xl font-semibold">{event.title} Engage</h1>
          <p className="mt-3 max-w-2xl text-white/60">
            Event-wide conversation lives here. Chat, audience energy, and shared discussion
            belong to the whole event experience.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6">
          {chatRoom}
        </div>

        <Link
          href={`/events/${slug}`}
          className="inline-block mt-6 text-cyan-300"
        >
          ← Back to event
        </Link>
      </div>
    </main>
  )
}
