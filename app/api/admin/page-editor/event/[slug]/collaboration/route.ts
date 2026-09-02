import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function validPageKey(value: string) { return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value) }
function validId(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
function normalizedCoordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const access = await requireEventOperatorAccess(slug)
  if (access instanceof NextResponse) return access
  const pageKey = new URL(request.url).searchParams.get("pageKey") ?? "event_home"
  if (!validPageKey(pageKey)) return NextResponse.json({ error: "Invalid page key" }, { status: 400 })
  const cutoff = new Date(Date.now() - 30_000).toISOString()
  const [comments, presence] = await Promise.all([
    supabaseAdmin.from("page_editor_comments").select("id,page_key,element_id,author_id,body,resolved_at,created_at").eq("event_id", access.eventId).eq("page_key", pageKey).order("created_at", { ascending: false }),
    supabaseAdmin.from("page_editor_presence").select("user_id,display_name,color,cursor_x,cursor_y,selected_element_id,last_seen_at").eq("event_id", access.eventId).eq("page_key", pageKey).gte("last_seen_at", cutoff),
  ])
  if (comments.error || presence.error) return NextResponse.json({ error: comments.error?.message ?? presence.error?.message }, { status: 500 })
  const authorIds = Array.from(new Set((comments.data ?? []).map((comment) => comment.author_id)))
  let authorRows: Array<{ id: string; full_name: string | null; email: string | null }> = []
  if (authorIds.length) {
    const authors = await supabaseAdmin.from("profiles").select("id,full_name,email").in("id", authorIds)
    if (authors.error) return NextResponse.json({ error: authors.error.message }, { status: 500 })
    authorRows = authors.data ?? []
  }
  return NextResponse.json({ comments: comments.data ?? [], presence: presence.data ?? [], authors: Object.fromEntries(authorRows.map((author) => [author.id, author.full_name || author.email || "Collaborator"])), currentUserId: access.user.id })
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const access = await requireEventOperatorAccess(slug)
  if (access instanceof NextResponse) return access
  const body = await request.json()
  const action = String(body?.action ?? "heartbeat")
  const pageKey = String(body?.pageKey ?? "event_home").slice(0, 64)
  if (!validPageKey(pageKey)) return NextResponse.json({ error: "Invalid page key" }, { status: 400 })
  if (action === "comment") {
    const text = String(body?.body ?? "").trim().slice(0, 2000)
    if (!text) return NextResponse.json({ error: "Comment required" }, { status: 400 })
    const { data, error } = await supabaseAdmin.from("page_editor_comments").insert({ event_id: access.eventId, page_key: pageKey, element_id: body?.elementId ? String(body.elementId) : null, author_id: access.user.id, body: text }).select("id,page_key,element_id,author_id,body,resolved_at,created_at").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ comment: data }, { status: 201 })
  }
  const displayName = String(access.user.user_metadata?.full_name ?? access.user.email ?? "Collaborator").slice(0, 80)
  const color = `hsl(${Array.from(access.user.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360} 72% 62%)`
  const person = { user_id: access.user.id, display_name: displayName, color, cursor_x: normalizedCoordinate(body?.cursorX), cursor_y: normalizedCoordinate(body?.cursorY), selected_element_id: body?.selectedElementId ? String(body.selectedElementId).slice(0, 120) : null }
  const { error } = await supabaseAdmin.from("page_editor_presence").upsert({ event_id: access.eventId, page_key: pageKey, ...person, last_seen_at: new Date().toISOString() }, { onConflict: "event_id,page_key,user_id" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, person })
}

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const access = await requireEventOperatorAccess(slug)
  if (access instanceof NextResponse) return access
  const body = await request.json()
  const id = String(body?.id ?? "")
  if (!validId(id)) return NextResponse.json({ error: "Invalid comment id" }, { status: 400 })
  const resolved = Boolean(body?.resolved)
  const { data, error } = await supabaseAdmin.from("page_editor_comments").update({ resolved_at: resolved ? new Date().toISOString() : null, resolved_by: resolved ? access.user.id : null }).eq("id", id).eq("event_id", access.eventId).select("id").maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Comment not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
