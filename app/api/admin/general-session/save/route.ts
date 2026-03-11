import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  try {
    const body = await req.json()

    const {
      id,
      title,
      source_type,
      mp4_storage_path,
      hls_playback_url,
      poster_url,
      is_published,
    } = body

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 })
    if (!["mp4", "hls"].includes(source_type)) {
      return NextResponse.json({ error: "Invalid source_type" }, { status: 400 })
    }

    if (source_type === "hls") {
      const v = String(hls_playback_url || "").trim()
      if (!v || !v.includes(".m3u8")) {
        return NextResponse.json({ error: "HLS playback URL must be a .m3u8 URL" }, { status: 400 })
      }
    }

    const { error } = await supabaseAdmin
      .from("general_session_media")
      .update({
        title,
        source_type,
        mp4_storage_path: mp4_storage_path || null,
        hls_playback_url: hls_playback_url || null,
        poster_url: poster_url || null,
        is_published: Boolean(is_published),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}