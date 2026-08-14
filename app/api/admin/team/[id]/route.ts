import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

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
  if (target.team_role === "owner") return NextResponse.json({ error: "The Owner account is protected." }, { status: 400 })

  const body = await request.json().catch(() => null)
  if (typeof body?.is_active !== "boolean") return NextResponse.json({ error: "Invalid access state." }, { status: 400 })
  const { error } = await supabaseAdmin.from("profiles").update({ is_active: body.is_active, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
