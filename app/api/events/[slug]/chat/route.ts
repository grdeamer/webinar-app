import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventBySlug } from "@/lib/events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const event = await getEventBySlug(slug)
  const { searchParams } = new URL(req.url)
  const roomKey = searchParams.get("room_key") || "general"

  const { data, error } = await supabaseAdmin
    .from("event_chat_messages")
    .select("id,name,message,created_at")
    .eq("event_id", event.id)
    .eq("room_key", roomKey)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ messages: (data || []).reverse() })
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const event = await getEventBySlug(slug)
  const body = await req.json().catch(() => null)

  if (!body?.message) return NextResponse.json({ error: "Missing message" }, { status: 400 })

  const row = {
    event_id: event.id,
    room_key: body.room_key || "general",
    session_id: body.session_id || null,
    name: body.name || null,
    message: String(body.message).slice(0, 2000),
  }

  const { error } = await supabaseAdmin.from("event_chat_messages").insert(row)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
