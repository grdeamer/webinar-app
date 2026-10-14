import { supabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { consumeEmailCode, getActiveRegistrant, getRegistrationEvent, requestEmailCode } from "@/lib/registration/server"
import { createAttendeeToken } from "@/lib/registration/tokens"
import { isEmail, record } from "@/lib/registration/schema"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function POST(req: Request) {
  try {
    const body = record(await req.json()), email = String(body.email ?? "").trim().toLowerCase(), slug = String(body.slug ?? "").trim()
    if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 })
    const event = slug ? await getRegistrationEvent(slug) : null
    if (slug && !event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
    if (body.challengeId) {
      const challenge = await consumeEmailCode(String(body.challengeId), String(body.code ?? ""))
      if (challenge.purpose !== "login" || challenge.event_id !== (event?.id ?? null) || challenge.email !== email) throw new Error("Code does not match this event and email")
      if (event && !await getActiveRegistrant(event.id, email)) return NextResponse.json({ error: "No active registration found. Register or contact the organizer." }, { status: 403 })
      const { data: user, error: userError } = await supabaseAdmin.from("users").upsert({ email }, { onConflict: "email" }).select("id").single()
      if (userError) throw new Error("Unable to establish attendee session")
      const response = NextResponse.json({ ok: true, verified: true, redirect: event ? `/events/${encodeURIComponent(event.slug)}` : "/my-webinars" })
      response.cookies.set("user_token", createAttendeeToken({ email, userId: user.id, eventId: event?.id ?? null, slug: event?.slug ?? null }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 86400 })
      response.headers.set("Cache-Control", "no-store")
      return response
    }
    // Do not disclose whether an email is registered before ownership is verified.
    const challengeId = await requestEmailCode({ email, eventId: event?.id ?? null, purpose: "login", request: req })
    return NextResponse.json({ ok: true, challengeId, verificationRequired: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify email" }, { status: 400 }) }
}
