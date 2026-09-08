import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { buildJupiterInviteEmail } from "@/lib/email/invitations"
import { getAppUrl, getEmailFrom, getResendClient, resendErrorMessage } from "@/lib/email/resend"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const perPage = 200
  for (let page = 1; page <= 50; page += 1) {
    const result = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (result.error) throw result.error
    const match = result.data.users.find((candidate) => candidate.email?.toLowerCase() === email)
    if (match) return match
    if (result.data.users.length < perPage) return null
  }
  throw new Error("The account directory is too large to search safely.")
}

export async function POST(request: Request) {
  const { user } = await requireAdmin()
  const { data: actor } = await supabaseAdmin.from("profiles").select("team_role").eq("id", user.id).maybeSingle()
  if (actor?.team_role !== "owner") return NextResponse.json({ error: "Only the Owner can invite administrators." }, { status: 403 })

  const body = await request.json().catch((): null => null)
  const email = String(body?.email ?? "").trim().toLowerCase()
  const name = String(body?.name ?? "").trim()
  const promoteExisting = body?.promoteExisting === true
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })

  const appUrl = getAppUrl().replace(/\/$/, "")
  let existingUser: User | null
  try {
    existingUser = await findAuthUserByEmail(email)
  } catch (lookupError) {
    console.error("Administrator account lookup failed", lookupError)
    return NextResponse.json({ error: "Jupiter could not verify the existing account directory." }, { status: 500 })
  }

  if (existingUser) {
    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role,team_role,full_name")
      .eq("id", existingUser.id)
      .maybeSingle()
    if (existingProfileError) return NextResponse.json({ error: existingProfileError.message }, { status: 500 })
    if (existingProfile?.role === "admin") {
      return NextResponse.json({ code: "already_admin", error: "This person already has Jupiter administrator access." }, { status: 409 })
    }
    if (!promoteExisting) {
      return NextResponse.json({
        code: "existing_account",
        error: "This person already has a Jupiter account. Confirm that you want to grant administrator access.",
        existingName: existingProfile?.full_name ?? (String(existingUser.user_metadata?.full_name ?? "") || null),
      }, { status: 409 })
    }

    const { data: accessLink, error: accessLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${appUrl}/reset-password?next=${encodeURIComponent("/admin")}` },
    })
    if (accessLinkError || !accessLink.properties?.action_link) {
      return NextResponse.json({ error: accessLinkError?.message || "Could not create secure administrator access." }, { status: 400 })
    }

    const now = new Date().toISOString()
    const resolvedName = name || existingProfile?.full_name || String(existingUser.user_metadata?.full_name ?? "").trim() || null
    const { error: promotionError } = await supabaseAdmin.from("profiles").upsert({
      id: existingUser.id,
      email,
      full_name: resolvedName,
      role: "admin",
      team_role: "administrator",
      is_active: true,
      invite_status: "active",
      invited_at: now,
      invited_by: user.id,
      updated_at: now,
    }, { onConflict: "id" })
    if (promotionError) return NextResponse.json({ error: promotionError.message }, { status: 500 })

    const invitation = buildJupiterInviteEmail({
      inviteUrl: accessLink.properties.action_link,
      logoUrl: `${appUrl}/jupiter-email-logo-inverted.png?v=1`,
      name: resolvedName,
      role: "administrator",
      existingAccount: true,
    })
    const response = await getResendClient().emails.send({ from: getEmailFrom(), to: email, ...invitation })
    if (response.error) {
      return NextResponse.json({ error: `Administrator access was granted, but Jupiter could not send the access email: ${resendErrorMessage(response.error)}` }, { status: 502 })
    }

    return NextResponse.json({
      promoted: true,
      member: { id: existingUser.id, email, name: resolvedName, team_role: "administrator", is_active: true, invite_status: "active", invited_at: now, last_active_at: existingUser.last_sign_in_at ?? null, is_current: false },
    })
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: name || undefined },
      redirectTo: `${appUrl}/reset-password?next=${encodeURIComponent("/admin")}`,
    },
  })
  if (error || !data.user || !data.properties?.action_link) {
    return NextResponse.json({ error: error?.message || "Could not create invitation." }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: data.user.id,
    email,
    full_name: name || null,
    role: "admin",
    team_role: "administrator",
    is_active: true,
    invite_status: "pending",
    invited_at: now,
    invited_by: user.id,
    updated_at: now,
  }, { onConflict: "id" })
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  const invitation = buildJupiterInviteEmail({
    inviteUrl: data.properties.action_link,
    logoUrl: `${appUrl}/jupiter-email-logo-inverted.png?v=1`,
    name,
    role: "administrator",
  })
  const response = await getResendClient().emails.send({
    from: getEmailFrom(),
    to: email,
    ...invitation,
  })
  if (response.error) {
    return NextResponse.json({ error: `The account was created, but Jupiter could not send the invitation: ${resendErrorMessage(response.error)}` }, { status: 502 })
  }

  return NextResponse.json({ member: { id: data.user.id, email, name: name || null, team_role: "administrator", is_active: true, invite_status: "pending", invited_at: now, last_active_at: null, is_current: false } })
}
