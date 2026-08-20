import { NextResponse } from "next/server"
import { buildJupiterInviteEmail } from "@/lib/email/invitations"
import { getAppUrl, getEmailFrom, getResendClient, resendErrorMessage } from "@/lib/email/resend"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin()
  const { id } = await context.params
  const [{ data: actor }, { data: target }] = await Promise.all([
    supabaseAdmin.from("profiles").select("team_role").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("profiles").select("email,full_name,role,team_role,is_active,invite_status").eq("id", id).maybeSingle(),
  ])

  if (actor?.team_role !== "owner") {
    return NextResponse.json({ error: "Only the Owner can resend administrator invitations." }, { status: 403 })
  }
  if (!target?.email || target.role !== "admin") {
    return NextResponse.json({ error: "This administrator invitation is not available." }, { status: 404 })
  }
  if (!target.is_active) {
    return NextResponse.json({ error: "Restore this administrator’s access before sending an access email." }, { status: 400 })
  }

  const appUrl = getAppUrl().replace(/\/$/, "")
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: target.email,
    options: { redirectTo: `${appUrl}/reset-password?next=${encodeURIComponent("/admin")}` },
  })
  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: error?.message || "Could not create a fresh invitation link." }, { status: 400 })
  }

  const invitation = buildJupiterInviteEmail({
    inviteUrl: data.properties.action_link,
    logoUrl: `${appUrl}/jupiter-email-logo-inverted.png?v=1`,
    name: target.full_name,
    role: "administrator",
    existingAccount: target.invite_status !== "pending",
  })
  const response = await getResendClient().emails.send({
    from: getEmailFrom(),
    to: target.email,
    ...invitation,
  })
  if (response.error) {
    return NextResponse.json({ error: resendErrorMessage(response.error) }, { status: 502 })
  }

  const now = new Date().toISOString()
  if (target.invite_status === "pending") {
    await supabaseAdmin.from("profiles").update({ invited_at: now, invited_by: user.id, updated_at: now }).eq("id", id)
  }
  return NextResponse.json({ ok: true, invitedAt: target.invite_status === "pending" ? now : null })
}
