import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_PAGES = [
  ["event_home", "Home"], ["agenda", "Agenda"], ["breakouts", "Districts"],
  ["lobby", "Lobby"], ["on_demand", "Resources"], ["sessions", "Sessions"],
  ["sponsors", "Sponsors"], ["chat", "Engage"], ["networking", "Networking"],
] as const

function validKey(value: string) { return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value) }
async function ensureDefaultPages(eventId: string) {
  const { error } = await supabaseAdmin.from("event_page_manifest").upsert(
    DEFAULT_PAGES.map(([page_key, title], position) => ({ event_id: eventId, page_key, title, position, is_system: true })),
    { onConflict: "event_id,page_key", ignoreDuplicates: true },
  )
  if (error) throw error
}
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const access = await requireEventOperatorAccess(slug)
    if (access instanceof NextResponse) return access
    const eventId = access.eventId
    await ensureDefaultPages(eventId)
    const { data, error } = await supabaseAdmin.from("event_page_manifest").select("id,page_key,title,position,status,is_system").eq("event_id", eventId).order("position")
    if (error) throw error
    const pages = data?.length ? data : DEFAULT_PAGES.map(([page_key, title], position) => ({ id: page_key, page_key, title, position, status: "draft", is_system: true }))
    return NextResponse.json({ eventId, pages })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load pages" }, { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const access = await requireEventOperatorAccess(slug)
    if (access instanceof NextResponse) return access
    const body = await request.json()
    const eventId = access.eventId
    await ensureDefaultPages(eventId)
    const title = String(body?.title ?? "Untitled page").trim().slice(0, 80) || "Untitled page"
    const requestedKey = String(body?.pageKey ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).slice(0, 54)
    const pageKey = validKey(requestedKey) ? `${requestedKey}-${Date.now().toString(36)}` : `page-${Date.now().toString(36)}`
    const { count } = await supabaseAdmin.from("event_page_manifest").select("id", { count: "exact", head: true }).eq("event_id", eventId)
    const { data, error } = await supabaseAdmin.from("event_page_manifest").insert({ event_id: eventId, page_key: pageKey, title, position: count ?? DEFAULT_PAGES.length }).select("id,page_key,title,position,status,is_system").single()
    if (error) throw error
    const sourcePageKey = String(body?.sourcePageKey ?? "")
    if (validKey(sourcePageKey)) {
      const { data: source, error: sourceError } = await supabaseAdmin.from("event_page_sections").select("sections,elements").eq("event_id", eventId).eq("page_key", sourcePageKey).maybeSingle()
      if (sourceError) {
        await supabaseAdmin.from("event_page_manifest").delete().eq("event_id", eventId).eq("page_key", pageKey)
        throw sourceError
      }
      if (source) {
        const { error: copyError } = await supabaseAdmin.from("event_page_sections").upsert({ event_id: eventId, page_key: pageKey, sections: source.sections, elements: source.elements }, { onConflict: "event_id,page_key" })
        if (copyError) {
          await supabaseAdmin.from("event_page_manifest").delete().eq("event_id", eventId).eq("page_key", pageKey)
          throw copyError
        }
      }
    }
    return NextResponse.json({ page: data }, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create page" }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const access = await requireEventOperatorAccess(slug)
    if (access instanceof NextResponse) return access
    const body = await request.json()
    const eventId = access.eventId
    await ensureDefaultPages(eventId)
    const pages = Array.isArray(body?.pages) ? body.pages : []
    if (!pages.length || pages.length > 100) return NextResponse.json({ error: "pages required" }, { status: 400 })
    const normalizedPages = pages.map((page: unknown) => {
      const record = page && typeof page === "object" ? page as Record<string, unknown> : {}
      const pageKey = String(record.pageKey ?? "")
      if (!validKey(pageKey)) throw new Error("Invalid page key")
      const title = String(record.title ?? "Untitled page").trim().slice(0, 80) || "Untitled page"
      return { pageKey, title }
    })
    const { error } = await supabaseAdmin.rpc("page_editor_replace_manifest_order", { p_event_id: eventId, p_pages: normalizedPages })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update pages" }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const access = await requireEventOperatorAccess(slug)
    if (access instanceof NextResponse) return access
    const body = await request.json()
    const eventId = access.eventId
    await ensureDefaultPages(eventId)
    const pageKey = String(body?.pageKey ?? "")
    if (!validKey(pageKey)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    const { data: page, error: pageError } = await supabaseAdmin.from("event_page_manifest").select("is_system").eq("event_id", eventId).eq("page_key", pageKey).maybeSingle()
    if (pageError) throw pageError
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 })
    if (page.is_system) return NextResponse.json({ error: "System pages cannot be deleted" }, { status: 400 })
    const { error } = await supabaseAdmin.rpc("page_editor_delete_page", { p_event_id: eventId, p_page_key: pageKey })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete page" }, { status: 500 })
  }
}
