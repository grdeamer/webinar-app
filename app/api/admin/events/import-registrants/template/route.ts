import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function csvEscape(v: string) {
  const s = String(v ?? "")
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

export async function GET(req: Request) {
  try {
    await requireAdmin()

    const url = new URL(req.url)
    const eventId = url.searchParams.get("event_id")

    if (!eventId) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 })
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id,slug,title")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const { data: sessions } = await supabaseAdmin
      .from("event_sessions")
      .select("code,title")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("starts_at", { ascending: true, nullsFirst: true })

    const sampleCodes = (sessions || []).map((s) => s.code).filter(Boolean).slice(0, 4)

    const header = [
      "event_slug",
      "email",
      "first_name",
      "last_name",
      "session_code_1",
      "session_code_2",
      "session_code_3",
      "session_code_4",
      "tag",
      "notes",
    ]

    const sampleRow1 = [
      event.slug,
      "jane@example.com",
      "Jane",
      "Smith",
      sampleCodes[0] || "OPENING",
      sampleCodes[1] || "CLINICAL",
      "",
      "",
      "VIP",
      "Top client",
    ]

    const sampleRow2 = [
      event.slug,
      "bob@example.com",
      "Bob",
      "Jones",
      sampleCodes[0] || "OPENING",
      sampleCodes[2] || "REIMBURSE",
      sampleCodes[3] || "CLOSING",
      "",
      "Attendee",
      "Needs follow-up",
    ]

    const body = [header, sampleRow1, sampleRow2]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n") + "\n"

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=registrants_template_${event.slug}.csv`,
      },
    })
  } catch (err: any) {
    console.error("import-registrants template error:", err)
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    )
  }
}