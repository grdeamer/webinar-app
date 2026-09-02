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
  const { data } = await supabaseAdmin
    .from("event_page_sections")
    .select("sections, elements, page_theme, document_revision")
    .eq("event_id", eventId)
    .eq("page_key", pageKey)
    .maybeSingle()

  return {
    sections: data?.sections ?? null,
    elements: normalizeEventPageElements(data?.elements),
    eventTheme: data?.page_theme && typeof data.page_theme === "object" && !Array.isArray(data.page_theme) ? data.page_theme as EventTheme : null,
    revision: normalizeRevision(data?.document_revision),
  }
}
