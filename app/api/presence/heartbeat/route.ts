import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) return NextResponse.json({ error: "JWT_SECRET missing" }, { status: 500 })

  const cookieStore = await cookies()
  const token = cookieStore.get("user_token")?.value
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  let payload: any
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  const userId = payload?.userId
  const email = payload?.email
  if (!userId || !email) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

  const sessionId =
    cookieStore.get("attendee_session_id")?.value || req.headers.get("x-attendee-session-id") || null

  if (!sessionId) {
    // If missing, just respond ok; access route should set it.
    return NextResponse.json({ ok: true, warning: "missing attendee_session_id" })
  }

  const ua = req.headers.get("user-agent") || null

  const { error } = await supabaseAdmin
    .from("attendee_sessions")
    .update({ last_seen: new Date().toISOString(), user_agent: ua })
    .eq("session_id", sessionId)
    .eq("user_id", userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
