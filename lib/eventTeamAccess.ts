import type { User } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  ALL_EVENT_FEATURES,
  featuresForEventRole,
  type EventFeature,
  type EventTeamRole,
} from "@/lib/eventPermissions"

export type { EventFeature, EventTeamRole } from "@/lib/eventPermissions"

export type EventTeamAccess = {
  user: User
  isGlobalAdmin: boolean
  eventId: string
  eventSlug: string
  role: "owner" | "administrator" | EventTeamRole
  features: EventFeature[]
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function getEventTeamAccess(eventRef: string): Promise<EventTeamAccess | null> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return null

  const [{ data: profile }, eventResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("role,team_role,is_active").eq("id", user.id).maybeSingle(),
    isUuid(eventRef)
      ? supabaseAdmin.from("events").select("id,slug").eq("id", eventRef).maybeSingle()
      : supabaseAdmin.from("events").select("id,slug").eq("slug", eventRef).maybeSingle(),
  ])

  if (!profile || profile.is_active === false || !eventResult.data) return null
  const event = eventResult.data

  if (profile.role === "admin") {
    return {
      user,
      isGlobalAdmin: true,
      eventId: event.id,
      eventSlug: event.slug,
      role: profile.team_role === "owner" ? "owner" : "administrator",
      features: [...ALL_EVENT_FEATURES],
    }
  }

  const { data: membership } = await supabaseAdmin
    .from("event_team_members")
    .select("role,is_active,feature_permissions")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership || membership.is_active === false) return null
  return {
    user,
    isGlobalAdmin: false,
    eventId: event.id,
    eventSlug: event.slug,
    role: membership.role as EventTeamRole,
    features: featuresForEventRole(
      membership.role as EventTeamRole,
      membership.feature_permissions
    ),
  }
}

export function canManageEventAccess(access: EventTeamAccess) {
  return access.isGlobalAdmin || access.role === "event_admin"
}

export function hasEventFeature(access: EventTeamAccess, feature: EventFeature) {
  return access.isGlobalAdmin || access.features.includes(feature)
}

export async function requireEventPageFeature(eventRef: string, feature: EventFeature) {
  const access = await getEventTeamAccess(eventRef)
  if (!access || !hasEventFeature(access, feature)) notFound()
  return access
}

export type EventOperatorRole = "event_admin" | "producer"

export async function requireEventOperatorAccess(
  eventRef: string,
  allowedRoles: readonly EventOperatorRole[] = ["event_admin", "producer"],
  requiredFeature?: EventFeature
): Promise<EventTeamAccess | NextResponse> {
  const access = await getEventTeamAccess(eventRef)

  if (!access) {
    return NextResponse.json({ error: "Event access denied" }, { status: 403 })
  }

  if (
    !access.isGlobalAdmin &&
    !allowedRoles.includes(access.role as EventOperatorRole)
  ) {
    return NextResponse.json(
      { error: "Your event role does not allow this production action." },
      { status: 403 }
    )
  }


  if (requiredFeature && !hasEventFeature(access, requiredFeature)) {
    return NextResponse.json(
      { error: "Your event access does not include this feature." },
      { status: 403 }
    )
  }

  return access
}
