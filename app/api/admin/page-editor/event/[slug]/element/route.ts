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

  const { data, error } = await supabaseAdmin
    .from("page_editor_elements")
    .select("*")
    .eq("event_id", event.id)
    .eq("page_key", "event_page")
    .order("created_at", { ascending: true })

  if (error) return json({ error: error.message }, 400)

  return json({
    event_id: event.id,
    elements: data ?? [],
  })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params
  const body = await req.json().catch(() => null)

  const elements = Array.isArray(body?.elements) ? body.elements : null
  if (!elements) return json({ error: "Missing elements" }, 400)

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,slug")
    .eq("slug", slug)
    .maybeSingle()

  if (eventError || !event) {
    return json({ error: "Event not found" }, 404)
  }

  const { error: deleteError } = await supabaseAdmin
    .from("page_editor_elements")
    .delete()
    .eq("event_id", event.id)
    .eq("page_key", "event_page")

  if (deleteError) return json({ error: deleteError.message }, 400)

  const rows = elements.map((el: any, idx: number) => ({
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
    .insert(rows)
    .select("*")

  if (error) return json({ error: error.message }, 400)

  return json({
    ok: true,
    elements: data ?? [],
  })
}