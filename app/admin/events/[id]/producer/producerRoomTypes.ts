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
}

export type SceneSnapshot = {
  id: string
  name: string
  stageState: StageState | null
  previewBlocks: PreviewBlock[]
  cameraSlotAssignments?: CameraSlotAssignment[]
  screenLayoutPreset?: ScreenLayoutPreset
}