import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventBySlug } from "@/lib/events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const event = await getEventBySlug(slug)

  const { data, error } = await supabaseAdmin
    .from("event_networking_profiles")
    .select("id,name,title,company,bio,interests,created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ profiles: data || [] })
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const event = await getEventBySlug(slug)

  const body = await req.json().catch((): null => null)

  if (!body?.session_id || !body?.name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const row = {
    event_id: event.id,
    session_id: String(body.session_id),
    name: String(body.name).slice(0, 120),
    title: body.title ? String(body.title).slice(0, 120) : null,
    company: body.company ? String(body.company).slice(0, 120) : null,
    bio: body.bio ? String(body.bio).slice(0, 2000) : null,
    interests: body.interests ? String(body.interests).slice(0, 500) : null,
  }

  const { error } = await supabaseAdmin
    .from("event_networking_profiles")
    .upsert(row, { onConflict: "event_id,session_id" })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}