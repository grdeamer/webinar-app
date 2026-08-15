import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const eventId = new URL(req.url).searchParams.get("event_id")?.trim() ?? ""
  if (!isUuid(eventId)) {
    return NextResponse.json({ items: [] })
  }

  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { data, error } = await supabaseAdmin
    .from("qa_messages")
    .select(
      "id,name,question,status,created_at,origin_region,origin_country,origin_city,origin_lat,origin_lng"
    )
    .eq("event_id", eventId)
    .in("status", ["pending", "approved", "answered"])
    .gte("created_at", since)
    .not("origin_lat", "is", null)
    .not("origin_lng", "is", null)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ items: data ?? [] })
}
