import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
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

async function validateDistrictParent({
  eventId,
  parentId,
  sessionId,
}: {
  eventId: string
  parentId: string | null
  sessionId?: string | null
}) {
  if (!parentId) return null
  if (sessionId && parentId === sessionId) throw new Error("A district cannot be its own parent")

  const visited = new Set<string>(sessionId ? [sessionId] : [])
  let currentId: string | null = parentId
  let depth = 0

  while (currentId) {
    if (visited.has(currentId)) throw new Error("That parent would create a district loop")
    if (depth++ > 50) throw new Error("District trees can contain at most 50 levels")
    visited.add(currentId)

    const { data, error } = await supabaseAdmin
      .from("event_sessions")
      .select("id,event_id,session_kind,district_parent_id")
      .eq("id", currentId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data || data.event_id !== eventId) throw new Error("The parent district does not belong to this event")
    if (!["district_zone", "district_region", "district", "breakout"].includes(String(data.session_kind || ""))) {
      throw new Error("Only a district-tree node can be a parent")
    }
    currentId = data.district_parent_id || null
  }

  return parentId
}

export async function POST(req: Request): Promise<Response> {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  try {
    const body = await req.json().catch((): null => null)

    const eventId = cleanString(body?.event_id, 100)
    const sessionKind = cleanString(body?.session_kind, 50)
    const districtParentId = ["district_zone", "district_region", "district", "breakout"].includes(sessionKind || "")
      ? await validateDistrictParent({ eventId: eventId || "", parentId: cleanString(body?.district_parent_id, 100) })
      : null

    const row = {
      event_id: eventId,
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

      session_kind: sessionKind,
      district_parent_id: districtParentId,
      visibility_mode: cleanString(body?.visibility_mode, 50),
      delivery_mode: cleanString(body?.delivery_mode, 50),
      external_platform: cleanString(body?.external_platform, 50),
      external_join_url: cleanString(body?.external_join_url, 2000),
      live_provider: cleanString(body?.live_provider, 50),
      live_room_name: cleanString(body?.live_room_name, 200),
      is_general_session: cleanBool(body?.is_general_session),
      runtime_status: cleanString(body?.runtime_status, 50),
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
  } catch (error: unknown) {
    return json({ error: errorMessage(error, "Failed to create session") }, 400)
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

    const sessionKind = cleanString(body?.session_kind, 50)
    const districtParentId = ["district_zone", "district_region", "district", "breakout"].includes(sessionKind || "")
      ? await validateDistrictParent({
          eventId: event_id,
          parentId: cleanString(body?.district_parent_id, 100),
          sessionId: id,
        })
      : null

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

      session_kind: sessionKind,
      district_parent_id: districtParentId,
      visibility_mode: cleanString(body?.visibility_mode, 50),
      delivery_mode: cleanString(body?.delivery_mode, 50),
      external_platform: cleanString(body?.external_platform, 50),
      external_join_url: cleanString(body?.external_join_url, 2000),
      live_provider: cleanString(body?.live_provider, 50),
      live_room_name: cleanString(body?.live_room_name, 200),
      is_general_session: cleanBool(body?.is_general_session),
      runtime_status: cleanString(body?.runtime_status, 50),

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
  } catch (error: unknown) {
    return json({ error: errorMessage(error, "Failed to save session") }, 400)
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
  } catch (error: unknown) {
    return json({ error: errorMessage(error, "Failed to delete session") }, 400)
  }
}
