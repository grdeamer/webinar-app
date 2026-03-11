import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type {
  GeneralSessionSettingsRow,
  GeneralSessionSourceOption,
  SlideAssetRow,
} from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status })
}

export async function GET(): Promise<Response> {
  await requireAdmin()

  const sources: GeneralSessionSourceOption[] = []

  const { data: settings, error: sErr } = await supabaseAdmin
    .from("general_session_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle<GeneralSessionSettingsRow>()

  if (sErr) return json({ error: sErr.message }, 400)

  const sourceType = settings?.source_type || "mp4"
  const mp4Path = settings?.mp4_path || null
  const m3u8Url = settings?.m3u8_url || null
  const rtmpUrl = settings?.rtmp_url || null

  if (sourceType === "mp4" && mp4Path) {
    const { data } = await supabaseAdmin.storage
      .from("private")
      .createSignedUrl(mp4Path, 60 * 20)

    sources.push({
      id: "settings_video",
      kind: "video",
      label: "Main Video (MP4)",
      preview_url: data?.signedUrl || null,
    })
  } else if (sourceType === "m3u8" && m3u8Url) {
    sources.push({
      id: "settings_hls",
      kind: "hls",
      label: "Main Stream (HLS)",
      preview_url: m3u8Url,
    })
  } else if (sourceType === "rtmp" && rtmpUrl) {
    sources.push({
      id: "settings_rtmp",
      kind: "rtmp",
      label: "Main Stream (RTMP)",
      preview_url: null,
    })
  }

  const { data: slides, error: slErr } = await supabaseAdmin
    .from("general_session_slides")
    .select("id,name,slide_path,created_at")
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<SlideAssetRow[]>()

  if (slErr) return json({ error: slErr.message }, 400)

  for (const slide of slides || []) {
    let previewUrl: string | null = null
    const path = slide.slide_path
    const lower = path.toLowerCase()
    const isImage =
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".webp")

    if (isImage) {
      const { data } = await supabaseAdmin.storage
        .from("private")
        .createSignedUrl(path, 60 * 20)
      previewUrl = data?.signedUrl || null
    }

    sources.push({
      id: String(slide.id),
      kind: "slides",
      label: `Slides: ${slide.name}`,
      preview_url: previewUrl,
      slide_path: path,
    })
  }

  return json({ sources })
}