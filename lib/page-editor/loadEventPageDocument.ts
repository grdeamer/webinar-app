import { normalizeEventPageElements } from "@/lib/page-editor/elements"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { EventPageElement } from "@/lib/page-editor/sectionTypes"

export type LoadedEventPageDocument = {
  sections: unknown
  elements: EventPageElement[]
}

export async function loadEventPageDocument(
  eventId: string,
  pageKey: string
): Promise<LoadedEventPageDocument> {
  const { data } = await supabaseAdmin
    .from("event_page_sections")
    .select("sections, elements")
    .eq("event_id", eventId)
    .eq("page_key", pageKey)
    .maybeSingle()

  return {
    sections: data?.sections ?? null,
    elements: normalizeEventPageElements(data?.elements),
  }
}
