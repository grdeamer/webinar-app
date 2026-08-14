import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import TeamAccessClient, { type TeamMember } from "./team-access-client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  team_role: "owner" | "administrator" | null
  is_active: boolean
  invite_status: "active" | "pending"
  invited_at: string | null
  created_at: string | null
}

export default async function AdminUsersPage() {
  const { user } = await requireAdmin()
  const [{ data: profiles, error }, authUsersResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,team_role,is_active,invite_status,invited_at,created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true }),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  if (error) throw new Error(error.message)

  const authById = new Map(authUsersResult.data.users.map((authUser) => [authUser.id, authUser]))
  const members: TeamMember[] = ((profiles ?? []) as ProfileRow[]).map((profile) => {
    const authUser = authById.get(profile.id)
    return {
      id: profile.id,
      email: profile.email ?? authUser?.email ?? "Unknown email",
      name: profile.full_name ?? (String(authUser?.user_metadata?.full_name ?? "").trim() || null),
      team_role: profile.team_role ?? "administrator",
      is_active: profile.is_active !== false,
      invite_status: authUser?.email_confirmed_at ? "active" : profile.invite_status,
      invited_at: profile.invited_at,
      last_active_at: authUser?.last_sign_in_at ?? null,
      is_current: profile.id === user.id,
    }
  })

  const currentMember = members.find((member) => member.is_current)

  return (
    <TeamAccessClient
      initialMembers={members}
      canManage={currentMember?.team_role === "owner"}
    />
  )
}
