import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

async function getUniqueEventSlug(baseSlug: string) {
  const safeBase = slugify(baseSlug || "event") || "event"

  const { data, error } = await supabaseAdmin
    .from("events")
    .select("slug")
    .ilike("slug", `${safeBase}%`)

  if (error) {
    throw new Error(error.message)
  }

  const existing = new Set(
    (data ?? []).map((row: any) => String(row.slug).toLowerCase())
  )

  if (!existing.has(safeBase)) return safeBase

  let n = 2
  while (existing.has(`${safeBase}-${n}`)) {
    n++
  }

  return `${safeBase}-${n}`
}

export async function POST(req: Request) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const body = await req.json().catch((): null => null)
  if (!body?.title) {
    return json({ error: "Missing title" }, 400)
  }

  const rawTitle = String(body.title).slice(0, 200)
  const rawSlug = body.slug ? String(body.slug) : rawTitle

  let finalSlug: string

  try {
    finalSlug = await getUniqueEventSlug(rawSlug)
  } catch (err: any) {
    return json({ error: err?.message || "Slug generation failed" }, 500)
  }

  const row = {
    title: rawTitle,
    slug: finalSlug,
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert(row)
    .select("id, slug")
    .single()

  if (error) {
    return json({ error: error.message }, 400)
  }

  return json({ id: data.id, slug: data.slug })
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
    description:
      body.description != null
        ? String(body.description).slice(0, 10000)
        : null,
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