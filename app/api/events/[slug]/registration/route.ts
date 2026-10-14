import { sendRegistrationReceipt } from "@/lib/registration/receipt"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { consumeEmailCode, getRegistrationConfig, getRegistrationEvent, requestEmailCode } from "@/lib/registration/server"
import { createAttendeeToken } from "@/lib/registration/tokens"
import { record, validateRegistration } from "@/lib/registration/schema"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function GET(_req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const event = await getRegistrationEvent(slug)
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  const config = await getRegistrationConfig(event.id)
  const ids = config.sessions.map((s) => s.id)
  const { data: sessions, error } = ids.length ? await supabaseAdmin.from("event_sessions").select("id,title,starts_at,ends_at").eq("event_id", event.id).in("id", ids) : { data: [] as { id: string; title: string; starts_at: string | null; ends_at: string | null }[], error: null }
  if (error) return NextResponse.json({ error: "Unable to load sessions" }, { status: 500 })
  return NextResponse.json({ config, sessions }, { headers: { "Cache-Control": "no-store" } })
}
export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params, body = record(await req.json()), event = await getRegistrationEvent(slug)
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
    const config = await getRegistrationConfig(event.id)
    if (!config.enabled || config.mode === "closed") return NextResponse.json({ error: "Registration is closed" }, { status: 403 })
    if (!body.challengeId) {
      const payload = validateRegistration(config, body)
      const challengeId = await requestEmailCode({ email: payload.email, eventId: event.id, purpose: "register", payload, request: req })
      return NextResponse.json({ ok: true, challengeId, verificationRequired: true }, { headers: { "Cache-Control": "no-store" } })
    }
    const challenge = await consumeEmailCode(String(body.challengeId), String(body.code ?? ""))
    if (challenge.event_id !== event.id || challenge.purpose !== "register") throw new Error("Code does not match this registration")
    const p = challenge.payload
    // Revalidate against current published settings if the organizer changed the form while verifying.
    const payload = validateRegistration(config, { values: p.answers, sessionIds: p.sessionIds })
    if (payload.email !== challenge.email) throw new Error("Registration email does not match verification")
    const { data, error } = await supabaseAdmin.rpc("save_event_registration", { p_event_id: event.id, p_email: challenge.email, p_first_name: payload.firstName, p_last_name: payload.lastName, p_answers: payload.answers, p_session_ids: payload.sessionIds, p_source: "public" })
    if (error) return NextResponse.json({ error: error.message }, { status: 409 })
    const active = ["registered", "approved", "checked_in"].includes(data.status)
    const confirmationSent = await sendRegistrationReceipt({ eventId: event.id, slug, title: event.title ?? "Jupiter event", email: challenge.email, registrantId: data.id, status: data.status }).catch(() => false)
    const response = NextResponse.json({ ok: true, confirmationSent, status: data.status, existing: data.existing, redirect: active ? `/events/${encodeURIComponent(slug)}/lobby` : null })
    if (active) response.cookies.set("user_token", createAttendeeToken({ email: challenge.email, userId: data.userId, eventId: event.id, slug }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86400 })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed" }, { status: 400 }) }
}
