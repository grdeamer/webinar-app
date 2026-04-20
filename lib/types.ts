export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type CsvCell = string | number | boolean | null | undefined
export type CsvRow = Record<string, CsvCell>

export type MaterialKind = "pdf" | "pptx" | "docx" | "zip" | "link"

export interface Material {
  label: string
  url: string
  kind?: MaterialKind
}

export interface WebinarRecord {
  id: string
  title: string
  description: string | null
  webinar_date?: string | null
  time?: string | null
  speaker?: string | null
  tag?: string | null
  join_link?: string | null
  agenda_pdf_url?: string | null
  materials?: Material[] | null
  playback_type?: "mp4" | "hls" | null
  playback_mp4_url?: string | null
  playback_m3u8_url?: string | null
  thumbnail_url?: string | null
}

export interface EventRecord {
  id: string
  title: string
  slug: string
  description?: string | null
  start_at?: string | null
  end_at?: string | null
}

export interface EventAgendaItem {
  id: string
  event_id: string
  title: string
  description: string | null
  location: string | null
  track: string | null
  speaker: string | null
  start_at: string | null
  end_at: string | null
  sort_index: number | null
  created_at: string | null
}

export interface EventBreakout {
  id: string
  event_id: string
  title: string
  description: string | null
  join_link: string | null
  start_at: string | null
  end_at: string | null
  speaker_name: string | null
  speaker_avatar_url: string | null
  manual_live: boolean
  auto_open: boolean
  created_at: string | null
}

export interface GeneralSessionSettingsRow {
  id: number
  source_type: "mp4" | "m3u8" | "rtmp" | null
  mp4_path: string | null
  m3u8_url: string | null
  rtmp_url: string | null
}

export interface SlideAssetRow {
  id: string | number
  name: string
  slide_path: string
  created_at: string | null
}

export type GeneralSessionSourceKind = "video" | "hls" | "rtmp" | "slides"

export interface GeneralSessionSourceOption {
  id: string
  kind: GeneralSessionSourceKind
  label: string
  preview_url: string | null
  slide_path?: string
}

export interface QASessionRow {
  id: string
  slug: string
  enabled: boolean
  allow_anonymous: boolean
}

export interface QAQuestionRow {
  id: string
  session_id?: string
  question: string
  asked_by: string | null
  status: string | null
  pinned: boolean
  created_at: string | null
}

export interface EventUser {
  id: string
  email: string
  username: string | null
  role: string | null
}

export interface EventSponsorRecord {
  id: string
  event_id?: string | null
  name: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  tier: string | null
  sort_index: number | null
}

export interface EventAgendaPreviewItem {
  id: string
  title: string
  description: string | null
  track: string | null
  speaker: string | null
  start_at: string | null
  end_at: string | null
}

export interface EventBreakoutPreview {
  id: string
  title: string
  description: string | null
  join_link: string | null
  start_at: string | null
  end_at: string | null
}

export interface EventAssignedWebinar extends WebinarRecord {
  speaker_cards?: unknown
  presenter?: string | null
}

export interface WebinarAssignmentRow {
  webinar_id: string
  webinars: WebinarRecord | null
}

export interface EventWebinarAssignmentRow {
  webinar_id: string
  webinars: EventAssignedWebinar | null
}

export type EventLiveMode =
  | "lobby"
  | "general_session"
  | "session"
  | "breakout"
  | "replay"
  | "off_air"
  | "idle"
  | "announcement"
  | "session_redirect"
  | "multi_session"

export type EventLiveStateRecord = {
  id: string
  event_id: string
  mode: EventLiveMode
  active_breakout_id: string | null
  destination_type: string | null
  destination_session_id: string | null
  headline: string | null
  message: string | null
  force_redirect: boolean
  transition_type: string | null
  transition_duration_ms: number | null
  transition_active?: boolean | null
  transition_started_at?: string | null
  updated_at: string | null
  updated_by: string | null
}

export interface EventLiveDestination {
  mode:
    | "lobby"
    | "general_session"
    | "session"
    | "breakout"
    | "replay"
    | "off_air"
  href: string
  label: string
  description: string
  breakoutId?: string | null
  sessionId?: string | null
  forceRedirect?: boolean
}

export type LiveProvider = "livekit" | "ivs" | "cloudflare"
export type LiveAudienceMode = "embedded" | "broadcast" | "private"
export type LiveStageLayout = "solo" | "grid" | "screen_speaker"
export type LiveParticipantRole = "producer" | "host" | "speaker" | "guest"

export interface EventLiveRoomRecord {
  id: string
  event_id: string
  provider: LiveProvider
  room_name: string
  audience_mode: LiveAudienceMode
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface EventLiveParticipantRecord {
  id: string
  event_id: string
  room_id: string | null
  external_participant_id: string
  display_name: string
  email: string | null
  role: LiveParticipantRole
  is_backstage: boolean
  is_on_stage: boolean
  camera_enabled: boolean
  mic_enabled: boolean
  screen_share_enabled: boolean
  connection_quality: string | null
  joined_at: string | null
  last_seen_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EventLiveStageStateRecord {
  event_id: string
  room_id: string | null
  is_live: boolean
  auto_director_enabled: boolean
  layout: LiveStageLayout
  stage_participant_ids: string[]
  primary_participant_id: string | null
  pinned_participant_id: string | null
  screen_share_participant_id: string | null
  screen_share_track_id: string | null
  scene_version: number
  headline: string | null
  message: string | null
  updated_by: string | null
  updated_at: string
}

export interface EventLiveSceneRecord {
  id: string
  event_id: string
  name: string
  layout: LiveStageLayout
  scene_json: Record<string, unknown>
  is_default: boolean
  created_by: string | null
  created_at: string
}

export interface LiveJoinTokenResponse {
  provider: LiveProvider
  roomName: string
  participantName: string
  participantIdentity: string
  token: string
}

export interface ProducerStageActionInput {
  action:
    | "add_to_stage"
    | "remove_from_stage"
    | "pin_participant"
    | "unpin_participant"
    | "set_primary"
    | "clear_primary"
    | "set_screen_share"
    | "clear_screen_share"
    | "go_live"
    | "go_off_air"
  participantId?: string | null
  trackId?: string | null
}

export interface ProducerLayoutInput {
  layout: LiveStageLayout
}