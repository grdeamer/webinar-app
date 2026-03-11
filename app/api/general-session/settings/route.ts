import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SourceType = "mp4" | "m3u8" | "rtmp"
type PublishState = "draft" | "published" | "scheduled"
type LogoPosition = "left" | "center" | "right"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function normalizeSourceType(value: unknown): SourceType {
  return value === "m3u8" || value === "rtmp" ? value : "mp4"
}

function normalizePublishState(value: unknown, isPublished: boolean): PublishState {
  if (value === "scheduled") return "scheduled"
  if (value === "published") return "published"
  if (value === "draft") return "draft"
  return isPublished ? "published" : "draft"
}

function normalizeLogoPosition(value: unknown): LogoPosition {
  return value === "center" || value === "right" ? value : "left"
}

export async function GET() {
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from("general_session_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (settingsError) {
    return json({ error: settingsError.message }, 400)
  }

  const { data: program, error: programError } = await supabaseAdmin
    .from("general_session_program")
    .select("client_logo_path, client_logo_position")
    .eq("id", 1)
    .maybeSingle()

  if (programError) {
    return json({ error: programError.message }, 400)
  }

  return json({
    settings: {
      id: 1,
      title: settings?.title ?? "General Session",
      source_type: settings?.source_type ?? "mp4",
      mp4_path: settings?.mp4_path ?? null,
      m3u8_url: settings?.m3u8_url ?? null,
      rtmp_url: settings?.rtmp_url ?? null,
      poster_url: settings?.poster_url ?? null,
      client_logo_path: program?.client_logo_path ?? null,
      client_logo_position: program?.client_logo_position ?? "left",
      is_published: Boolean(settings?.is_published),
      publish_state:
        settings?.publish_state ?? (settings?.is_published ? "published" : "draft"),
      publish_at: settings?.publish_at ?? null,
      presenter_key: settings?.presenter_key ?? null,
      updated_at: settings?.updated_at ?? null,
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  const title =
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim()
      : "General Session"

  const source_type = normalizeSourceType(body?.source_type)

  const mp4_path =
    source_type === "mp4" && typeof body?.mp4_path === "string" && body.mp4_path.trim()
      ? body.mp4_path.trim()
      : null

  const m3u8_url =
    source_type === "m3u8" && typeof body?.m3u8_url === "string" && body.m3u8_url.trim()
      ? body.m3u8_url.trim()
      : null

  const rtmp_url =
    source_type === "rtmp" && typeof body?.rtmp_url === "string" && body.rtmp_url.trim()
      ? body.rtmp_url.trim()
      : null

  const poster_url =
    typeof body?.poster_url === "string" && body.poster_url.trim()
      ? body.poster_url.trim()
      : null

  const client_logo_path =
    typeof body?.client_logo_path === "string" && body.client_logo_path.trim()
      ? body.client_logo_path.trim()
      : null

  const client_logo_position = normalizeLogoPosition(body?.client_logo_position)

  const is_published = Boolean(body?.is_published)
  const publish_state = normalizePublishState(body?.publish_state, is_published)

  const publish_at =
    publish_state === "scheduled" &&
    typeof body?.publish_at === "string" &&
    body.publish_at.trim()
      ? body.publish_at.trim()
      : null

  const presenter_key =
    typeof body?.presenter_key === "string" && body.presenter_key.trim()
      ? body.presenter_key.trim()
      : null

  const now = new Date().toISOString()

  const { error: settingsError } = await supabaseAdmin
    .from("general_session_settings")
    .upsert(
      {
        id: 1,
        title,
        source_type,
        mp4_path,
        m3u8_url,
        rtmp_url,
        poster_url,
        is_published,
        publish_state,
        publish_at,
        presenter_key,
        updated_at: now,
      },
      { onConflict: "id" }
    )

  if (settingsError) {
    return json({ error: settingsError.message }, 400)
  }

  const { data: existingProgram, error: existingProgramError } = await supabaseAdmin
    .from("general_session_program")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (existingProgramError) {
    return json({ error: existingProgramError.message }, 400)
  }

  const programPayload = existingProgram
    ? {
        ...existingProgram,
        id: 1,
        client_logo_path,
        client_logo_position,
        updated_at: now,
      }
    : {
        id: 1,
        program_kind: "video",
        program_source_type: null,
        program_mp4_path: null,
        program_m3u8_url: null,
        program_rtmp_url: null,
        program_slide_path: null,
        lower_third_active: false,
        lower_third_name: null,
        lower_third_title: null,
        client_logo_path,
        client_logo_position,
        updated_at: now,
      }

  const { error: programError } = await supabaseAdmin
    .from("general_session_program")
    .upsert(programPayload, { onConflict: "id" })

  if (programError) {
    return json({ error: programError.message }, 400)
  }

  return json({
    ok: true,
    settings: {
      id: 1,
      title,
      source_type,
      mp4_path,
      m3u8_url,
      rtmp_url,
      poster_url,
      client_logo_path,
      client_logo_position,
      is_published,
      publish_state,
      publish_at,
      presenter_key,
      updated_at: now,
    },
  })
}