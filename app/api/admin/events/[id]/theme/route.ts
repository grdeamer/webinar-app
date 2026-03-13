import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function clampText(v: unknown, max = 500) {
  if (v == null) return null
  return String(v).trim().slice(0, max) || null
}

function clampOpacity(v: unknown) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 45
  return Math.max(0, Math.min(100, Math.round(n)))
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const { id } = await ctx.params

  const { data, error } = await supabaseAdmin
    .from("event_page_themes")
    .select("*")
    .eq("event_id", id)
    .order("page_key", { ascending: true })

  if (error) return json({ error: error.message }, 400)
  return json({ themes: data ?? [] })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)

  const page_key =
    body?.page_key === "event_landing" || body?.page_key === "sessions_landing"
      ? body.page_key
      : null

  if (!page_key) return json({ error: "Invalid page_key" }, 400)

  const row = {
    event_id: id,
    page_key,
    bg_color: clampText(body?.bg_color, 50),
    text_color: clampText(body?.text_color, 50),
    accent_color: clampText(body?.accent_color, 50),
    brand_logo_url: clampText(body?.brand_logo_url, 1000),
    brand_logo_position: ["left", "center", "right"].includes(body?.brand_logo_position)
      ? body.brand_logo_position
      : "left",
    background_image_url: clampText(body?.background_image_url, 1000),
    overlay_opacity: clampOpacity(body?.overlay_opacity),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from("event_page_themes")
    .upsert(row, { onConflict: "event_id,page_key" })
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ theme: data })
}