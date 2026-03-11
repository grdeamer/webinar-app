import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isMissingColumnError(message: string) {
  const m = String(message || "").toLowerCase()
  return m.includes("could not find the") || m.includes("schema cache") || m.includes("column")
}

async function updateFieldSafe(id: string, key: string, value: any) {
  const { error } = await supabaseAdmin.from("webinars").update({ [key]: value }).eq("id", id)
  if (error) {
    if (isMissingColumnError(error.message)) return { skipped: true }
    throw new Error(error.message)
  }
  return { skipped: false }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  try {
    const { id } = await props.params
    const body = await req.json().catch(() => ({}))

    if (!id) return NextResponse.json({ error: "Missing webinar id" }, { status: 400 })

    const applied: string[] = []
    const skipped: string[] = []

    for (const [key, value] of Object.entries({
      webinar_date: body.webinar_date || null,
      duration_minutes: body.duration_minutes ?? null,
      timezone: body.timezone || null,
    })) {
      const result = await updateFieldSafe(id, key, value)
      if (result.skipped) skipped.push(key)
      else applied.push(key)
    }

    return NextResponse.json({ ok: true, applied, skipped })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to save schedule" }, { status: 500 })
  }
}
