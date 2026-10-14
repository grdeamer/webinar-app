import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
export async function GET(_req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const access = await requireEventOperatorAccess(slug, ["event_admin", "producer"], "experience")
  if (access instanceof Response) return access
  const { data, error } = await supabaseAdmin.from("event_sessions").select("id,title").eq("event_id", access.eventId).order("sort_order").limit(1000)
  return NextResponse.json(error ? { error: "Unable to load sessions" } : { sessions: data ?? [] }, { status: error ? 500 : 200 })
}
