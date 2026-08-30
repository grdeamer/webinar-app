import type { ProducerParticipant, StageState } from "@/app/admin/events/[id]/producer/producerRoomTypes"

export type CinematicTransitionType = "fade" | "warp" | "curtain" | "none"
export type StageLayout = "solo" | "grid" | "screen_speaker"

export type EventTransitionPayload = {
  active: boolean
  type?: CinematicTransitionType
  headline?: string
  message?: string
  durationMs?: number
}

export interface ProducerRoomApi {
  loadToken(): Promise<{ token: string; roomName?: string | null }>
  loadParticipants(): Promise<{ participants: ProducerParticipant[] }>
  loadStageState(): Promise<{ state: StageState | null }>
  loadProgramState(): Promise<{ state: StageState | null }>
  loadScenes(): Promise<{ scenes: unknown[] }>
  addToStage(participantId: string): Promise<{ state: StageState }>
  removeFromStage(participantId: string): Promise<{ state: StageState }>
  pinParticipant(participantId: string): Promise<{ state: StageState }>
  unpinParticipant(): Promise<{ state: StageState }>
  setPrimaryParticipant(participantId: string): Promise<{ state: StageState }>
  clearPrimaryParticipant(): Promise<{ state: StageState }>
  goLive(expectedPreviewVersion?: number | null): Promise<{
    state: StageState | null
    programState: StageState | null
  }>
  goOffAir(expectedPreviewVersion?: number | null): Promise<{
    state: StageState | null
    programState: StageState | null
  }>
  setScreenShare(participantId: string, trackId: string): Promise<{ state: StageState }>
  clearScreenShare(): Promise<{ state: StageState }>
  setLayout(layout: StageLayout): Promise<{ state: StageState }>
  setAutoDirector(enabled: boolean): Promise<{ state: StageState }>
  savePreviewState(input: {
    layout: StageLayout
    stageParticipantIds: string[]
    primaryParticipantId: string | null
    qaOrigin?: {
      cueVisible: boolean
      region?: string | null
      moonMode?: boolean
      questionLabel?: string | null
      treatment?: "default" | "qa_origin_blend" | null
      lat?: number | null
      lng?: number | null
    }
    liveMomentType?: "audience_origin" | null
  }): Promise<{ state: StageState }>
  savePreviewComposition(blocks: unknown[], expectedVersion: number | null): Promise<{ state: StageState }>
  takeProgram(input: {
    expectedPreviewVersion: number | null
    programBlocks: unknown[]
    transition: Record<string, unknown>
    liveMomentType?: "audience_origin" | null
  }): Promise<{ state: StageState | null }>
  saveScene(input: {
    name: string
    sceneId?: string | null
    previewBlocks: unknown[]
    screenLayoutPreset: string
    thumbnailUrl?: string | null
  }): Promise<{ scene?: { id: string | number } }>
  applyScene(sceneId: string): Promise<{ state: StageState | null }>
  renameScene(sceneId: string, name: string): Promise<unknown>
  deleteScene(sceneId: string): Promise<unknown>
  setEventTransition(payload: EventTransitionPayload): Promise<unknown>
  clearEventTransition(): Promise<unknown>
}
