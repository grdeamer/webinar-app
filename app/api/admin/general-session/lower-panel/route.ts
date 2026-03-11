import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("general_session_lower_panel")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (error) return json({ error: error.message }, 400)
  return json({ panel: data || null })
}

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const body = await req.json().catch(() => ({}))
  const kind = typeof body?.kind === "string" ? body.kind : null
  const name = typeof body?.name === "string" ? body.name.slice(0, 300) : null
  const path = typeof body?.path === "string" ? body.path : null

  if (kind && !["pdf", "image"].includes(kind)) {
    return json({ error: "Invalid kind" }, 400)
  }

  const { data, error } = await supabaseAdmin
    .from("general_session_lower_panel")
    .upsert(
      {
        id: 1,
        kind: kind || null,
        name,
        path,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ panel: data })
}
