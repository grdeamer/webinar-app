import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

async function ensureAdmin() {
  try {
    await requireAdmin()
    return null
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function GET(req: Request) {
  const authError = await ensureAdmin()
  if (authError) return authError

  const eventId = new URL(req.url).searchParams.get("event_id")
  if (!eventId) return NextResponse.json({ error: "event_id is required" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("event_sponsors")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_index", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: Request) {
  const authError = await ensureAdmin()
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const payload = {
    event_id: body?.event_id,
    name: String(body?.name || "").trim(),
    logo_url: cleanText(body?.logo_url),
    website_url: cleanText(body?.website_url),
    tier: cleanText(body?.tier),
    description: cleanText(body?.description),
    sort_index: Number(body?.sort_index || 0),
  }

  if (!payload.event_id || !payload.name) {
    return NextResponse.json({ error: "event_id and name are required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("event_sponsors")
    .insert(payload)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PUT(req: Request) {
  const authError = await ensureAdmin()
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || "").trim()
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const payload = {
    name: cleanText(body?.name),
    logo_url: cleanText(body?.logo_url),
    website_url: cleanText(body?.website_url),
    tier: cleanText(body?.tier),
    description: cleanText(body?.description),
    sort_index: body?.sort_index == null ? undefined : Number(body.sort_index),
  }

  const { data, error } = await supabaseAdmin
    .from("event_sponsors")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(req: Request) {
  const authError = await ensureAdmin()
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id || "").trim()
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const { error } = await supabaseAdmin
    .from("event_sponsors")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}