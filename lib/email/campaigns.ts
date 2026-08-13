import { supabaseAdmin } from "@/lib/supabase/admin"

export type CampaignType = "confirmation" | "presenter_access"
export type CampaignMode = "test" | "production"

export async function createEmailCampaign(input: {
  eventId: string
  campaignType: CampaignType
  mode: CampaignMode
  requestedBy: string
  idempotencyKey: string
  recipientCount: number
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("event_email_campaigns")
    .upsert({
      event_id: input.eventId,
      campaign_type: input.campaignType,
      mode: input.mode,
      requested_by: input.requestedBy,
      idempotency_key: input.idempotencyKey,
      recipient_count: input.recipientCount,
    }, { onConflict: "idempotency_key", ignoreDuplicates: false })
    .select("id")
    .single()

  if (error || !data?.id) throw new Error(error?.message || "Unable to create email campaign")
  return String(data.id)
}

export async function recordEmailMessages(input: {
  campaignId: string
  eventId: string
  messages: Array<{
    registrantId?: string | null
    recipientEmail: string
    resendEmailId?: string | null
    status: string
    errorMessage?: string | null
  }>
}): Promise<void> {
  if (!input.messages.length) return
  const { error } = await supabaseAdmin.from("event_email_messages").insert(
    input.messages.map((message) => ({
      campaign_id: input.campaignId,
      event_id: input.eventId,
      registrant_id: message.registrantId || null,
      recipient_email: message.recipientEmail,
      resend_email_id: message.resendEmailId || null,
      status: message.status,
      error_message: message.errorMessage || null,
    }))
  )
  if (error) throw new Error(error.message)
}

export async function completeEmailCampaign(input: {
  campaignId: string
  accepted: number
  failed: number
  errorSummary?: string | null
}): Promise<void> {
  const status = input.failed === 0 ? "completed" : input.accepted > 0 ? "partial" : "failed"
  const { error } = await supabaseAdmin
    .from("event_email_campaigns")
    .update({
      status,
      accepted_count: input.accepted,
      failed_count: input.failed,
      error_summary: input.errorSummary || null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.campaignId)
  if (error) throw new Error(error.message)
}

