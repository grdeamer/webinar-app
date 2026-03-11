import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const room_key = String(searchParams.get("room_key") || "general").trim() || "general"

    const { data, error } = await supabaseAdmin
      .from("qa_room_settings")
      .select("*")
      .eq("room_key", room_key)
      .maybeSingle()

    if (error) return json({ error: error.message }, 400)

    return json({
      settings: data || {
        room_key,
        rotation_enabled: true,
        rotation_seconds: 15,
      },
    })
  } catch (e: any) {
    return json({ error: e?.message || "Failed to load room settings." }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const room_key = String(body?.room_key || "general").trim() || "general"
    const rotation_enabled = Boolean(body?.rotation_enabled)
    const rotation_seconds = Math.max(5, Math.min(120, Number(body?.rotation_seconds || 15)))

    const { data, error } = await supabaseAdmin
      .from("qa_room_settings")
      .upsert({
        room_key,
        rotation_enabled,
        rotation_seconds,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single()

    if (error) return json({ error: error.message }, 400)

    return json({ ok: true, settings: data })
  } catch (e: any) {
    return json({ error: e?.message || "Failed to save room settings." }, 500)
  }
}