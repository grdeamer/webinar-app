import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const room_key = url.searchParams.get("room_key") || "general"
  const session_id = url.searchParams.get("session_id") || ""

  if (!session_id) return json({ error: "session_id required" }, 400)

  const { data, error } = await supabaseAdmin
    .from("general_session_kicks")
    .select("kicked_at,reason")
    .eq("room_key", room_key)
    .eq("session_id", session_id)
    .order("kicked_at", { ascending: false })
    .limit(1)

  if (error) return json({ error: error.message }, 400)

  const kicked = Boolean(data && data[0])
  return json({ room_key, session_id, kicked, info: data?.[0] ?? null })
}
