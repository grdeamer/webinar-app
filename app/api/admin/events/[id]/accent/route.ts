import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EVENT_ACCENTS = new Set(["blue", "violet", "cyan", "orange", "emerald", "rose"])

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: eventId } = await context.params
    if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Invalid event" }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const accentColor = typeof body.accent_color === "string" ? body.accent_color : ""
    if (!EVENT_ACCENTS.has(accentColor)) return NextResponse.json({ error: "Invalid event color" }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from("events")
      .update({ accent_color: accentColor, updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .select("id,accent_color")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: "Event not found" }, { status: 404 })
    return NextResponse.json({ success: true, accent_color: data.accent_color })
  } catch (error) {
    console.error("event accent error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 })
  }
}
