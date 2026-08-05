import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { EventAgendaItem } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const agendaSelect =
  "id,event_id,start_at,end_at,title,description,location,track,speaker,speaker_title,speaker_bio,speaker_photo_url,sort_index,status,button_text,button_url,is_visible,created_at,updated_at"

function json(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status })
}

function clamp(v: unknown, max: number) {
  if (v == null) return null
  return String(v).slice(0, max)
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const event_id = searchParams.get("event_id")
  if (!event_id) return json({ error: "Missing event_id" }, 400)

  const { data, error } = await supabaseAdmin
    .from("event_agenda_items")
    .select(agendaSelect)
    .eq("event_id", event_id)
    .order("start_at", { ascending: true })
    .order("sort_index", { ascending: true })

  if (error) return json({ error: error.message }, 400)
  return json({ items: data || [] })
}

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  const body = await req.json().catch((): null => null)
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
    speaker_title: clamp(body.speaker_title, 200),
    speaker_bio: clamp(body.speaker_bio, 10000),
    speaker_photo_url: clamp(body.speaker_photo_url, 2000),
    start_at: body.start_at || null,
    end_at: body.end_at || null,
    sort_index: Number.isFinite(Number(body.sort_index)) ? Number(body.sort_index) : 0,
    status: body.status || "upcoming",
    button_text: clamp(body.button_text, 200),
    button_url: clamp(body.button_url, 2000),
    is_visible: body.is_visible !== false,
  }

  const { data, error } = await supabaseAdmin
    .from("event_agenda_items")
    .insert(row)
    .select(agendaSelect)
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ item: data })
}

export async function PUT(req: Request): Promise<Response> {
  await requireAdmin()

  const body = await req.json().catch((): null => null)
  if (!body?.id) return json({ error: "Missing id" }, 400)

  const patch: Partial<EventAgendaItem> = {}

  if (body.title != null) patch.title = clamp(body.title, 200) || "Untitled"
  if (body.description !== undefined) {
    patch.description = body.description == null ? null : clamp(body.description, 10000)
  }
  if (body.location !== undefined) {
    patch.location = body.location == null ? null : clamp(body.location, 200)
  }
  if (body.track !== undefined) {
    patch.track = body.track == null ? null : clamp(body.track, 120)
  }
  if (body.speaker !== undefined) {
    patch.speaker = body.speaker == null ? null : clamp(body.speaker, 200)
  }
  if (body.speaker_title !== undefined) {
    patch.speaker_title =
      body.speaker_title == null ? null : clamp(body.speaker_title, 200)
  }
  if (body.speaker_bio !== undefined) {
    patch.speaker_bio =
      body.speaker_bio == null ? null : clamp(body.speaker_bio, 10000)
  }
  if (body.speaker_photo_url !== undefined) {
    patch.speaker_photo_url =
      body.speaker_photo_url == null
        ? null
        : clamp(body.speaker_photo_url, 2000)
  }
  if (body.start_at !== undefined) patch.start_at = body.start_at || null
  if (body.end_at !== undefined) patch.end_at = body.end_at || null
  if (body.sort_index !== undefined) {
    patch.sort_index = Number.isFinite(Number(body.sort_index)) ? Number(body.sort_index) : 0
  }
  if (body.status !== undefined) patch.status = body.status
  if (body.button_text !== undefined) {
    patch.button_text = body.button_text == null ? null : clamp(body.button_text, 200)
  }
  if (body.button_url !== undefined) {
    patch.button_url = body.button_url == null ? null : clamp(body.button_url, 2000)
  }
  if (body.is_visible !== undefined) patch.is_visible = Boolean(body.is_visible)

  const { data, error } = await supabaseAdmin
    .from("event_agenda_items")
    .update(patch)
    .eq("id", body.id)
    .select(agendaSelect)
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ item: data })
}

export async function DELETE(req: Request): Promise<Response> {
  await requireAdmin()

  const body = await req.json().catch((): null => null)
  if (!body?.id) return json({ error: "Missing id" }, 400)

  const { error } = await supabaseAdmin
    .from("event_agenda_items")
    .delete()
    .eq("id", body.id)

  if (error) return json({ error: error.message }, 400)
  return json({ ok: true })
}
