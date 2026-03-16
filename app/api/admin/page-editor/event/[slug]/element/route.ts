import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,slug")
    .eq("slug", slug)
    .maybeSingle()

  if (eventError || !event) {
    return json({ error: "Event not found" }, 404)
  }

  const { data: elements, error: elementsError } = await supabaseAdmin
    .from("page_editor_elements")
    .select("*")
    .eq("event_id", event.id)
    .eq("page_key", "event_page")
    .order("created_at", { ascending: true })

  if (elementsError) return json({ error: elementsError.message }, 400)

  const { data: sections, error: sectionsError } = await supabaseAdmin
    .from("page_editor_sections")
    .select("*")
    .eq("event_id", event.id)
    .eq("page_key", "event_page")
    .order("sort_order", { ascending: true })

  if (sectionsError) return json({ error: sectionsError.message }, 400)

  return json({
    event_id: event.id,
    elements: elements ?? [],
    sections:
      (sections ?? []).map((s) => ({
        id: String(s.section_key),
        type: String(s.section_type ?? "content"),
        visible: s.visible !== false,
        title: s.title ?? null,
        body: s.body ?? null,
        adminLabel: s.admin_label ?? null,
        backgroundStyle: s.background_style ?? null,
        contentWidth: s.content_width ?? null,
        paddingY: s.padding_y ?? null,
        textAlign: s.text_align ?? null,
        divider: s.divider ?? null,
      })) ?? [],
  })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params
  const body = await req.json().catch(() => null)

  const elements = Array.isArray(body?.elements) ? body.elements : []
  const sections = Array.isArray(body?.sections) ? body.sections : []

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,slug")
    .eq("slug", slug)
    .maybeSingle()

  if (eventError || !event) {
    return json({ error: "Event not found" }, 404)
  }

  const { error: deleteElementsError } = await supabaseAdmin
    .from("page_editor_elements")
    .delete()
    .eq("event_id", event.id)
    .eq("page_key", "event_page")

  if (deleteElementsError) {
    return json({ error: deleteElementsError.message }, 400)
  }

  const { error: deleteSectionsError } = await supabaseAdmin
    .from("page_editor_sections")
    .delete()
    .eq("event_id", event.id)
    .eq("page_key", "event_page")

  if (deleteSectionsError) {
    return json({ error: deleteSectionsError.message }, 400)
  }

  let insertedElements: any[] = []

  if (elements.length > 0) {
    const elementRows = elements.map((el: any, idx: number) => ({
      event_id: event.id,
      page_key: "event_page",
      element_type: String(el.element_type ?? "text"),
      content: el.content == null ? null : String(el.content),
      x: Number(el.x ?? 0),
      y: Number(el.y ?? 0),
      width: el.width == null ? null : Number(el.width),
      height: el.height == null ? null : Number(el.height),
      z_index: Number(el.z_index ?? idx + 1),
      props: el.props && typeof el.props === "object" ? el.props : {},
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await supabaseAdmin
      .from("page_editor_elements")
      .insert(elementRows)
      .select("*")

    if (error) return json({ error: error.message }, 400)
    insertedElements = data ?? []
  }

  let insertedSections: any[] = []

  if (sections.length > 0) {
    const sectionRows = sections.map((section: any, idx: number) => ({
      event_id: event.id,
      page_key: "event_page",
      section_key: String(section.id ?? `section-${idx + 1}`),
      section_type: String(section.type ?? "content"),
      visible: section.visible !== false,
      title: section.title == null ? null : String(section.title),
      body: section.body == null ? null : String(section.body),
      admin_label: section.adminLabel == null ? null : String(section.adminLabel),
      background_style:
        section.backgroundStyle == null ? null : String(section.backgroundStyle),
      content_width: section.contentWidth == null ? null : String(section.contentWidth),
      padding_y: section.paddingY == null ? null : String(section.paddingY),
      text_align: section.textAlign == null ? null : String(section.textAlign),
      divider: section.divider == null ? null : String(section.divider),
      sort_order: idx,
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await supabaseAdmin
      .from("page_editor_sections")
      .insert(sectionRows)
      .select("*")

    if (error) return json({ error: error.message }, 400)
    insertedSections = data ?? []
  }

  return json({
    ok: true,
    elements: insertedElements,
    sections: insertedSections,
  })
}