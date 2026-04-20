import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { EventTheme } from "@/lib/page-editor/sectionTypes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_PAGE_KEY = "event_home"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function getPageKey(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get("pageKey")
  return raw && raw.trim().length > 0 ? raw.trim() : DEFAULT_PAGE_KEY
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

async function getEventBySlugOrId(value: string) {
  const query = supabaseAdmin.from("events").select("id, slug, event_theme")

  const { data, error } = isUuid(value)
    ? await query.eq("id", value).maybeSingle()
    : await query.eq("slug", value).maybeSingle()

  return { data, error }
}

function normalizeSections(input: unknown) {
  if (!Array.isArray(input)) return []

  return input.map((section: any, idx: number) => ({
    id:
      typeof section?.id === "string" && section.id.trim().length > 0
        ? section.id
        : `section-${idx + 1}`,
    type: typeof section?.type === "string" ? section.type : "content",
    config:
      section?.config && typeof section.config === "object" ? section.config : {},
    blocks: Array.isArray(section?.blocks)
      ? section.blocks.map((block: any, blockIdx: number) => ({
          id:
            typeof block?.id === "string" && block.id.trim().length > 0
              ? block.id
              : `block-${idx + 1}-${blockIdx + 1}`,
          type:
            block?.type === "rich_text" || block?.type === "system_component"
              ? block.type
              : "rich_text",
          props: block?.props && typeof block.props === "object" ? block.props : {},
        }))
      : [],
  }))
}

function normalizeTheme(input: unknown): EventTheme | null {
  if (!input || typeof input !== "object") return null
  return input as EventTheme
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await ctx.params
  const pageKey = getPageKey(req)

  const { data: event, error: eventError } = await getEventBySlugOrId(slug)

  if (eventError || !event) {
    return json({ error: "Event not found" }, 404)
  }

  const { data: pageRow, error: pageError } = await supabaseAdmin
    .from("event_page_sections")
    .select("sections")
    .eq("event_id", event.id)
    .eq("page_key", pageKey)
    .maybeSingle()

  if (pageError) {
    return json({ error: pageError.message }, 400)
  }

  return json({
    event_id: event.id,
    event_slug: event.slug,
    pageKey,
    eventTheme: normalizeTheme(event.event_theme),
    elements: [],
    sections: normalizeSections(pageRow?.sections),
  })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await ctx.params
  const pageKey = getPageKey(req)
  const body = await req.json().catch((_: unknown): null => null)

  const sections = normalizeSections(body?.sections)
  const eventTheme = normalizeTheme(body?.eventTheme)

  const { data: event, error: eventError } = await getEventBySlugOrId(slug)

  if (eventError || !event) {
    return json({ error: "Event not found" }, 404)
  }

  const timestamp = new Date().toISOString()

  const payload = {
    event_id: event.id,
    page_key: pageKey,
    sections,
    updated_at: timestamp,
  }

  const { data: savedRow, error: saveError } = await supabaseAdmin
    .from("event_page_sections")
    .upsert(payload, {
      onConflict: "event_id,page_key",
    })
    .select("sections")
    .single()

  if (saveError) {
    return json({ error: saveError.message }, 400)
  }

  const { error: themeMirrorError } = await supabaseAdmin
    .from("events")
    .update({
      event_theme: eventTheme,
      updated_at: timestamp,
    })
    .eq("id", event.id)

  if (themeMirrorError) {
    return json({ error: themeMirrorError.message }, 400)
  }

  return json({
    ok: true,
    event_id: event.id,
    event_slug: event.slug,
    pageKey,
    eventTheme,
    elements: [],
    sections: normalizeSections(savedRow?.sections),
  })
}