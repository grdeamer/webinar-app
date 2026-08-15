import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { getEventTeamAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

function csvEscape(value: unknown): string {
  const text = String(value ?? "")
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n")
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

export async function GET(request: Request, context: Params): Promise<Response> {
  await requireAdmin()
  const { id } = await context.params
  const access = await getEventTeamAccess(id)
  if (!access) return NextResponse.json({ error: "Event access denied" }, { status: 403 })

  const url = new URL(request.url)
  const report = url.searchParams.get("report") || "summary"
  const { data: event, error: eventError } = await supabaseAdmin.from("events").select("id,slug,title").eq("id", id).maybeSingle()
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 400 })
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

  let headers: string[]
  let rows: Record<string, unknown>[]

  if (report === "sessions") {
    const { data, error } = await supabaseAdmin.from("event_sessions").select("code,title,presenter,starts_at,ends_at,session_kind,delivery_mode,runtime_status,is_general_session").eq("event_id", id).order("sort_order", { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    headers = ["code", "title", "presenter", "starts_at", "ends_at", "session_kind", "delivery_mode", "runtime_status", "is_general_session"]
    rows = (data ?? []) as Record<string, unknown>[]
  } else if (report === "questions") {
    const { data, error } = await supabaseAdmin.from("qa_messages").select("created_at,name,question,status,answered_at,is_featured").eq("event_id", id).order("created_at", { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    headers = ["created_at", "name", "question", "status", "answered_at", "is_featured"]
    rows = (data ?? []) as Record<string, unknown>[]
  } else {
    const [registrants, sessions, agenda, breakouts, questions, sponsors] = await Promise.all([
      supabaseAdmin.from("event_registrants").select("id", { count: "exact", head: true }).eq("event_id", id),
      supabaseAdmin.from("event_sessions").select("id", { count: "exact", head: true }).eq("event_id", id),
      supabaseAdmin.from("event_agenda_items").select("id", { count: "exact", head: true }).eq("event_id", id),
      supabaseAdmin.from("event_breakouts").select("id", { count: "exact", head: true }).eq("event_id", id),
      supabaseAdmin.from("qa_messages").select("id", { count: "exact", head: true }).eq("event_id", id),
      supabaseAdmin.from("event_sponsors").select("id", { count: "exact", head: true }).eq("event_id", id),
    ])
    const firstError = [registrants, sessions, agenda, breakouts, questions, sponsors].find((result) => result.error)?.error
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 400 })
    headers = ["metric", "value"]
    rows = [
      { metric: "event", value: event.title },
      { metric: "registrants", value: registrants.count ?? 0 },
      { metric: "sessions", value: sessions.count ?? 0 },
      { metric: "run_of_show_cues", value: agenda.count ?? 0 },
      { metric: "breakouts", value: breakouts.count ?? 0 },
      { metric: "audience_questions", value: questions.count ?? 0 },
      { metric: "sponsor_assets", value: sponsors.count ?? 0 },
    ]
  }

  const date = new Date().toISOString().slice(0, 10)
  const filename = `${safeFilePart(event.slug)}-${safeFilePart(report)}-${date}.csv`
  return new NextResponse(toCsv(headers, rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}"` } })
}
