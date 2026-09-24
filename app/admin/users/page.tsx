import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import TeamAccessClient, { type TeamMember } from "./team-access-client"
import { normalizeEventFeatures, type EventFeature } from "@/lib/eventPermissions"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  role: "admin" | "event_member" | null
  team_role: "owner" | "administrator" | null
  is_active: boolean
  invite_status: "active" | "pending"
  invited_at: string | null
  created_at: string | null
}

type EventMembershipRow = {
  id: string
  event_id: string
  user_id: string
  role: "event_admin" | "producer" | "viewer"
  feature_permissions: string[] | null
  is_active: boolean
  invite_status: "active" | "pending"
  invited_at: string | null
  created_at: string | null
}

export default async function AdminUsersPage() {
  const { user, profile } = await requireAdmin()
  if (profile.team_role !== "owner") notFound()
  const [{ data: profiles, error }, { data: memberships, error: membershipError }, { data: events, error: eventError }, authUsersResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,role,team_role,is_active,invite_status,invited_at,created_at")
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("event_team_members")
      .select("id,event_id,user_id,role,feature_permissions,is_active,invite_status,invited_at,created_at")
      .order("created_at", { ascending: true }),
    supabaseAdmin.from("events").select("id,title").order("title", { ascending: true }),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  if (error) throw new Error(error.message)
  if (membershipError) throw new Error(membershipError.message)
  if (eventError) throw new Error(eventError.message)

  const authById = new Map(authUsersResult.data.users.map((authUser) => [authUser.id, authUser]))
  const globalMembers: TeamMember[] = ((profiles ?? []) as ProfileRow[]).filter((profile) => profile.role === "admin").map((profile) => {
    const authUser = authById.get(profile.id)
    return {
      id: profile.id,
      user_id: profile.id,
      scope: "global",
      email: profile.email ?? authUser?.email ?? "Unknown email",
      name: profile.full_name ?? (String(authUser?.user_metadata?.full_name ?? "").trim() || null),
      team_role: profile.team_role ?? "administrator",
      is_active: profile.is_active !== false,
      account_active: profile.is_active !== false,
      invite_status: authUser?.email_confirmed_at ? "active" : profile.invite_status,
      invited_at: profile.invited_at,
      last_active_at: authUser?.last_sign_in_at ?? null,
      avatar_url: String(authUser?.user_metadata?.avatar_url ?? "") || null,
      is_current: profile.id === user.id,
      event_id: null as string | null,
      event_title: null as string | null,
      event_role: null as null,
      feature_permissions: [] as EventFeature[],
    }
  })
  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
  const eventById = new Map<string, string>((events ?? []).map((event) => [String(event.id), String(event.title)]))
  const eventMembers: TeamMember[] = ((memberships ?? []) as EventMembershipRow[])
    .filter((membership) => !globalMembers.some((member) => member.user_id === membership.user_id))
    .map((membership) => {
      const authUser = authById.get(membership.user_id)
      const profile = profileById.get(membership.user_id)
      return {
        id: membership.id,
        user_id: membership.user_id,
        scope: "event",
        email: profile?.email ?? authUser?.email ?? "Unknown email",
        name: profile?.full_name ?? (String(authUser?.user_metadata?.full_name ?? "").trim() || null),
        team_role: null as null,
        event_role: membership.role,
        event_id: membership.event_id,
        event_title: eventById.get(membership.event_id) ?? "Unknown event",
        feature_permissions: membership.feature_permissions === null ? null : normalizeEventFeatures(membership.feature_permissions),
        is_active: membership.is_active !== false,
        account_active: profile?.is_active !== false,
        invite_status: authUser?.email_confirmed_at ? "active" : membership.invite_status,
        invited_at: membership.invited_at,
        last_active_at: authUser?.last_sign_in_at ?? null,
        avatar_url: String(authUser?.user_metadata?.avatar_url ?? "") || null,
        is_current: membership.user_id === user.id,
      }
    })
  const members = [...globalMembers, ...eventMembers]

  const currentMember = members.find((member) => member.is_current)

  return (
    <TeamAccessClient
      initialMembers={members}
      events={(events ?? []).map((event) => ({ id: event.id, title: event.title }))}
      canManage={currentMember?.team_role === "owner"}
    />
  )
}
