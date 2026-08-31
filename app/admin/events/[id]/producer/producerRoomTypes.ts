import type { PreviewBlock } from "./useProducerBlocks"
import type { ScreenLayoutPreset } from "./assetDockTypes"

export type ProducerParticipant = {
  identity: string
  name: string
  joinedAt: string | null
  state: string | number | null
  isPublisher: boolean
  metadata?: Record<string, unknown>
  accentColor?: string | null
  cameraEnabled: boolean
  micEnabled: boolean
  screenShareEnabled: boolean
  tracks: Array<{
    sid: string
    name: string
    source: string | number
    muted?: boolean
  }>
}

export type CameraSlotAssignment = {
  blockId: string
  assignedParticipantId: string | null
  assignedTrackSid?: string | null
  placeholderEmoji?: string | null
  placeholderLabel?: string | null
  placeholderSubLabel?: string | null
  placeholderStyle?: "dark" | "branded" | "avatar" | "logo"
}

export type StageState = {
  event_id: string
  room_id: string | null
  is_live: boolean
  auto_director_enabled: boolean
  layout: "solo" | "grid" | "screen_speaker"
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
  preview_blocks?: PreviewBlock[]
  program_blocks?: PreviewBlock[]
  program_layout?: "solo" | "grid" | "screen_speaker" | null
  program_stage_participant_ids?: string[]
  program_primary_participant_id?: string | null
  qa_origin_cue_visible?: boolean
  qa_origin_region?: string | null
  qa_origin_moon_mode?: boolean
  qa_origin_question_label?: string | null
  qa_origin_treatment?: "default" | "qa_origin_blend" | null
  qa_origin_lat?: number | null
  qa_origin_lng?: number | null
  live_moment_type?: string | null
  transition_type?: string | null
  transition_started_at?: string | null
  transition_json?: Record<string, unknown>
  last_command_id?: string | null
}

export type SceneSnapshot = {
  id: string
  name: string
  stageState: StageState | null
  previewBlocks: PreviewBlock[]
  cameraSlotAssignments?: CameraSlotAssignment[]
  screenLayoutPreset?: ScreenLayoutPreset
}
