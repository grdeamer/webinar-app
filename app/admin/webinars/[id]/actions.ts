"use server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { detectProvider, sanitizeMeetingUrl, type MeetingProvider } from "@/lib/meetingLinks"

// ✅ IMPORTANT: Replace this with your actual admin check.
// This is intentionally strict: if you don't implement it, it will block saving.
async function assertAdmin() {
  // If you already have an admin-only layout/middleware, wire that logic here.
  // Examples:
  // - Verify a Supabase session cookie + role in DB
  // - Verify a signed admin JWT
  // - Verify a Vercel-protected route header
  //
  // For now, throw to avoid accidentally exposing an admin write endpoint.
  throw new Error(
    "Admin authorization not implemented in updateMeetingLink(). Wire your existing admin check into assertAdmin()."
  )
}

export async function updateMeetingLink(formData: FormData): Promise<void> {
  await assertAdmin()

  const webinarId = String(formData.get("webinarId") || "").trim()
  const joinUrlRaw = String(formData.get("joinUrl") || "")
  const providerRaw = String(formData.get("provider") || "auto").trim()
  const labelRaw = String(formData.get("label") || "").trim()

  if (!webinarId) throw new Error("Missing webinar id.")

  const join_url = sanitizeMeetingUrl(joinUrlRaw)
  const detected = join_url ? detectProvider(join_url) : "manual"

  const provider =
    providerRaw === "auto"
      ? detected
      : (providerRaw as MeetingProvider)

  if (!["manual", "zoom", "teams"].includes(provider)) {
    throw new Error("Invalid provider value.")
  }

  const meeting_url_label = labelRaw || null

  const { error } = await supabaseAdmin
    .from("webinars")
    .update({
      provider,
      join_url: join_url || null,
      meeting_url_label,
    })
    .eq("id", webinarId)

  if (error) throw new Error(error.message)
}