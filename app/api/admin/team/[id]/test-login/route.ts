import { NextResponse } from "next/server"

import { getAppUrl } from "@/lib/email/resend"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { user } = await requireAdmin()
  const { id } = await context.params
  const [{ data: actor }, { data: target }] = await Promise.all([
    supabaseAdmin.from("profiles").select("team_role").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("profiles").select("email,role,is_active").eq("id", id).maybeSingle(),
  ])

  if (actor?.team_role !== "owner") {
    return NextResponse.json({ error: "Only the Owner can create test sign-in links." }, { status: 403 })
  }
  if (!target?.email || !["admin", "event_member"].includes(target.role)) {
    return NextResponse.json({ error: "This team member account is not available." }, { status: 404 })
  }
  if (!target.is_active) {
    return NextResponse.json({ error: "Restore this administrator’s access before testing it." }, { status: 400 })
  }

  const appUrl = getAppUrl().replace(/\/$/, "")
  if (target.role === "event_member") {
    const requestedEventId = new URL(request.url).searchParams.get("eventId")
    let membershipQuery = supabaseAdmin.from("event_team_members").select("event_id").eq("user_id", id).eq("is_active", true)
    if (requestedEventId) membershipQuery = membershipQuery.eq("event_id", requestedEventId)
    const { data: membership } = await membershipQuery.limit(1).maybeSingle()
    if (!membership?.event_id) return NextResponse.json({ error: "This person has no active event access." }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: target.email,
    options: { redirectTo: `${appUrl}/admin` },
  })
  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: error?.message || "Could not create a test sign-in link." }, { status: 400 })
  }

  return NextResponse.json(
    { url: data.properties.action_link },
    { headers: { "Cache-Control": "no-store, private" } },
  )
}
