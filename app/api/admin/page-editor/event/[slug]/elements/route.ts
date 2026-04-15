import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type {
  SectionConfig,
  SectionType,
  EventTheme,
} from "@/lib/page-editor/sectionTypes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function parseSectionBody(body: unknown): SectionConfig {
  if (!body) return {}

  if (typeof body === "object" && body !== null) {
    return body as SectionConfig
  }

  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body)
      if (parsed && typeof parsed === "object") return parsed as SectionConfig
    } catch {}

    return { body }
  }

  return {}
}

function parseEventTheme(theme: unknown): EventTheme | null {
  if (!theme) return null

  if (typeof theme === "object" && theme !== null) {
    return theme as EventTheme
  }

  if (typeof theme === "string") {
    try {
      const parsed = JSON.parse(theme)
      if (parsed && typeof parsed === "object") {
        return parsed as EventTheme
      }
    } catch {}
  }

  return null
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,slug,event_theme")
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
    .order("z_index", { ascending: true })
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
    eventTheme: parseEventTheme(event.event_theme),
    elements: (elements ?? []).map((el) => ({
      ...el,
      props: el.props ?? {},
    })),
    sections: (sections ?? []).map((s) => {
      const config = parseSectionBody(s.body)

      return {
        id: String(s.section_key),
        type: String(s.section_type ?? "content"),
        config: {
          visible: s.visible !== false,
          adminLabel: s.admin_label ?? config.adminLabel ?? null,
          ...config,
          hideOnMobile: Boolean(s.hide_on_mobile ?? config.hideOnMobile),
        },
      }
    }),
  })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params
  const body = await req.json()

  const elements = Array.isArray(body?.elements) ? body.elements : []
  const sections = Array.isArray(body?.sections) ? body.sections : []
  const eventTheme =
    body?.eventTheme && typeof body.eventTheme === "object"
      ? (body.eventTheme as EventTheme)
      : null

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,slug")
    .eq("slug", slug)
    .maybeSingle()

  if (eventError || !event) {
    return json({ error: "Event not found" }, 404)
  }

  const { error: themeUpdateError } = await supabaseAdmin
    .from("events")
    .update({
      event_theme: eventTheme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id)

  if (themeUpdateError) {
    return json({ error: themeUpdateError.message }, 400)
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
    const sectionRows = sections.map((section: any, idx: number) => {
      const config =
        section?.config && typeof section.config === "object" ? section.config : {}

      return {
        event_id: event.id,
        page_key: "event_page",
        section_key: String(section.id ?? `section-${idx + 1}`),
        section_type: String((section.type ?? "content") as SectionType),
        visible: config.visible !== false,
        title: config.title == null ? null : String(config.title),
        body: JSON.stringify(config),
        admin_label: config.adminLabel == null ? null : String(config.adminLabel),
        background_style:
          config.backgroundStyle == null ? null : String(config.backgroundStyle),
        content_width: config.contentWidth == null ? null : String(config.contentWidth),
        padding_y: config.paddingY == null ? null : String(config.paddingY),
        text_align: config.textAlign == null ? null : String(config.textAlign),
        divider: config.divider == null ? null : String(config.divider),
        sort_order: idx,
        updated_at: new Date().toISOString(),
        hide_on_mobile: Boolean(config.hideOnMobile),
      }
    })

    const { data, error } = await supabaseAdmin
      .from("page_editor_sections")
      .insert(sectionRows)
      .select("*")

    if (error) return json({ error: error.message }, 400)
    insertedSections = data ?? []
  }

  return json({
    ok: true,
    eventTheme,
    elements: insertedElements,
    sections: insertedSections,
  })
}