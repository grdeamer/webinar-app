import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function cleanString(v: unknown, max = 1000) {
  if (v == null) return null
  const s = String(v).trim()
  return s ? s.slice(0, max) : null
}

function cleanCode(v: unknown) {
  const s = cleanString(v, 50)
  return s ? s.toUpperCase() : null
}

function cleanNumber(v: unknown, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function cleanBool(v: unknown) {
  return !!v
}

export async function POST(req: Request): Promise<Response> {
const authResult = await requireAdmin()
if (authResult instanceof Response) return authResult

  try {
    const body = await req.json().catch((): null => null)

    const row = {
      event_id: cleanString(body?.event_id, 100),
      code: cleanCode(body?.code),
      title: cleanString(body?.title, 200),
      description: cleanString(body?.description, 5000),
      starts_at: body?.starts_at || null,
      ends_at: body?.ends_at || null,
      presenter: cleanString(body?.presenter, 200),
      join_link: cleanString(body?.join_link, 2000),
      room_key: cleanString(body?.room_key, 200),
      manual_live: cleanBool(body?.manual_live),
      playback_type: cleanString(body?.playback_type, 50),
      playback_mp4_url: cleanString(body?.playback_mp4_url, 2000),
      playback_m3u8_url: cleanString(body?.playback_m3u8_url, 2000),
      sort_order: cleanNumber(body?.sort_order, 0),
    }

    if (!row.event_id) return json({ error: "Missing event_id" }, 400)
    if (!row.code) return json({ error: "Session code is required" }, 400)
    if (!row.title) return json({ error: "Session title is required" }, 400)

    const { data, error } = await supabaseAdmin
      .from("event_sessions")
      .insert(row)
      .select("*")
      .single()

    if (error) return json({ error: error.message }, 400)

    return json({ ok: true, session: data })
  } catch (e: any) {
    return json({ error: e?.message || "Failed to create session" }, 400)
  }
}

export async function PUT(req: Request): Promise<Response> {
const authResult = await requireAdmin()
if (authResult instanceof Response) return authResult

  try {
    const body = await req.json().catch((): null => null)

    const id = cleanString(body?.id, 100)
    const event_id = cleanString(body?.event_id, 100)

    if (!id) return json({ error: "Missing session id" }, 400)
    if (!event_id) return json({ error: "Missing event_id" }, 400)

    const row = {
      code: cleanCode(body?.code),
      title: cleanString(body?.title, 200),
      description: cleanString(body?.description, 5000),
      starts_at: body?.starts_at || null,
      ends_at: body?.ends_at || null,
      presenter: cleanString(body?.presenter, 200),
      join_link: cleanString(body?.join_link, 2000),
      room_key: cleanString(body?.room_key, 200),
      manual_live: cleanBool(body?.manual_live),
      playback_type: cleanString(body?.playback_type, 50),
      playback_mp4_url: cleanString(body?.playback_mp4_url, 2000),
      playback_m3u8_url: cleanString(body?.playback_m3u8_url, 2000),
      sort_order: cleanNumber(body?.sort_order, 0),
      updated_at: new Date().toISOString(),
    }

    if (!row.code) return json({ error: "Session code is required" }, 400)
    if (!row.title) return json({ error: "Session title is required" }, 400)

    const { data, error } = await supabaseAdmin
      .from("event_sessions")
      .update(row)
      .eq("id", id)
      .eq("event_id", event_id)
      .select("*")
      .single()

    if (error) return json({ error: error.message }, 400)

    return json({ ok: true, session: data })
  } catch (e: any) {
    return json({ error: e?.message || "Failed to save session" }, 400)
  }
}

export async function DELETE(req: Request): Promise<Response> {
const authResult = await requireAdmin()
if (authResult instanceof Response) return authResult

  try {
    const body = await req.json().catch((): null => null)
    const id = cleanString(body?.id, 100)

    if (!id) return json({ error: "Missing session id" }, 400)

    await supabaseAdmin.from("event_user_webinars").delete().eq("webinar_id", id)

    const { error } = await supabaseAdmin
      .from("event_sessions")
      .delete()
      .eq("id", id)

    if (error) return json({ error: error.message }, 400)

    return json({ ok: true })
  } catch (e: any) {
    return json({ error: e?.message || "Failed to delete session" }, 400)
  }
}