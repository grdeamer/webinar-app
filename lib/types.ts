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
  sort_index: number
  created_at?: string
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
  created_at?: string
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


export type EventLiveMode = "lobby" | "general_session" | "breakout" | "replay" | "off_air"

export interface EventLiveStateRecord {
  id: string
  event_id: string
  mode: EventLiveMode
  active_breakout_id: string | null
  headline: string | null
  message: string | null
  force_redirect: boolean
  updated_at: string
  updated_by: string | null
}

export interface EventLiveDestination {
  mode: EventLiveMode
  href: string
  label: string
  description: string
  breakoutId?: string | null
}
