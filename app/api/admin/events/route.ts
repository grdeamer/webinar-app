import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(req: Request) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const body = await req.json().catch((): null => null)
  if (!body?.title || !body?.slug) {
    return json({ error: "Missing fields" }, 400)
  }

  const row = {
    title: String(body.title).slice(0, 200),
    slug: String(body.slug).toLowerCase().trim().slice(0, 120),
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert(row)
    .select("id")
    .single()

  if (error) {
    return json({ error: error.message }, 400)
  }

  return json({ id: data.id })
}

export async function PUT(req: Request) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const body = await req.json().catch((): null => null)
  if (!body?.id) {
    return json({ error: "Missing id" }, 400)
  }

  const patch = {
    title: body.title ? String(body.title).slice(0, 200) : null,
    description: body.description != null ? String(body.description).slice(0, 10000) : null,
    start_at: body.start_at || null,
    end_at: body.end_at || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from("events")
    .update(patch)
    .eq("id", body.id)

  if (error) {
    return json({ error: error.message }, 400)
  }

  return json({ ok: true })
}