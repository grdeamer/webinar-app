import { NextResponse } from "next/server"
import { getEventTeamAccess } from "@/lib/eventTeamAccess"
import { normalizeEventFeatures, type EventTeamRole } from "@/lib/eventPermissions"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const roles = new Set<EventTeamRole>(["event_admin", "producer", "viewer"])

export async function PATCH(request: Request, context: { params: Promise<{ id: string; membershipId: string }> }) {
  const { id, membershipId } = await context.params
  const access = await getEventTeamAccess(id)
  if (!access?.isGlobalAdmin || access.role !== "owner") {
    return NextResponse.json({ error: "Only an owner can change event-scoped access." }, { status: 403 })
  }

  const body = await request.json().catch((): null => null)
  const update: { role?: EventTeamRole; feature_permissions?: string[]; is_active?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }

  if (body?.role !== undefined) {
    const role = String(body.role) as EventTeamRole
    if (!roles.has(role)) return NextResponse.json({ error: "Choose a valid event role." }, { status: 400 })
    update.role = role
  }
  if (body?.featurePermissions !== undefined) {
    const features = normalizeEventFeatures(body.featurePermissions)
    if (features.length === 0) return NextResponse.json({ error: "Select at least one event feature." }, { status: 400 })
    update.feature_permissions = features
  }
  if (body?.is_active !== undefined) update.is_active = Boolean(body.is_active)

  const { data, error } = await supabaseAdmin
    .from("event_team_members")
    .update(update)
    .eq("id", membershipId)
    .eq("event_id", access.eventId)
    .select("id,role,feature_permissions,is_active")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Event access record not found." }, { status: 404 })
  return NextResponse.json({ member: data })
}
