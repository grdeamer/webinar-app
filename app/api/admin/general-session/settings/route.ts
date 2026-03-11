import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200): Response {
  return NextResponse.json(data, { status })
}

export async function GET(): Promise<Response> {
  const { data, error } = await supabaseAdmin
    .from("general_session_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (error) return json({ error: error.message }, 400)
  return json({ settings: data || null })
}

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  const body = await req.json().catch(() => ({}))

  const source_type = body?.source_type
  const mp4_path = body?.mp4_path ?? null
  const m3u8_url = body?.m3u8_url ?? null
  const rtmp_url = body?.rtmp_url ?? null

  const title =
    typeof body?.title === "string" ? body.title.trim().slice(0, 200) : null

  const poster_url =
    typeof body?.poster_url === "string" && body.poster_url.trim()
      ? body.poster_url.trim()
      : null

  const is_published = Boolean(body?.is_published)

  const publish_state =
    typeof body?.publish_state === "string" ? body.publish_state : null

  const publish_at =
    typeof body?.publish_at === "string" && body.publish_at.trim()
      ? body.publish_at.trim()
      : null

  const presenter_key =
    typeof body?.presenter_key === "string" && body.presenter_key.trim()
      ? body.presenter_key.trim()
      : null

  if (!["mp4", "m3u8", "rtmp"].includes(source_type)) {
    return json({ error: "Invalid source_type" }, 400)
  }

  if (source_type === "mp4" && !mp4_path) {
    return json({ error: "mp4_path is required for source_type=mp4" }, 400)
  }
  if (source_type === "m3u8" && !m3u8_url) {
    return json({ error: "m3u8_url is required for source_type=m3u8" }, 400)
  }
  if (source_type === "rtmp" && !rtmp_url) {
    return json({ error: "rtmp_url is required for source_type=rtmp" }, 400)
  }

  if (publish_state && !["draft", "published", "scheduled"].includes(publish_state)) {
    return json({ error: "Invalid publish_state" }, 400)
  }

  const { data, error } = await supabaseAdmin
    .from("general_session_settings")
    .upsert(
      {
        id: 1,
        title,
        poster_url,
        is_published,
        publish_state: publish_state ?? (is_published ? "published" : "draft"),
        publish_at,
        presenter_key,
        source_type,
        mp4_path: source_type === "mp4" ? mp4_path : null,
        m3u8_url: source_type === "m3u8" ? m3u8_url : null,
        rtmp_url: source_type === "rtmp" ? rtmp_url : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 400)

  return json({ settings: data })
}