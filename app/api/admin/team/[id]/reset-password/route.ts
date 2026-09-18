import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { sendJupiterPasswordReset } from "@/lib/email/passwordResetDelivery"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin()
  const { id } = await context.params
  const [{ data: actor }, { data: target }] = await Promise.all([
    supabaseAdmin.from("profiles").select("team_role").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("profiles").select("email,full_name").eq("id", id).maybeSingle(),
  ])
  if (actor?.team_role !== "owner") return NextResponse.json({ error: "Only the Owner can send password reset links." }, { status: 403 })
  if (!target?.email) return NextResponse.json({ error: "No email address is available for this user." }, { status: 404 })

  try {
    await sendJupiterPasswordReset({ email: target.email, name: target.full_name })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send the password reset link." }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
