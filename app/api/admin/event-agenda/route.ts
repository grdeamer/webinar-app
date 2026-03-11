import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { EventAgendaItem } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function clamp(v: unknown, max: number) {
  if (v == null) return null
  return String(v).slice(0, max)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const event_id = searchParams.get("event_id")
  if (!event_id) return json({ error: "Missing event_id" }, 400)

  const { data, error } = await supabaseAdmin
    .from("event_agenda_items")
    .select(
      "id,event_id,start_at,end_at,title,description,location,track,speaker,sort_index,created_at"
    )
    .eq("event_id", event_id)
    .order("start_at", { ascending: true, nullsLast: true })
    .order("sort_index", { ascending: true })

  if (error) return json({ error: error.message }, 400)
  return json({ items: data || [] })
}

export async function POST(req: Request) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const body = await req.json().catch(() => null)
  if (!body?.event_id || !body?.title) {
    return json({ error: "Missing fields" }, 400)
  }

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
    .select(
      "id,event_id,start_at,end_at,title,description,location,track,speaker,sort_index,created_at"
    )
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ item: data })
}

export async function PUT(req: Request) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const body = await req.json().catch(() => null)
  if (!body?.id) return json({ error: "Missing id" }, 400)

  const patch: Partial<EventAgendaItem> = {}

  if (body.title != null) patch.title = clamp(body.title, 200) as any
  if (body.description !== undefined) {
    patch.description = body.description == null ? null : (clamp(body.description, 10000) as any)
  }
  if (body.location !== undefined) {
    patch.location = body.location == null ? null : (clamp(body.location, 200) as any)
  }
  if (body.track !== undefined) {
    patch.track = body.track == null ? null : (clamp(body.track, 120) as any)
  }
  if (body.speaker !== undefined) {
    patch.speaker = body.speaker == null ? null : (clamp(body.speaker, 200) as any)
  }
  if (body.start_at !== undefined) patch.start_at = body.start_at || null
  if (body.end_at !== undefined) patch.end_at = body.end_at || null
  if (body.sort_index !== undefined) {
    patch.sort_index = Number.isFinite(Number(body.sort_index)) ? Number(body.sort_index) : 0
  }

  const { data, error } = await supabaseAdmin
    .from("event_agenda_items")
    .update(patch)
    .eq("id", body.id)
    .select(
      "id,event_id,start_at,end_at,title,description,location,track,speaker,sort_index,created_at"
    )
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ item: data })
}

export async function DELETE(req: Request) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const body = await req.json().catch(() => null)
  if (!body?.id) return json({ error: "Missing id" }, 400)

  const { error } = await supabaseAdmin
    .from("event_agenda_items")
    .delete()
    .eq("id", body.id)

  if (error) return json({ error: error.message }, 400)
  return json({ ok: true })
}