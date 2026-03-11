import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch((): null => null)
    const webinarId = body?.webinarId

    if (typeof webinarId !== "string" || !isUuid(webinarId)) {
      return NextResponse.json({ error: "Invalid webinarId" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const token = cookieStore.get("user_token")?.value
    const JWT_SECRET = process.env.JWT_SECRET

    let userId: string | null = null
    if (token && JWT_SECRET) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as any
        if (payload?.userId && typeof payload.userId === "string") {
          userId = payload.userId
        }
      } catch {
        // ignore invalid token
      }
    }

    const { error } = await supabaseAdmin.from("webinar_clicks").insert({
      webinar_id: webinarId,
      user_id: userId,
    })

    if (error) {
      console.error("click insert error:", error)
      return NextResponse.json({ error: "Unable to log click" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("click route error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}