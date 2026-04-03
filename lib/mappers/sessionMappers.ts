import type { AppSession } from "@/lib/domain/sessions"

type SessionRow = {
  id: string
  event_id: string
  code: string | null
  slug: string | null
  title: string | null
  description: string | null
  starts_at: string | null
  ends_at: string | null
  presenter: string | null
  speaker_name: string | null

  session_kind: string | null
  visibility_mode: string | null
  delivery_mode: string | null
  runtime_status: string | null
  is_general_session: boolean | null

  external_platform: string | null
  external_join_url: string | null
  join_link: string | null

  live_provider: string | null
  live_room_name: string | null

  playback_type: string | null
  playback_mp4_url: string | null
  playback_m3u8_url: string | null

  chat_enabled: boolean | null
  qa_enabled: boolean | null
  lower_panel_enabled: boolean | null

  sort_order: number | null
  created_at: string | null
  updated_at: string | null
}

function normalizeVisibilityMode(value: string | null): AppSession["visibilityMode"] {
  if (value === "all" || value === "public") return value
  if (value === "registered") return "registered"
  if (value === "assigned") return "assigned"
  if (value === "hidden") return "hidden"
  return "assigned"
}

function normalizeDeliveryMode(value: string | null): AppSession["deliveryMode"] {
  if (value === "external" || value === "livekit" || value === "video" || value === "rtmp") {
    return value
  }
  return "external"
}

function normalizeRuntimeStatus(value: string | null): AppSession["runtimeStatus"] {
  if (
    value === "scheduled" ||
    value === "holding" ||
    value === "live" ||
    value === "paused" ||
    value === "ended"
  ) {
    return value
  }
  return "holding"
}

function normalizeKind(value: string | null): AppSession["kind"] {
  if (
    value === "general" ||
    value === "breakout" ||
    value === "meeting" ||
    value === "broadcast" ||
    value === "on_demand" ||
    value === "session"
  ) {
    return value
  }
  return "session"
}

function normalizePlaybackType(value: string | null): AppSession["playbackType"] {
  if (value === "mp4" || value === "m3u8" || value === "hls") return value
  return null
}

function normalizeExternalPlatform(value: string | null): AppSession["externalPlatform"] {
  if (value === "zoom" || value === "teams" || value === "webex" || value === "custom") {
    return value
  }
  return null
}

export function mapSessionRow(row: SessionRow): AppSession {
  return {
    id: row.id,
    eventId: row.event_id,

    code: row.code ?? null,
    slug: row.slug ?? null,

    title: row.title ?? "Untitled Session",
    description: row.description ?? null,

    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,

    presenter: row.presenter ?? null,
    speakerName: row.speaker_name ?? null,

    kind: normalizeKind(row.session_kind),
    visibilityMode: normalizeVisibilityMode(row.visibility_mode),
    deliveryMode: normalizeDeliveryMode(row.delivery_mode),
    runtimeStatus: normalizeRuntimeStatus(row.runtime_status),

    isGeneralSession: !!row.is_general_session,

    externalPlatform: normalizeExternalPlatform(row.external_platform),
    externalJoinUrl: row.external_join_url ?? null,
    joinLink: row.join_link ?? null,

    liveProvider: row.live_provider === "livekit" ? "livekit" : null,
    liveRoomName: row.live_room_name ?? null,

    playbackType: normalizePlaybackType(row.playback_type),
    playbackMp4Url: row.playback_mp4_url ?? null,
    playbackM3u8Url: row.playback_m3u8_url ?? null,

    chatEnabled: !!row.chat_enabled,
    qaEnabled: !!row.qa_enabled,
    lowerPanelEnabled: !!row.lower_panel_enabled,

    sortOrder: row.sort_order ?? null,

    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }
}