import Link from "next/link"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import { getEventUserOrNull } from "@/lib/eventAuth"
import EventEmailGate from "../EventEmailGate"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import {
  normalizeEventPageSections,
  withRequiredSystemComponent,
} from "@/lib/page-editor/normalizeEventPageSections"
import type { EventPageSection, EventTheme } from "@/lib/page-editor/sectionTypes"

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

function normalizeTheme(input: unknown): EventTheme | null {
  if (!input || typeof input !== "object") return null
  return input as EventTheme
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
      },
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
      },
      blocks: [
        {
          id: "sponsor-cards-block",
          type: "system_component",
          props: {
            componentKey: "sponsors",
            containerStyle: "none",
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

  const [{ data: eventRow }, pageDocument, { data, error }] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("event_theme")
      .eq("id", event.id)
      .maybeSingle(),

    loadEventPageDocument(event.id, "sponsors"),

    supabaseAdmin
      .from("event_sponsors")
      .select("id,name,description,logo_url,website_url,tier")
      .eq("event_id", event.id)
      .order("sort_index", { ascending: true }),
  ])

  if (error) throw new Error(error.message)

  const sponsors = (data || []) as Sponsor[]
  const eventTheme = pageDocument.eventTheme ?? normalizeTheme(eventRow?.event_theme)
  const storedSections = normalizeEventPageSections(pageDocument.sections)
  const baseSections =
    storedSections.length > 0
      ? storedSections
      : getFallbackSections(event.title)
  const sections = withRequiredSystemComponent(baseSections, "sponsors", {
    sectionId: "sponsors-runtime",
    adminLabel: "Sponsor Grid",
  })

  return (
    <EventPageRenderer
      event={event}
      elements={pageDocument.elements}
      sections={sections}
      systemComponents={{
        sponsors: renderSponsorsGrid(sponsors),
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
