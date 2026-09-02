import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { normalizeEventPageElements } from "@/lib/page-editor/elements"
import type { EventTheme } from "@/lib/page-editor/sectionTypes"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_PAGE_KEY = "event_home"
const REVISION_CONFLICT_CODE = "revision_conflict"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
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
  const query = supabaseAdmin.from("events").select("id, slug, title, lifecycle_stage, event_theme")

  const { data, error } = isUuid(value)
    ? await query.eq("id", value).maybeSingle()
    : await query.eq("slug", value).maybeSingle()

  return { data, error }
}

function normalizeSections(input: unknown) {
  if (!Array.isArray(input)) return []

  return input.map((value, idx) => {
    const section = isRecord(value) ? value : {}

    return {
      id:
        typeof section.id === "string" && section.id.trim().length > 0
          ? section.id
          : `section-${idx + 1}`,
      type: typeof section.type === "string" ? section.type : "content",
      config: isRecord(section.config) ? section.config : {},
      blocks: Array.isArray(section.blocks)
        ? section.blocks.map((value, blockIdx) => {
            const block = isRecord(value) ? value : {}

            return {
              id:
                typeof block.id === "string" && block.id.trim().length > 0
                  ? block.id
                  : `block-${idx + 1}-${blockIdx + 1}`,
              type:
                block.type === "rich_text" || block.type === "system_component"
                  ? block.type
                  : "rich_text",
              props: isRecord(block.props) ? block.props : {},
            }
          })
        : [],
    }
  })
}

function normalizeRevision(input: unknown) {
  const revision = Number(input)
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0
}

function parseExpectedRevision(input: unknown) {
  return typeof input === "number" &&
    Number.isSafeInteger(input) &&
    input >= 0
    ? input
    : null
}

async function getCurrentRevision(eventId: string, pageKey: string) {
  const { data } = await supabaseAdmin
    .from("event_page_sections")
    .select("document_revision")
    .eq("event_id", eventId)
    .eq("page_key", pageKey)
    .maybeSingle()

  return normalizeRevision(data?.document_revision)
}

type SavedPageDocumentRow = {
  saved_sections: unknown
  saved_elements: unknown
  saved_event_theme: unknown
  saved_revision: unknown
}

function normalizeTheme(input: unknown): EventTheme | null {
  if (!isRecord(input)) return null
  return input as EventTheme
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await ctx.params
  const access = await requireEventOperatorAccess(slug)
  if (access instanceof NextResponse) return access
  const pageKey = getPageKey(req)

  const { data: event, error: eventError } = await getEventBySlugOrId(access.eventId)

  if (eventError || !event) {
    return json({ error: "Event not found" }, 404)
  }

  const { data: pageRow, error: pageError } = await supabaseAdmin
    .from("event_page_sections")
    .select("sections, elements, page_theme, document_revision")
    .eq("event_id", event.id)
    .eq("page_key", pageKey)
    .maybeSingle()

  if (pageError) {
    return json({ error: pageError.message }, 400)
  }

  return json({
    event_id: event.id,
    event_slug: event.slug,
    event_title: event.title,
    event_stage: event.lifecycle_stage,
    pageKey,
    eventTheme: normalizeTheme(pageRow?.page_theme) ?? normalizeTheme(event.event_theme),
    elements: normalizeEventPageElements(pageRow?.elements),
    sections: normalizeSections(pageRow?.sections),
    revision: normalizeRevision(pageRow?.document_revision),
  })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await ctx.params
  const access = await requireEventOperatorAccess(slug)
  if (access instanceof NextResponse) return access
  const pageKey = getPageKey(req)
  const input = await req.json().catch((): null => null)
  const body = isRecord(input) ? input : {}
  const expectedRevision = parseExpectedRevision(body.expectedRevision)

  if (expectedRevision === null) {
    return json(
      {
        error: "expectedRevision must be a non-negative integer",
        code: "validation_error",
      },
      400,
    )
  }

  const sections = normalizeSections(body.sections)
  const hasElements = Array.isArray(body.elements)
  const elements = normalizeEventPageElements(body.elements)
  const eventTheme = normalizeTheme(body.eventTheme)

  const { data: event, error: eventError } = await getEventBySlugOrId(access.eventId)

  if (eventError || !event) {
    return json({ error: "Event not found" }, 404)
  }

  const { data: savedRow, error: saveError } = await supabaseAdmin
    .rpc("save_event_page_document", {
      p_event_id: event.id,
      p_page_key: pageKey,
      p_sections: sections,
      p_elements: elements,
      p_has_elements: hasElements,
      p_event_theme: eventTheme,
      p_expected_revision: expectedRevision,
    })
    .maybeSingle()

  if (saveError) {
    return json({ error: saveError.message }, 400)
  }

  if (!savedRow) {
    return json(
      {
        error: "This page was modified elsewhere. Refresh before continuing.",
        code: REVISION_CONFLICT_CODE,
        currentRevision: await getCurrentRevision(event.id, pageKey),
      },
      409,
    )
  }

  const savedDocument = savedRow as SavedPageDocumentRow

  return json({
    ok: true,
    event_id: event.id,
    event_slug: event.slug,
    pageKey,
    eventTheme: normalizeTheme(savedDocument.saved_event_theme),
    elements: normalizeEventPageElements(savedDocument.saved_elements),
    sections: normalizeSections(savedDocument.saved_sections),
    revision: normalizeRevision(savedDocument.saved_revision),
  })
}
