import { NextResponse } from "next/server"

import { getAppUrl } from "@/lib/email/resend"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { user } = await requireAdmin()
  const { id } = await context.params
  const [{ data: actor }, { data: target }] = await Promise.all([
    supabaseAdmin.from("profiles").select("team_role").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("profiles").select("email,role,is_active").eq("id", id).maybeSingle(),
  ])

  if (actor?.team_role !== "owner") {
    return NextResponse.json({ error: "Only the Owner can create test sign-in links." }, { status: 403 })
  }
  if (!target?.email || target.role !== "admin") {
    return NextResponse.json({ error: "This administrator account is not available." }, { status: 404 })
  }
  if (!target.is_active) {
    return NextResponse.json({ error: "Restore this administrator’s access before testing it." }, { status: 400 })
  }

  const appUrl = getAppUrl().replace(/\/$/, "")
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: target.email,
    options: { redirectTo: `${appUrl}/admin` },
  })
  if (error || !data.properties?.action_link) {
    return NextResponse.json({ error: error?.message || "Could not create a test sign-in link." }, { status: 400 })
  }

  return NextResponse.json(
    { url: data.properties.action_link },
    { headers: { "Cache-Control": "no-store, private" } },
  )
}
