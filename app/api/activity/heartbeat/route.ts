import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const room_key = (body?.room_key as string) || "general"
  const session_id = (body?.session_id as string) || ""
  const current_path = (body?.current_path as string) || ""
  const user_id = (body?.user_id as string) || null
  const user_email = (body?.user_email as string) || null

  if (!session_id) return json({ error: "session_id required" }, 400)
  if (!current_path) return json({ error: "current_path required" }, 400)

  const now = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from("attendee_activity")
    .upsert(
      {
        room_key,
        session_id,
        user_id,
        user_email,
        current_path,
        updated_at: now,
      },
      { onConflict: "room_key,session_id" }
    )

  if (error) return json({ error: error.message }, 400)
  return json({ ok: true })
}