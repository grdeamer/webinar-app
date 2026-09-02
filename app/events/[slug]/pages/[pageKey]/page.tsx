import { notFound } from "next/navigation"
import EventPageRenderer from "@/components/page-renderer/EventPageRenderer"
import EventEmailGate from "../../EventEmailGate"
import { getEventBySlug } from "@/lib/events"
import { loadEventPageDocument } from "@/lib/page-editor/loadEventPageDocument"
import { normalizeEventPageSections } from "@/lib/page-editor/normalizeEventPageSections"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function validPageKey(value: string) {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value)
}

export default async function CustomEventPage({ params }: { params: Promise<{ slug: string; pageKey: string }> }) {
  const { slug, pageKey } = await params
  if (!validPageKey(pageKey)) notFound()

  const event = await getEventBySlug(slug)
  const { data: manifest, error } = await supabaseAdmin
    .from("event_page_manifest")
    .select("title")
    .eq("event_id", event.id)
    .eq("page_key", pageKey)
    .maybeSingle()
  if (error || !manifest) notFound()

  const document = await loadEventPageDocument(event.id, pageKey)
  return <EventPageRenderer
    event={{ title: manifest.title || event.title, description: event.description }}
    elements={document.elements}
    sections={normalizeEventPageSections(document.sections)}
    eventTheme={document.eventTheme ?? undefined}
    systemComponents={{ access_gate: <EventEmailGate slug={slug} /> }}
    standalone
  />
}
