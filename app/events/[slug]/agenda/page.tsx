import Link from "next/link"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import EventScheduleRail from "@/components/EventScheduleRail"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import { getEventUserOrNull } from "@/lib/eventAuth"
import EventEmailGate from "../EventEmailGate"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import {
  hasSystemComponent,
  normalizeEventPageSections,
  withRequiredSystemComponent,
} from "@/lib/page-editor/normalizeEventPageSections"
import type { EventPageSection, EventTheme } from "@/lib/page-editor/sectionTypes"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function normalizeTheme(input: unknown): EventTheme | null {
  if (!input || typeof input !== "object") return null
  return input as EventTheme
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

function getAgendaFallbackSections(eventTitle: string): EventPageSection[] {
  return [
    {
      id: "agenda-hero",
      type: "hero",
      config: {
        visible: true,
        title: `${eventTitle} Agenda`,
        body: "Browse the event schedule.",
        adminLabel: "Agenda Hero",
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
      id: "agenda-content",
      type: "content",
      config: {
        visible: true,
        title: "",
        body: null,
        adminLabel: "Agenda",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "agenda-block",
          type: "system_component",
          props: {
            componentKey: "agenda",
            containerStyle: "none",
          },
        },
      ],
    },
  ]
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

  const [{ data: eventRow }, pageDocument, { data: agendaRows }] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("event_theme")
      .eq("id", event.id)
      .maybeSingle(),

    loadEventPageDocument(event.id, "agenda"),

    supabaseAdmin
      .from("event_agenda_items")
      .select("id,title,start_at,end_at,track,speaker,description")
      .eq("event_id", event.id)
      .order("start_at", { ascending: true, nullsFirst: false }),
  ])

  const eventTheme = pageDocument.eventTheme ?? normalizeTheme(eventRow?.event_theme)
  const storedSections = normalizeEventPageSections(pageDocument.sections)
  const agenda = (agendaRows ?? []) as Array<{
    id: string
    title?: string | null
    start_at?: string | null
    end_at?: string | null
    track?: string | null
    speaker?: string | null
    description?: string | null
  }>
  const baseSections =
    storedSections.length > 0
      ? storedSections
      : getAgendaFallbackSections(event.title)
  const sections =
    hasSystemComponent(baseSections, "agenda") ||
    hasSystemComponent(baseSections, "schedule_rail")
      ? baseSections
      : withRequiredSystemComponent(baseSections, "agenda", {
          sectionId: "agenda-runtime",
          adminLabel: "Agenda",
        })

  return (
    <EventPageRenderer
      event={event}
      elements={pageDocument.elements}
      sections={sections}
      systemComponents={{
        agenda: renderAgendaRail(slug, agenda),
        schedule_rail: renderAgendaRail(slug, agenda),
      }}
      eventTheme={eventTheme ?? undefined}
      layout="card-stack"
      afterSections={
        <Link href={`/events/${slug}`} className="inline-block text-cyan-300">
          ← Back to event
        </Link>
      }
    />
  )
}
