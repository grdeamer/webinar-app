import { resolveEventDesign } from "@/lib/page-editor/eventDesignPresets"
import { normalizeEventPageElements } from "@/lib/page-editor/elements"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { EventPageElement, EventTheme } from "@/lib/page-editor/sectionTypes"

export type LoadedEventPageDocument = {
  sections: unknown
  elements: EventPageElement[]
  eventTheme: EventTheme | null
  revision: number
}

function normalizeRevision(input: unknown) {
  const revision = Number(input)
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0
}

export async function loadEventPageDocument(
  eventId: string,
  pageKey: string
): Promise<LoadedEventPageDocument> {
  const [{ data }, { data: event }] = await Promise.all([
    supabaseAdmin.from("event_page_sections").select("published_document").eq("event_id", eventId).eq("page_key", pageKey).maybeSingle(),
    supabaseAdmin.from("events").select("event_theme").eq("id", eventId).maybeSingle(),
  ])
  const published = data?.published_document && typeof data.published_document === "object" ? data.published_document : {}
  return {
    sections: published.sections ?? null,
    elements: normalizeEventPageElements(published.elements),
    eventTheme: resolveEventDesign(
      (event?.event_theme ?? null) as EventTheme | null,
      published.eventTheme && typeof published.eventTheme === "object" && !Array.isArray(published.eventTheme) ? published.eventTheme as EventTheme : null,
    ),
    revision: normalizeRevision(published.revision),
  }
}
