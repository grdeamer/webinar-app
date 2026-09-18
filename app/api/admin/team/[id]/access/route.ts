import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { normalizeEventFeatures, type EventTeamRole } from "@/lib/eventPermissions"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const roles = new Set<EventTeamRole>(["event_admin", "producer", "viewer"])

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin()
  const { id } = await context.params
  const [{ data: actor }, { data: target }] = await Promise.all([
    supabaseAdmin.from("profiles").select("team_role").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("profiles").select("id,email,full_name,team_role,is_active,invite_status,invited_at").eq("id", id).maybeSingle(),
  ])
  if (actor?.team_role !== "owner") return NextResponse.json({ error: "Only the Owner can change team permissions." }, { status: 403 })
  if (!target) return NextResponse.json({ error: "Team member not found." }, { status: 404 })
  if (target.team_role === "owner") return NextResponse.json({ error: "Owner access is protected." }, { status: 400 })

  const body = await request.json().catch((): null => null)
  const scope = body?.scope === "global" ? "global" : body?.scope === "event" ? "event" : null
  if (!scope) return NextResponse.json({ error: "Choose an access scope." }, { status: 400 })
  const now = new Date().toISOString()

  if (scope === "global") {
    const { error } = await supabaseAdmin.from("profiles").update({ role: "admin", team_role: "administrator", is_active: true, updated_at: now }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ member: { id, user_id: id, scope: "global", email: target.email, name: target.full_name, team_role: "administrator", event_role: null, event_id: null, event_title: null, feature_permissions: [], is_active: true, invite_status: target.invite_status, invited_at: target.invited_at } })
  }

  const eventId = String(body?.eventId ?? "")
  const role = String(body?.role ?? "") as EventTeamRole
  const featurePermissions = normalizeEventFeatures(body?.featurePermissions)
  if (!eventId) return NextResponse.json({ error: "Choose an event." }, { status: 400 })
  if (!roles.has(role)) return NextResponse.json({ error: "Choose a valid event role." }, { status: 400 })
  if (featurePermissions.length === 0) return NextResponse.json({ error: "Select at least one feature." }, { status: 400 })

  const { data: event } = await supabaseAdmin.from("events").select("id,title").eq("id", eventId).maybeSingle()
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 })

  const profileResult = await supabaseAdmin.from("profiles").update({ role: "event_member", team_role: null, is_active: true, updated_at: now }).eq("id", id)
  if (profileResult.error) return NextResponse.json({ error: profileResult.error.message }, { status: 500 })
  await supabaseAdmin.from("event_team_members").update({ is_active: false, updated_at: now }).eq("user_id", id)
  const { data: membership, error } = await supabaseAdmin.from("event_team_members").upsert({ event_id: eventId, user_id: id, role, feature_permissions: featurePermissions, is_active: true, invite_status: target.invite_status, invited_at: target.invited_at ?? now, invited_by: user.id, updated_at: now }, { onConflict: "event_id,user_id" }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ member: { id: membership.id, user_id: id, scope: "event", email: target.email, name: target.full_name, team_role: null, event_role: role, event_id: eventId, event_title: event.title, feature_permissions: featurePermissions, is_active: true, invite_status: target.invite_status, invited_at: target.invited_at } })
}
