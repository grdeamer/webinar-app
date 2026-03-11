import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import crypto from "crypto"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200): Response {
  return NextResponse.json(data, { status })
}

export async function POST(): Promise<Response> {
  await requireAdmin()

  const { data: row, error: loadErr } = await supabaseAdmin
    .from("general_session_settings")
    .select("presenter_key")
    .eq("id", 1)
    .maybeSingle()

  if (loadErr) return json({ error: loadErr.message }, 400)

  if (row?.presenter_key) {
    return json({ presenter_key: row.presenter_key })
  }

  const presenter_key = crypto.randomBytes(18).toString("base64url")

  const { data, error } = await supabaseAdmin
    .from("general_session_settings")
    .upsert(
      { id: 1, presenter_key, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select("presenter_key")
    .single()

  if (error) return json({ error: error.message }, 400)

  return json({ presenter_key: data.presenter_key })
}