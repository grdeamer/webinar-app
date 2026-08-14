import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const { user } = await requireAdmin()
  const { data: actor } = await supabaseAdmin.from("profiles").select("team_role").eq("id", user.id).maybeSingle()
  if (actor?.team_role !== "owner") return NextResponse.json({ error: "Only the Owner can invite administrators." }, { status: 403 })

  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? "").trim().toLowerCase()
  const name = String(body?.name ?? "").trim()
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })

  const origin = new URL(request.url).origin
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name || undefined },
    redirectTo: `${origin}/admin/login?next=/admin`,
  })
  if (error || !data.user) return NextResponse.json({ error: error?.message || "Could not create invitation." }, { status: 400 })

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

  return NextResponse.json({ member: { id: data.user.id, email, name: name || null, team_role: "administrator", is_active: true, invite_status: "pending", invited_at: now, last_active_at: null, is_current: false } })
}
