import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { EventAgendaItem } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function clamp(v: unknown, max: number) {
  if (v == null) return null
  return String(v).slice(0, max)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const event_id = searchParams.get("event_id")
  if (!event_id) return NextResponse.json({ error: "Missing event_id" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("event_agenda_items")
    .select("id,event_id,start_at,end_at,title,description,location,track,speaker,sort_index,created_at")
    .eq("event_id", event_id)
    .order("start_at", { ascending: true, nullsLast: true })
    .order("sort_index", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const body = await req.json().catch(() => null)
  if (!body?.event_id || !body?.title) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const row = {
    event_id: body.event_id,
    title: clamp(body.title, 200) || "Untitled",
    description: clamp(body.description, 10000),
    location: clamp(body.location, 200),
    track: clamp(body.track, 120),
    speaker: clamp(body.speaker, 200),
    start_at: body.start_at || null,
    end_at: body.end_at || null,
    sort_index: Number.isFinite(Number(body.sort_index)) ? Number(body.sort_index) : 0,
  }

  const { data, error } = await supabaseAdmin
    .from("event_agenda_items")
    .insert(row)
    .select("id,event_id,start_at,end_at,title,description,location,track,speaker,sort_index,created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ item: data })
}

export async function PUT(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const patch: Partial<EventAgendaItem> & { updated_at?: string } = {
    updated_at: new Date().toISOString(), // harmless even if column doesn't exist; supabase ignores unknown? (it won't) so avoid
  }
  // Only set allowed fields
  if (body.title != null) patch.title = clamp(body.title, 200)
  if (body.description !== undefined) patch.description = body.description == null ? null : clamp(body.description, 10000)
  if (body.location !== undefined) patch.location = body.location == null ? null : clamp(body.location, 200)
  if (body.track !== undefined) patch.track = body.track == null ? null : clamp(body.track, 120)
  if (body.speaker !== undefined) patch.speaker = body.speaker == null ? null : clamp(body.speaker, 200)
  if (body.start_at !== undefined) patch.start_at = body.start_at || null
  if (body.end_at !== undefined) patch.end_at = body.end_at || null
  if (body.sort_index !== undefined) patch.sort_index = Number.isFinite(Number(body.sort_index)) ? Number(body.sort_index) : 0

  // Remove updated_at because table doesn't have it
  delete patch.updated_at

  const { data, error } = await supabaseAdmin
    .from("event_agenda_items")
    .update(patch)
    .eq("id", body.id)
    .select("id,event_id,start_at,end_at,title,description,location,track,speaker,sort_index,created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ item: data })
}

export async function DELETE(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const { error } = await supabaseAdmin.from("event_agenda_items").delete().eq("id", body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
