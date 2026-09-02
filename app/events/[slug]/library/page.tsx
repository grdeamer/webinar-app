import Link from "next/link"
import { getEventBySlug } from "@/lib/events"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventUserOrNull } from "@/lib/eventAuth"
import EventEmailGate from "../EventEmailGate"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import {
  normalizeEventPageSections,
  withRequiredSystemComponent,
} from "@/lib/page-editor/normalizeEventPageSections"
import type { EventPageSection, EventTheme } from "@/lib/page-editor/sectionTypes"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type LibraryItem = {
  id: string
  kind: string
  title: string
  description: string | null
  url: string | null
  storage_path: string | null
}

function normalizeTheme(input: unknown): EventTheme | null {
  if (!input || typeof input !== "object") return null
  return input as EventTheme
}

function getKindLabel(kind: string) {
  switch (kind) {
    case "video":
      return "Video"
    case "pdf":
      return "PDF"
    case "link":
      return "Link"
    case "file":
      return "File"
    default:
      return kind || "Resource"
  }
}

function renderLibraryGrid(items: LibraryItem[]) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white/70">
        No library items yet.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => {
        const href = item.url || null

        return (
          <article
            key={item.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">{item.title}</div>
              <div className="text-xs text-white/50">{getKindLabel(item.kind)}</div>
            </div>

            {item.description ? (
              <div className="mt-3 whitespace-pre-wrap text-sm text-white/70">
                {item.description}
              </div>
            ) : null}

            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500"
              >
                Open →
              </a>
            ) : (
              <div className="mt-4 text-sm text-white/50">No URL yet.</div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function getLibraryFallbackSections(): EventPageSection[] {
  return [
    {
      id: "library-hero",
      type: "hero",
      config: {
        visible: true,
        title: "On-demand Library",
        body: "Recordings, PDFs, links, and follow-up resources.",
        adminLabel: "On-Demand Hero",
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
      id: "library-content",
      type: "content",
      config: {
        visible: true,
        title: "",
        body: null,
        adminLabel: "Resource Library",
        backgroundStyle: "transparent",
        contentWidth: "xl",
        paddingY: "md",
        textAlign: "left",
        divider: "none",
        hideOnMobile: false,
      },
      blocks: [
        {
          id: "resource-library-block",
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

export default async function LibraryPage(props: {
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

    loadEventPageDocument(event.id, "on_demand"),

    supabaseAdmin
      .from("event_library_items")
      .select("id,kind,title,description,url,storage_path")
      .eq("event_id", event.id)
      .order("sort_index", { ascending: true })
      .order("created_at", { ascending: false }),
  ])

  if (error) throw new Error(error.message)

  const items = (data || []) as LibraryItem[]
  const eventTheme = pageDocument.eventTheme ?? normalizeTheme(eventRow?.event_theme)
  const storedSections = normalizeEventPageSections(pageDocument.sections)
  const baseSections =
    storedSections.length > 0
      ? storedSections
      : getLibraryFallbackSections()
  const sections = withRequiredSystemComponent(
    baseSections,
    "resource_library",
    {
      sectionId: "resource-library-runtime",
      adminLabel: "Resource Library",
    },
  )

  return (
    <EventPageRenderer
      event={event}
      elements={pageDocument.elements}
      sections={sections}
      systemComponents={{
        resource_library: renderLibraryGrid(items),
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
