import { NextResponse } from "next/server"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { supabaseAdmin } from "../../../lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const emailRaw = body?.email

    if (typeof emailRaw !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const email = emailRaw.trim().toLowerCase()
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      return NextResponse.json({ error: "JWT_SECRET missing" }, { status: 500 })
    }

    // Create or find user
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .upsert({ email }, { onConflict: "email" })
      .select("id,email")
      .single()

    if (error || !user) {
      console.error("access upsert user error:", error)
      return NextResponse.json(
        { error: error?.message || "Unable to access" },
        { status: 500 }
      )
    }

    // Signed cookie token for the user
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "30d",
    })

    const res = NextResponse.json({ success: true })

    // httpOnly auth cookie (server-trusted)
    res.cookies.set({
      name: "user_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })

    // Presence session (used for realtime "who is in the lobby")
    const sessionId = crypto.randomUUID()
    const ua = req.headers.get("user-agent") || null

    // non-httpOnly session cookie (client-readable if you want)
    res.cookies.set({
      name: "attendee_session_id",
      value: sessionId,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    })

    // Upsert attendee session row (server-side)
    const { error: pErr } = await supabaseAdmin.from("attendee_sessions").upsert(
      {
        session_id: sessionId,
        user_id: user.id,
        email: user.email,
        last_seen: new Date().toISOString(),
        user_agent: ua,
      },
      { onConflict: "session_id" }
    )

    if (pErr) {
      console.error("presence upsert error:", pErr)
      // non-fatal; user can still proceed
    }

    return res
  } catch (err) {
    console.error("access route error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}