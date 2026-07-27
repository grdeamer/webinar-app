import Link from "next/link"
import NetworkingRoom from "@/components/NetworkingRoom"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import PersistedPageElementLayer from "@/components/page-renderer/PersistedPageElementLayer"
import { getEventBySlug } from "@/lib/events"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import { normalizeEventPageSections } from "@/lib/page-editor/normalizeEventPageSections"
import type { EventTheme } from "@/lib/page-editor/sectionTypes"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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
  const sections = normalizeEventPageSections(pageDocument.sections)
  const eventTheme =
    eventRow?.event_theme && typeof eventRow.event_theme === "object"
      ? (eventRow.event_theme as EventTheme)
      : undefined

  if (sections.length > 0) {
    return (
      <main className="relative min-h-screen bg-[#050816] text-white">
        <EventPageRenderer
          event={event}
          elements={pageDocument.elements}
          sections={sections}
          systemComponents={{}}
          eventTheme={eventTheme}
        />

        <div className="mx-auto max-w-6xl px-6 py-10">
          <NetworkingRoom eventSlug={slug} />

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
        <h1 className="text-4xl font-semibold mb-6">{event.title} Networking</h1>

        <NetworkingRoom eventSlug={slug} />

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
