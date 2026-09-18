import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { classifyDistrictNodes } from "@/lib/districtTree"
import DistrictTreeEditor, { type DistrictNode } from "./ui"
import { requireEventPageFeature } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function DistrictsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireEventPageFeature(id, "districts")
  const [{ data: event, error: eventError }, { data: rows, error: rowsError }] = await Promise.all([
    supabaseAdmin.from("events").select("id,slug,title,district_directory_enabled").eq("id", id).maybeSingle(),
    supabaseAdmin
      .from("event_sessions")
      .select("id,event_id,code,title,presenter,external_join_url,external_platform,district_parent_id,session_kind,sort_order")
      .eq("event_id", id)
      .in("session_kind", ["district_zone", "district_region", "district", "breakout"])
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
  ])
  if (eventError || !event) notFound()
  if (rowsError) throw new Error(rowsError.message)
  const nodes = classifyDistrictNodes(rows || []) as DistrictNode[]

  return <main className="event-editorial-page"><DistrictTreeEditor event={event} initialNodes={nodes} /></main>
}
