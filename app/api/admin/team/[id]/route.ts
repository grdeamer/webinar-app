import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { changeTeamAccountAccess } from "@/lib/teamAccountAccess"

export const runtime = "nodejs"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin()
  const { id } = await context.params
  const [{ data: actor }, { data: target }] = await Promise.all([
    supabaseAdmin.from("profiles").select("team_role").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("profiles").select("team_role").eq("id", id).maybeSingle(),
  ])
  if (actor?.team_role !== "owner") return NextResponse.json({ error: "Only the Owner can manage administrator access." }, { status: 403 })
  if (!target) return NextResponse.json({ error: "Administrator not found." }, { status: 404 })
  if (target.team_role === "owner" || id === user.id) return NextResponse.json({ error: "The Owner account and your current sign-in are protected." }, { status: 400 })

  const body = await request.json().catch((): null => null)
  if (typeof body?.is_active !== "boolean") return NextResponse.json({ error: "Invalid access state." }, { status: 400 })
  const result = await changeTeamAccountAccess(body.is_active, {
    async setProfileActive(active) {
      const { data, error } = await supabaseAdmin.from("profiles")
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq("id", id).or("team_role.is.null,team_role.neq.owner").select("id").single()
      if (error || !data) throw new Error("Profile update failed")
    },
    async setAuthBan(disabled) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: disabled ? "876000h" : "none" })
      if (error) throw error
    },
    async revokeSessions() {
      const { data, error } = await supabaseAdmin.rpc("revoke_team_user_sessions", { target_user_id: id, actor_user_id: user.id })
      if (error) throw error
      if (typeof data !== "number" || !Number.isSafeInteger(data) || data < 0) throw new Error("Session revocation was not confirmed")
      return data
    },
  })
  return NextResponse.json(result, { status: result.ok ? 200 : 502, headers: { "Cache-Control": "no-store" } })
}
