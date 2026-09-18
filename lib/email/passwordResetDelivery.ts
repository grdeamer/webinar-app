import { buildJupiterPasswordResetEmail } from "./passwordReset"
import { getAppUrl, getEmailFrom, getResendClient, resendErrorMessage } from "./resend"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function sendJupiterPasswordReset(options: {
  email: string
  name?: string | null
  nextPath?: string
}) {
  const appUrl = getAppUrl().replace(/\/$/, "")
  const nextPath = options.nextPath || "/admin"
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: options.email,
    options: { redirectTo: `${appUrl}/reset-password?next=${encodeURIComponent(nextPath)}` },
  })
  if (error || !data.properties?.action_link) {
    throw new Error(error?.message || "Could not create a secure password reset link.")
  }

  const message = buildJupiterPasswordResetEmail({
    resetUrl: data.properties.action_link,
    logoUrl: `${appUrl}/jupiter-email-logo-inverted.png?v=1`,
    name: options.name,
  })
  const response = await getResendClient().emails.send({
    from: getEmailFrom(),
    to: options.email,
    ...message,
  })
  if (response.error) throw new Error(resendErrorMessage(response.error))
  return response.data?.id ?? null
}
