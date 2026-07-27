import Link from "next/link"
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

function OnDemandLibraryPlaceholder() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:col-span-2">
        <div className="mb-4 text-sm uppercase tracking-[0.25em] text-cyan-300/80">
          Library
        </div>

        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-white/65">
          No on-demand sessions yet.
        </div>
      </section>

      <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 text-sm uppercase tracking-[0.25em] text-white/50">
          Coming soon
        </div>

        <div className="space-y-3 text-sm text-white/70">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            Session recordings
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            Keynote replay
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            Downloadable materials
          </div>
        </div>
      </aside>
    </div>
  )
}

function getOnDemandFallbackSections(eventTitle: string): EventPageSection[] {
  return [
    {
      id: "on-demand-hero",
      type: "hero",
      config: {
        visible: true,
        title: eventTitle,
        body: "Watch recorded sessions, replay featured content, and revisit key presentations from this event.",
        adminLabel: "On-Demand Hero",
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
      id: "on-demand-library",
      type: "content",
      config: {
        visible: true,
        title: "",
        body: null,
        adminLabel: "On-Demand Library",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "on-demand-library-block",
          type: "system_component",
          props: {
            componentKey: "resource_library",
            containerStyle: "none",
          },
        },
      ],
    },
  ]
}

export default async function EventOnDemandPage(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const event = await getEventBySlug(slug)
  const [pageDocument, { data: eventRow }] = await Promise.all([
    loadEventPageDocument(event.id, "on_demand"),
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
      : getOnDemandFallbackSections(event.title)
  const sections = withRequiredSystemComponent(
    baseSections,
    "resource_library",
    {
      sectionId: "on-demand-library-runtime",
      adminLabel: "On-Demand Library",
    },
  )
  const eventTheme =
    eventRow?.event_theme && typeof eventRow.event_theme === "object"
      ? (eventRow.event_theme as EventTheme)
      : undefined

  const libraryPlaceholder = <OnDemandLibraryPlaceholder />

  return (
    <EventPageRenderer
      event={event}
      elements={pageDocument.elements}
      sections={sections}
      systemComponents={{ resource_library: libraryPlaceholder }}
      eventTheme={eventTheme}
      standalone
      afterSections={
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Link
            href={`/events/${slug}`}
            className="mt-6 inline-block rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Back to event
          </Link>
        </div>
      }
    />
  )
}
