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

    const [{ data: settings }, { data: featuredRows, error }] = await Promise.all([
      supabaseAdmin
        .from("qa_room_settings")
        .select("*")
        .eq("room_key", room_key)
        .maybeSingle(),
      supabaseAdmin
        .from("qa_messages")
        .select("*")
        .eq("room_key", room_key)
        .eq("is_featured", true)
        .in("status", ["approved", "answered"])
        .order("featured_at", { ascending: true })
        .order("created_at", { ascending: true }),
    ])

    if (error) return json({ error: error.message }, 400)

    const items = featuredRows || []
    if (items.length === 0) {
      return json({
        featured: null,
        queue: [],
        rotation_enabled: settings?.rotation_enabled ?? true,
        rotation_seconds: settings?.rotation_seconds ?? 15,
      })
    }

    const rotationEnabled = settings?.rotation_enabled ?? true
    const rotationSeconds = Math.max(5, Number(settings?.rotation_seconds ?? 15))

    let featured = items[0]

    if (rotationEnabled && items.length > 1) {
      const slot = Math.floor(Date.now() / 1000 / rotationSeconds)
      const index = slot % items.length
      featured = items[index]
    }

    return json({
      featured,
      queue: items,
      rotation_enabled: rotationEnabled,
      rotation_seconds: rotationSeconds,
    })
  } catch (e: any) {
    return json({ error: e?.message || "Failed to load featured question." }, 500)
  }
}