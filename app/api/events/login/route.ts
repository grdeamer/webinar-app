import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { eventEmailCookieName } from "@/lib/eventAuth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function hasEventAccess(eventId: string, userId: string) {
  const { data: scoped } = await supabaseAdmin
    .from("event_user_webinars")
    .select("webinar_id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .limit(1)

  if ((scoped?.length ?? 0) > 0) return true

  try {
    const { data: attendee } = await supabaseAdmin
      .from("event_attendees")
      .select("event_id,user_id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle()

    return Boolean(attendee)
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const slug = String(body?.slug || "").trim()
    const emailRaw = String(body?.email || "").trim().toLowerCase()

    if (!slug) return NextResponse.json({ error: "Missing event slug" }, { status: 400 })
    if (!emailRaw || !emailRaw.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 })
    }

    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id,slug,title")
      .eq("slug", slug)
      .maybeSingle()

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id,email")
      .eq("email", emailRaw)
      .maybeSingle()

    if (!user) {
      return NextResponse.json(
        { error: "Email not found for this event. Make sure you were added in the admin tools or CSV import." },
        { status: 403 }
      )
    }

    const allowed = await hasEventAccess(event.id, user.id)
    if (!allowed) {
      return NextResponse.json(
        { error: "You are not registered for this event. Make sure your webinar assignment exists for this event." },
        { status: 403 }
      )
    }

    const c = await cookies()
    c.set(eventEmailCookieName(slug), emailRaw, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: `/events/${slug}`,
      maxAge: 60 * 60 * 24 * 7,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 400 })
  }
}
