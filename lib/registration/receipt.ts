import { buildRegistrationReceiptEmail } from "@/lib/email/registration"
import { getAppUrl, getEmailFrom, getResendClient } from "@/lib/email/resend"
import { supabaseAdmin } from "@/lib/supabase/admin"
export async function sendRegistrationReceipt(input: { eventId: string; slug: string; title: string; email: string; registrantId: string; status: string }) {
  const key = `registration:${input.registrantId}:${input.status}`
  const { data: previous } = await supabaseAdmin.from("event_registration_receipts").select("resend_email_id").eq("idempotency_key", key).maybeSingle()
  if (previous?.resend_email_id) return true
  const origin = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : getAppUrl()
  const email = buildRegistrationReceiptEmail({ title: input.title, status: input.status, url: `${origin}/events/${encodeURIComponent(input.slug)}`, logoUrl: `${getAppUrl()}/jupiter-email-logo-inverted.png?v=1` })
  const response = await getResendClient().emails.send({ from: getEmailFrom(), to: input.email, ...email }, { idempotencyKey: key })
  const { error } = await supabaseAdmin.from("event_registration_receipts").upsert({ idempotency_key: key, event_id: input.eventId, registrant_id: input.registrantId, resend_email_id: response.data?.id ?? null, status: response.error ? "failed" : "accepted", error_message: response.error?.message ?? null }, { onConflict: "idempotency_key" })
  return !error && !response.error
}
