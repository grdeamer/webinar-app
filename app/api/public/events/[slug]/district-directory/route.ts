import { NextResponse } from "next/server"
import { getEventBySlug } from "@/lib/events"
import { publicEventHeaders } from "@/lib/publicEventCors"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(request: Request, data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: publicEventHeaders(request) })
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicEventHeaders(request) })
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params
    const event = await getEventBySlug(slug)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("events")
      .select("district_directory_enabled")
      .eq("id", event.id)
      .maybeSingle()
    if (settingsError) throw new Error(settingsError.message)
    if (!settings?.district_directory_enabled) return json(request, { enabled: false, nodes: [] })

    const { data, error } = await supabaseAdmin
      .from("event_sessions")
      .select("id,code,title,presenter,external_join_url,external_platform,district_parent_id,session_kind,sort_order")
      .eq("event_id", event.id)
      .in("session_kind", ["district_zone", "district_region", "district", "breakout"])
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true })
    if (error) throw new Error(error.message)
    const rows = data || []
    const included = new Set(rows.filter((row) => row.session_kind === "district_zone" && !row.district_parent_id).map((row) => row.id))
    for (const kind of ["district_region", "district", "breakout"]) {
      for (const row of rows) {
        if (row.session_kind === kind && row.district_parent_id && included.has(row.district_parent_id)) included.add(row.id)
      }
    }
    return json(request, {
      enabled: true,
      nodes: rows.filter((row) => included.has(row.id)).map((row) => ({
        id: row.id,
        code: row.code,
        name: row.title,
        lead: row.presenter,
        meeting_link: row.external_join_url,
        platform: row.external_platform,
        parent_id: row.district_parent_id,
        node_type: row.session_kind === "district_zone" ? "zone" : row.session_kind === "district_region" ? "region" : "district",
        sort_order: row.sort_order,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load district directory"
    return json(request, { error: message.startsWith("Event not found") ? message : "Could not load district directory" }, message.startsWith("Event not found") ? 404 : 500)
  }
}
