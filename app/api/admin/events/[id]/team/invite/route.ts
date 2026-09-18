import { NextResponse } from "next/server"
import { canManageEventAccess, getEventTeamAccess, type EventTeamRole } from "@/lib/eventTeamAccess"
import { buildJupiterInviteEmail } from "@/lib/email/invitations"
import { getAppUrl, getEmailFrom, getResendClient, resendErrorMessage } from "@/lib/email/resend"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { EVENT_ROLE_FEATURES, normalizeEventFeatures } from "@/lib/eventPermissions"

export const runtime = "nodejs"

const roles = new Set<EventTeamRole>(["event_admin", "producer", "viewer"])

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await getEventTeamAccess(id)
  if (!access || !canManageEventAccess(access)) {
    return NextResponse.json({ error: "You do not have permission to invite people to this event." }, { status: 403 })
  }

  const body = await request.json().catch((): null => null)
  const email = String(body?.email ?? "").trim().toLowerCase()
  const name = String(body?.name ?? "").trim()
  const role = String(body?.role ?? "") as EventTeamRole
  const sendInvitation = body?.sendInvitation !== false
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  if (!roles.has(role)) return NextResponse.json({ error: "Choose a valid event role." }, { status: 400 })
  const featurePermissions = access.role === "owner" && Array.isArray(body?.featurePermissions)
    ? normalizeEventFeatures(body?.featurePermissions)
    : EVENT_ROLE_FEATURES[role]
  if (featurePermissions.length === 0) {
    return NextResponse.json({ error: "Select at least one event feature." }, { status: 400 })
  }

  const [{ data: event }, authUsersResult] = await Promise.all([
    supabaseAdmin.from("events").select("id,title").eq("id", access.eventId).maybeSingle(),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 })

  let authUser = authUsersResult.data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null
  let invitationUrl: string | null = null
  const appUrl = getAppUrl().replace(/\/$/, "")
  const eventUrl = `${appUrl}/admin/events/${event.id}`

  if (!authUser) {
    const inviteResult = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { full_name: name || undefined },
        redirectTo: `${appUrl}/reset-password?next=${encodeURIComponent("/admin")}`,
      },
    })
    if (inviteResult.error || !inviteResult.data.user || !inviteResult.data.properties?.action_link) {
      return NextResponse.json({ error: inviteResult.error?.message || "Could not create the invitation." }, { status: 400 })
    }
    authUser = inviteResult.data.user
    invitationUrl = inviteResult.data.properties.action_link
  }

  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("role,team_role")
    .eq("id", authUser.id)
    .maybeSingle()

  if (existingProfile?.role === "admin") {
    return NextResponse.json({ error: "This person already has access to every event as a global administrator." }, { status: 400 })
  }

  const now = new Date().toISOString()
  const profileResult = await supabaseAdmin.from("profiles").upsert({
    id: authUser.id,
    email,
    full_name: name || String(authUser.user_metadata?.full_name ?? "").trim() || null,
    role: "event_member",
    team_role: null,
    is_active: true,
    invite_status: authUser.email_confirmed_at ? "active" : "pending",
    invited_at: now,
    invited_by: access.user.id,
    feature_permissions: featurePermissions,
    updated_at: now,
  }, { onConflict: "id" })
  if (profileResult.error) return NextResponse.json({ error: profileResult.error.message }, { status: 500 })

  const membershipResult = await supabaseAdmin.from("event_team_members").upsert({
    event_id: event.id,
    user_id: authUser.id,
    role,
    feature_permissions: featurePermissions,
    is_active: true,
    invite_status: authUser.email_confirmed_at ? "active" : "pending",
    invited_at: now,
    invited_by: access.user.id,
    updated_at: now,
  }, { onConflict: "event_id,user_id" }).select("id").single()
  if (membershipResult.error) return NextResponse.json({ error: membershipResult.error.message }, { status: 500 })

  let notificationWarning: string | null = null
  if (sendInvitation) {
    const invitation = buildJupiterInviteEmail({
      inviteUrl: invitationUrl || eventUrl,
      logoUrl: `${appUrl}/jupiter-email-logo-inverted.png?v=1`,
      name: name || String(authUser.user_metadata?.full_name ?? "").trim(),
      role,
      eventTitle: event.title,
      existingAccount: !invitationUrl,
    })
    const response = await getResendClient().emails.send({
      from: getEmailFrom(),
      to: email,
      ...invitation,
    })
    notificationWarning = response.error ? resendErrorMessage(response.error) : null
  }

  return NextResponse.json({
    member: {
      id: membershipResult.data.id,
      user_id: authUser.id,
      email,
      name: name || null,
      role,
      feature_permissions: featurePermissions,
      status: authUser.email_confirmed_at ? "active" : "pending",
    },
    invitationSent: sendInvitation && !notificationWarning,
    notificationWarning,
  })
}
