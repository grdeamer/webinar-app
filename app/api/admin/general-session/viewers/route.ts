import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Returns currently live viewers (heartbeat within last 45s) for the General Session.
 * Table: general_session_presence (room_key, session_id, user_id, user_email, last_seen_at)
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const room_key = url.searchParams.get("room_key") || "general"

  const cutoff = new Date(Date.now() - 45_000).toISOString()

  const { data, error } = await supabaseAdmin
    .from("general_session_presence")
    .select("session_id,user_id,user_email,last_seen_at")
    .eq("room_key", room_key)
    .gte("last_seen_at", cutoff)
    .order("last_seen_at", { ascending: false })

  if (error) return json({ error: error.message }, 400)

  return json({ room_key, viewers: data || [] })
}
