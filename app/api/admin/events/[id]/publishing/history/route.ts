import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requirePublishingApiAccess } from "@/lib/external-publishing/authorization"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await requirePublishingApiAccess(id)
  if (access instanceof NextResponse) return access
  const { data, error } = await supabaseAdmin
    .from("event_publish_deployments")
    .select("id,destination_id,status,files,backup_path,error,created_at,completed_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deployments: data ?? [] })
}
