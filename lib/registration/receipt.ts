import { getAppUrl, getEmailFrom, getResendClient } from "@/lib/email/resend"
import { supabaseAdmin } from "@/lib/supabase/admin"
export async function sendRegistrationReceipt(input: { eventId: string; slug: string; title: string; email: string; registrantId: string; status: string }) {
  const key = `registration:${input.registrantId}:${input.status}`
  const { data: previous } = await supabaseAdmin.from("event_registration_receipts").select("resend_email_id").eq("idempotency_key", key).maybeSingle()
  if (previous?.resend_email_id) return true
  const status = input.status === "pending_approval" ? "awaiting organizer approval" : input.status === "waitlisted" ? "on the waitlist; a seat is not confirmed" : ["declined", "cancelled"].includes(input.status) ? input.status : "confirmed"
  const response = await getResendClient().emails.send({ from: getEmailFrom(), to: input.email, subject: `Registration ${status}: ${input.title}`, text: `Your registration for ${input.title} is ${status}.\n\nVisit ${getAppUrl()}/events/${encodeURIComponent(input.slug)} to access your event using an email verification code.\n\nIf you need to change or cancel your registration, contact the organizer.` }, { idempotencyKey: key })
  const { error } = await supabaseAdmin.from("event_registration_receipts").upsert({ idempotency_key: key, event_id: input.eventId, registrant_id: input.registrantId, resend_email_id: response.data?.id ?? null, status: response.error ? "failed" : "accepted", error_message: response.error?.message ?? null }, { onConflict: "idempotency_key" })
  return !error && !response.error
}
