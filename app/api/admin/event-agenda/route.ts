import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { EventAgendaItem, EventAgendaResource, EventAgendaSpeaker } from "@/lib/types"
import { normalizeAgendaIconKey } from "@/lib/agendaIcons"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const agendaSelect =
  "id,event_id,start_at,end_at,title,description,location,track,speaker,speaker_title,speaker_bio,speaker_photo_url,speakers,show_session_details,show_speaker_photo,resources,show_resources,district_lookup_enabled,icon_key,sort_index,status,button_text,button_url,is_visible,created_at,updated_at"

function json(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status })
}

function clamp(v: unknown, max: number) {
  if (v == null) return null
  return String(v).slice(0, max)
}

function normalizeResources(value: unknown): EventAgendaResource[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 25).flatMap((entry): EventAgendaResource[] => {
    if (!entry || typeof entry !== "object") return []
    const resource = entry as Record<string, unknown>
    const url = clamp(resource.url, 2000)
    const label = clamp(resource.label, 200)
    if (!url || !label || !url.startsWith("https://")) return []
    return [{
      id: clamp(resource.id, 100) || crypto.randomUUID(),
      label,
      url,
      file_name: clamp(resource.file_name, 255) || label,
      mime_type: clamp(resource.mime_type, 200),
      size_bytes: Number.isFinite(Number(resource.size_bytes)) ? Number(resource.size_bytes) : null,
    }]
  })
}

function normalizeSpeakers(value: unknown): EventAgendaSpeaker[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 12).flatMap((entry): EventAgendaSpeaker[] => {
    if (!entry || typeof entry !== "object") return []
    const speaker = entry as Record<string, unknown>
    const name = clamp(speaker.name, 200)?.trim()
    if (!name) return []
    return [{
      id: clamp(speaker.id, 100) || crypto.randomUUID(),
      name,
      title: clamp(speaker.title, 200),
      bio: clamp(speaker.bio, 10000),
      photo_url: clamp(speaker.photo_url, 2000),
    }]
  })
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

  const speakers = normalizeSpeakers(body.speakers)
  if (speakers.length === 0 && clamp(body.speaker, 200)?.trim()) {
    speakers.push({
      id: crypto.randomUUID(),
      name: clamp(body.speaker, 200)?.trim() || "Speaker",
      title: clamp(body.speaker_title, 200),
      bio: clamp(body.speaker_bio, 10000),
      photo_url: clamp(body.speaker_photo_url, 2000),
    })
  }
  const primarySpeaker = speakers[0]
  const row = {
    event_id: body.event_id,
    title: clamp(body.title, 200) || "Untitled",
    description: clamp(body.description, 10000),
    location: clamp(body.location, 200),
    track: clamp(body.track, 120),
    speaker: primarySpeaker?.name || clamp(body.speaker, 200),
    speaker_title: primarySpeaker?.title ?? clamp(body.speaker_title, 200),
    speaker_bio: primarySpeaker?.bio ?? clamp(body.speaker_bio, 10000),
    speaker_photo_url: primarySpeaker?.photo_url ?? clamp(body.speaker_photo_url, 2000),
    speakers,
    show_session_details: body.show_session_details !== false,
    show_speaker_photo: body.show_speaker_photo !== false,
    resources: normalizeResources(body.resources),
    show_resources: body.show_resources !== false,
    district_lookup_enabled: body.district_lookup_enabled === true,
    icon_key: normalizeAgendaIconKey(body.icon_key),
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
  if (body.speakers !== undefined) {
    const speakers = normalizeSpeakers(body.speakers)
    const primarySpeaker = speakers[0]
    patch.speakers = speakers
    patch.speaker = primarySpeaker?.name || null
    patch.speaker_title = primarySpeaker?.title || null
    patch.speaker_bio = primarySpeaker?.bio || null
    patch.speaker_photo_url = primarySpeaker?.photo_url || null
  }
  if (body.show_session_details !== undefined) {
    patch.show_session_details = Boolean(body.show_session_details)
  }
  if (body.show_speaker_photo !== undefined) {
    patch.show_speaker_photo = Boolean(body.show_speaker_photo)
  }
  if (body.resources !== undefined) {
    patch.resources = normalizeResources(body.resources)
  }
  if (body.show_resources !== undefined) {
    patch.show_resources = Boolean(body.show_resources)
  }
  if (body.district_lookup_enabled !== undefined) {
    patch.district_lookup_enabled = Boolean(body.district_lookup_enabled)
  }
  if (body.icon_key !== undefined) {
    patch.icon_key = normalizeAgendaIconKey(body.icon_key)
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
