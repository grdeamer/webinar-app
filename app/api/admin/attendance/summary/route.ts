import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type UserWebinarRow = {
  user_id: string | null
}

type AttendeeSessionRow = {
  user_id: string | null
  last_seen: string | null
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: distinctUsers, error: duErr } = await supabaseAdmin
    .from("user_webinars")
    .select("user_id")

  if (duErr) return NextResponse.json({ error: duErr.message }, { status: 500 })

  const preregDistinct = new Set(
    ((distinctUsers ?? []) as UserWebinarRow[])
      .map((r) => r.user_id)
      .filter((v): v is string => !!v)
  ).size

  const cutoff = new Date(Date.now() - 60 * 1000).toISOString()

  const { data: activeRows, error: aErr } = await supabaseAdmin
    .from("attendee_sessions")
    .select("user_id,last_seen")
    .gte("last_seen", cutoff)

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

  const activeDistinct = new Set(
    ((activeRows ?? []) as AttendeeSessionRow[])
      .map((r) => r.user_id)
      .filter((v): v is string => !!v)
  ).size

  return NextResponse.json({
    preregistered: preregDistinct,
    active: activeDistinct,
    cutoff,
  })
}