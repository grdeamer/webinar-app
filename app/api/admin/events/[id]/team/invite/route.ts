import { NextResponse } from "next/server"
import { canManageEventAccess, getEventTeamAccess, type EventTeamRole } from "@/lib/eventTeamAccess"
import { getAppUrl, getEmailFrom, getResendClient, resendErrorMessage } from "@/lib/email/resend"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const roles = new Set<EventTeamRole>(["event_admin", "producer", "viewer"])

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;",
  })[character] ?? character)
}

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
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  if (!roles.has(role)) return NextResponse.json({ error: "Choose a valid event role." }, { status: 400 })

  const [{ data: event }, authUsersResult] = await Promise.all([
    supabaseAdmin.from("events").select("id,title").eq("id", access.eventId).maybeSingle(),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 })

  let authUser = authUsersResult.data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null
  let invitationSent = false
  const appUrl = getAppUrl().replace(/\/$/, "")
  const eventUrl = `${appUrl}/admin/events/${event.id}`

  if (!authUser) {
    const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name || undefined },
      redirectTo: `${appUrl}/reset-password?next=${encodeURIComponent(`/admin/events/${event.id}`)}`,
    })
    if (inviteResult.error || !inviteResult.data.user) {
      return NextResponse.json({ error: inviteResult.error?.message || "Could not send the invitation." }, { status: 400 })
    }
    authUser = inviteResult.data.user
    invitationSent = true
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
    updated_at: now,
  }, { onConflict: "id" })
  if (profileResult.error) return NextResponse.json({ error: profileResult.error.message }, { status: 500 })

  const membershipResult = await supabaseAdmin.from("event_team_members").upsert({
    event_id: event.id,
    user_id: authUser.id,
    role,
    is_active: true,
    invite_status: authUser.email_confirmed_at ? "active" : "pending",
    invited_at: now,
    invited_by: access.user.id,
    updated_at: now,
  }, { onConflict: "event_id,user_id" }).select("id").single()
  if (membershipResult.error) return NextResponse.json({ error: membershipResult.error.message }, { status: 500 })

  let notificationWarning: string | null = null
  if (!invitationSent) {
    const safeTitle = escapeHtml(event.title)
    const safeUrl = escapeHtml(eventUrl)
    const response = await getResendClient().emails.send({
      from: getEmailFrom(),
      to: email,
      subject: `You have access to ${event.title}`,
      html: `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6"><h1 style="font-size:24px">You have been invited to ${safeTitle}</h1><p>Your Jupiter event role is <strong>${role === "event_admin" ? "Event Admin" : role === "producer" ? "Producer" : "Viewer"}</strong>.</p><p><a href="${safeUrl}" style="display:inline-block;border-radius:10px;background:#111827;color:white;padding:12px 18px;text-decoration:none">Open event</a></p><p>Sign in with this email address. If needed, use “Forgot password” on the sign-in page.</p></div>`,
    })
    if (response.error) notificationWarning = resendErrorMessage(response.error)
  }

  return NextResponse.json({
    member: {
      id: membershipResult.data.id,
      user_id: authUser.id,
      email,
      name: name || null,
      role,
      status: authUser.email_confirmed_at ? "active" : "pending",
    },
    notificationWarning,
  })
}
