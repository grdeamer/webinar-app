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

  // "Live" = heartbeat within last 45 seconds
  const cutoff = new Date(Date.now() - 45_000).toISOString()

  const { data, error } = await supabaseAdmin
    .from("general_session_presence")
    .select("session_id,last_seen_at")
    .eq("room_key", room_key)
    .gte("last_seen_at", cutoff)

  if (error) return json({ error: error.message }, 400)

  return json({
    room_key,
    live: data?.length ?? 0,
  })
}