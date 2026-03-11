import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { EventBreakout } from "@/lib/types"

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
    .from("event_breakouts")
    .select(
      "id,event_id,title,description,join_link,start_at,end_at,speaker_name,speaker_avatar_url,manual_live,auto_open,created_at"
    )
    .eq("event_id", event_id)
    .order("start_at", { ascending: true, nullsLast: true })
    .order("created_at", { ascending: true })

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
    join_link: clamp(body.join_link, 2000),
    start_at: body.start_at || null,
    end_at: body.end_at || null,
    speaker_name: clamp(body.speaker_name, 200),
    speaker_avatar_url: clamp(body.speaker_avatar_url, 2000),
    manual_live: !!body.manual_live,
    auto_open: !!body.auto_open,
  }

  const { data, error } = await supabaseAdmin
    .from("event_breakouts")
    .insert(row)
    .select(
      "id,event_id,title,description,join_link,start_at,end_at,speaker_name,speaker_avatar_url,manual_live,auto_open,created_at"
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

  const patch: Partial<EventBreakout> = {}

  if (body.title != null) patch.title = clamp(body.title, 200) as any
  if (body.description !== undefined) {
    patch.description = body.description == null ? null : (clamp(body.description, 10000) as any)
  }
  if (body.join_link !== undefined) {
    patch.join_link = body.join_link == null ? null : (clamp(body.join_link, 2000) as any)
  }
  if (body.start_at !== undefined) patch.start_at = body.start_at || null
  if (body.end_at !== undefined) patch.end_at = body.end_at || null
  if (body.speaker_name !== undefined) {
    patch.speaker_name = body.speaker_name == null ? null : (clamp(body.speaker_name, 200) as any)
  }
  if (body.speaker_avatar_url !== undefined) {
    patch.speaker_avatar_url =
      body.speaker_avatar_url == null ? null : (clamp(body.speaker_avatar_url, 2000) as any)
  }
  if (body.manual_live !== undefined) patch.manual_live = !!body.manual_live
  if (body.auto_open !== undefined) patch.auto_open = !!body.auto_open

  const { data, error } = await supabaseAdmin
    .from("event_breakouts")
    .update(patch)
    .eq("id", body.id)
    .select(
      "id,event_id,title,description,join_link,start_at,end_at,speaker_name,speaker_avatar_url,manual_live,auto_open,created_at"
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
    .from("event_breakouts")
    .delete()
    .eq("id", body.id)

  if (error) return json({ error: error.message }, 400)
  return json({ ok: true })
}