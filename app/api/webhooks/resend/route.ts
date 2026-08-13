import { NextResponse } from "next/server"
import { Webhook } from "svix"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ResendWebhookEvent = {
  type?: string
  data?: { email_id?: string }
  [key: string]: unknown
}

const MESSAGE_STATUSES: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
  "email.opened": "opened",
  "email.clicked": "clicked",
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 })

  const payload = await req.text()
  const svixId = req.headers.get("svix-id") || ""
  const svixTimestamp = req.headers.get("svix-timestamp") || ""
  const svixSignature = req.headers.get("svix-signature") || ""
  let event: ResendWebhookEvent

  try {
    event = new Webhook(secret).verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookEvent
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
  }

  const eventType = String(event.type || "unknown")
  const resendEmailId = String(event.data?.email_id || "") || null
  const { error: insertError } = await supabaseAdmin.from("resend_webhook_events").upsert({
    svix_id: svixId,
    event_type: eventType,
    resend_email_id: resendEmailId,
    payload: event,
  }, { onConflict: "svix_id", ignoreDuplicates: true })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const status = MESSAGE_STATUSES[eventType]
  if (status && resendEmailId) {
    const { error: updateError } = await supabaseAdmin
      .from("event_email_messages")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("resend_email_id", resendEmailId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
