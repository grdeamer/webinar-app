import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  try {
    const body = await req.json()
    const scopeType = String(body.scopeType || "event")
    const scopeId = String(body.scopeId || "")

    if (!scopeId) {
      return NextResponse.json({ error: "scopeId is required" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("refresh_signals")
      .upsert(
        {
          scope_type: scopeType,
          scope_id: scopeId,
          refresh_token: crypto.randomUUID(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "scope_type,scope_id" }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 })
  }
}