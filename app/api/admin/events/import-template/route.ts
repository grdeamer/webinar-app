import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { WebinarRecord } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function csvEscape(v: string) {
  const s = String(v ?? "")
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

export async function GET(req: Request) {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const url = new URL(req.url)
  const event_id = url.searchParams.get("event_id")
  const format = url.searchParams.get("format") || "matrix"

  if (!event_id) return json({ error: "Missing event_id" }, 400)

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .eq("id", event_id)
    .single()

  if (!event) return json({ error: "Event not found" }, 404)

  const { data: webinars } = await supabaseAdmin
    .from("webinars")
    .select("title")
    .order("webinar_date", { ascending: true })
    .limit(12)

  const titles = (webinars || [])
    .map((w: Pick<WebinarRecord, "title">) => (w.title ? String(w.title) : ""))
    .filter(Boolean)
    .slice(0, 8)

  if (format === "row") {
    const header = ["event", "email", "first_name", "last_name", "webinar"].join(",")
    const sample = [
      event.slug,
      "jane@company.com",
      "Jane",
      "Doe",
      titles[0] || "Opening Keynote",
    ]
      .map(csvEscape)
      .join(",")

    const sample2 = [
      event.slug,
      "jane@company.com",
      "Jane",
      "Doe",
      titles[1] || "Breakout A",
    ]
      .map(csvEscape)
      .join(",")

    const body = [header, sample, sample2].join("\n") + "\n"

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=attendees_template_${event.slug}.csv`,
      },
    })
  }

  const header = ["event", "email", "first_name", "last_name", ...titles]
    .map(csvEscape)
    .join(",")

  const row1 = [event.slug, "jane@company.com", "Jane", "Doe", ...titles.map(() => "1")]
    .map(csvEscape)
    .join(",")

  const row2 = [
    event.slug,
    "john@company.com",
    "John",
    "Smith",
    ...titles.map((_, i) => (i % 2 === 0 ? "1" : "0")),
  ]
    .map(csvEscape)
    .join(",")

  const body = [header, row1, row2].join("\n") + "\n"

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=attendees_template_${event.slug}.csv`,
    },
  })
}