import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { getAppUrl } from "@/lib/email/resend"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin()
  const { id } = await context.params
  const [{ data: actor }, { data: target }] = await Promise.all([
    supabaseAdmin.from("profiles").select("team_role").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("profiles").select("email").eq("id", id).maybeSingle(),
  ])
  if (actor?.team_role !== "owner") return NextResponse.json({ error: "Only the Owner can send password reset links." }, { status: 403 })
  if (!target?.email) return NextResponse.json({ error: "No email address is available for this user." }, { status: 404 })

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(target.email, {
    redirectTo: `${getAppUrl().replace(/\/$/, "")}/reset-password`,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
