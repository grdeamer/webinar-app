import { buildVerificationEmail } from "@/lib/email/registration"
import { randomInt, randomUUID } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getAppUrl, getEmailFrom, getResendClient } from "@/lib/email/resend"
import { createVerificationLink, digest } from "./tokens"
import { normalizeRegistrationConfig, type RegistrationConfig } from "./schema"
export async function getRegistrationEvent(slug: string) {
  const { data, error } = await supabaseAdmin.from("events").select("id,slug,title").eq("slug", slug).maybeSingle()
  if (error) throw new Error("Unable to load event")
  return data
}
export async function getRegistrationConfig(eventId: string): Promise<RegistrationConfig> {
  const { data, error } = await supabaseAdmin.from("event_registration_settings").select("config").eq("event_id", eventId).maybeSingle()
  if (error) throw new Error("Unable to load registration settings")
  // Only explicit publication enables native registration.
  return data?.config as RegistrationConfig ?? normalizeRegistrationConfig({}, false)
}
export async function requestEmailCode(input: { email: string; eventId: string | null; purpose: "login" | "register"; payload?: unknown; request: Request }) {
  const id = randomUUID(), code = String(randomInt(100000, 1000000))
  const ip = input.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const { data, error } = await supabaseAdmin.rpc("issue_registration_challenge", {
    p_id: id, p_event_id: input.eventId, p_email: input.email, p_purpose: input.purpose,
    p_digest: digest(`${id}:${code}`), p_ip_digest: digest(`ip:${ip}`), p_payload: input.payload ?? {},
  })
  if (error) throw new Error("Unable to request verification")
  if (!data) throw new Error("Too many requests. Please wait ten minutes and try again.")
  const event = input.eventId ? await supabaseAdmin.from("events").select("slug,title").eq("id", input.eventId).single() : null
  // Preview links stay on the exact deployment that requested verification.
  const origin = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : getAppUrl()
  const token = createVerificationLink({ challengeId: id, code, email: input.email, slug: event?.data?.slug ?? null, action: input.purpose })
  const email = buildVerificationEmail({ code, url: `${origin}/verify-email#${token}`, logoUrl: `${getAppUrl()}/jupiter-email-logo-inverted.png?v=1`, registering: input.purpose === "register", eventTitle: event?.data?.title ?? undefined })
  const response = await getResendClient().emails.send({ from: getEmailFrom(), to: input.email, ...email }, { idempotencyKey: `registration-code-${id}` })
  if (response.error) {
    await supabaseAdmin.from("event_registration_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", id)
    throw new Error("The verification email could not be sent. Please try again.")
  }
  return id
}
export async function consumeEmailCode(id: string, code: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^\d{6}$/.test(code)) throw new Error("Enter the six-digit code from your email")
  const { data, error } = await supabaseAdmin.rpc("consume_registration_challenge", { p_id: id, p_digest: digest(`${id}:${code}`) })
  if (error || !data) throw new Error("Code is incorrect or expired. Request a new code.")
  return data as { email: string; event_id: string | null; purpose: "login" | "register"; payload: Record<string, unknown> }
}
export async function getActiveRegistrant(eventId: string, email: string) {
  const { data, error } = await supabaseAdmin.from("event_registrants").select("id,email,registration_status").eq("event_id", eventId).eq("email", email).maybeSingle()
  if (error) throw new Error("Unable to check registration")
  return data && ["registered", "approved", "checked_in"].includes(data.registration_status) ? data : null
}
