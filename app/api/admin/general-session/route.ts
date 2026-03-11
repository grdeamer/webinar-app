import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function clean(body: any) {
  return {
    event_id: body.event_id,
    code: String(body.code || "").trim().toUpperCase(),
    title: String(body.title || "").trim(),
    description: body.description ? String(body.description).trim() : null,
    starts_at: body.starts_at || null,
    ends_at: body.ends_at || null,
    presenter: body.presenter ? String(body.presenter).trim() : null,
    join_link: body.join_link ? String(body.join_link).trim() : null,
    room_key: body.room_key ? String(body.room_key).trim() : null,
    manual_live: !!body.manual_live,
    playback_type: body.playback_type ? String(body.playback_type).trim() : null,
    playback_mp4_url: body.playback_mp4_url ? String(body.playback_mp4_url).trim() : null,
    playback_m3u8_url: body.playback_m3u8_url ? String(body.playback_m3u8_url).trim() : null,
    sort_order: Number(body.sort_order || 0),
  }
}

export async function POST(req: Request) {
  await requireAdmin()

  const body = await req.json().catch((): null => null)
  if (!body?.event_id) {
    return NextResponse.json({ error: "event_id is required" }, { status: 400 })
  }

  const payload = clean(body)

  if (!payload.code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 })
  }

  if (!payload.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("event_sessions")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, session: data })
}

export async function PUT(req: Request) {
  await requireAdmin()

  const body = await req.json().catch((): null => null)
  if (!body?.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const payload = clean(body)

  if (!payload.code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 })
  }

  if (!payload.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("event_sessions")
    .update(payload)
    .eq("id", body.id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, session: data })
}

export async function DELETE(req: Request) {
  await requireAdmin()

  const body = await req.json().catch((): null => null)
  if (!body?.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("event_sessions")
    .delete()
    .eq("id", body.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}