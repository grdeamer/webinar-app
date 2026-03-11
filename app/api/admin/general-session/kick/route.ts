import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Kick a viewer session (soft-kick)
 * Table: general_session_kicks (room_key, session_id, kicked_at, reason)
 */
export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const body = await req.json().catch(() => ({}))
  const room_key = (body?.room_key as string) || "general"
  const session_id = (body?.session_id as string) || ""
  const reason =
    typeof body?.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 200)
      : "Removed by host"

  if (!session_id) return json({ error: "session_id required" }, 400)

  const { error } = await supabaseAdmin.from("general_session_kicks").insert({
    room_key,
    session_id,
    reason,
    kicked_at: new Date().toISOString(),
  })

  if (error) return json({ error: error.message }, 400)
  return json({ ok: true })
}
