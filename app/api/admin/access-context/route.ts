import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,team_role").eq("id", authResult.user.id).maybeSingle()
  return NextResponse.json({
    isEventMember: profile?.role === "event_member",
    teamRole: profile?.team_role ?? null,
  })
}
