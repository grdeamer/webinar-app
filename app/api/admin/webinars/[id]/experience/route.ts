import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import { parseSpeakerCards } from "@/lib/eventExperience"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await context.params
    if (!isUuid(id)) return NextResponse.json({ error: "Invalid webinar id" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const playback_type_raw = String(body?.playback_type || "").trim().toLowerCase()
    const playback_type = ["mp4", "hls"].includes(playback_type_raw) ? playback_type_raw : null

    const payload = {
      speaker: cleanText(body?.speaker),
      thumbnail_url: cleanText(body?.thumbnail_url),
      playback_type,
      playback_mp4_url: cleanText(body?.playback_mp4_url),
      playback_m3u8_url: cleanText(body?.playback_m3u8_url),
      speaker_cards: parseSpeakerCards(body?.speaker_cards || []),
    }

    const { error } = await supabaseAdmin.from("webinars").update(payload).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, webinar: payload })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Save failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}