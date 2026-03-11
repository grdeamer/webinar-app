import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const body = await req.json().catch(() => null)
  if (!body?.title || !body?.slug) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const row = {
    title: String(body.title).slice(0, 200),
    slug: String(body.slug).toLowerCase().trim().slice(0, 120),
  }

  const { data, error } = await supabaseAdmin.from("events").insert(row).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ id: data.id })
}

export async function PUT(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const patch = {
    title: body.title ? String(body.title).slice(0, 200) : null,
    description: body.description != null ? String(body.description).slice(0, 10000) : null,
    start_at: body.start_at || null,
    end_at: body.end_at || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin.from("events").update(patch).eq("id", body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
