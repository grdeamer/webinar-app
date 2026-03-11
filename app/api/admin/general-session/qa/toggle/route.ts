import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const body = await req.json().catch(() => null)
  const slug = typeof body?.slug === "string" ? body.slug : "general-session"
  const enabled = typeof body?.enabled === "boolean" ? body.enabled : null
  const allowAnonymous = typeof body?.allow_anonymous === "boolean" ? body.allow_anonymous : null

  if (enabled === null && allowAnonymous === null) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 })
  }

  const patch: { enabled?: boolean; allow_anonymous?: boolean } = {}
  if (enabled !== null) patch.enabled = enabled
  if (allowAnonymous !== null) patch.allow_anonymous = allowAnonymous

  const { error } = await supabaseAdmin.from("qa_sessions").update(patch).eq("slug", slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
