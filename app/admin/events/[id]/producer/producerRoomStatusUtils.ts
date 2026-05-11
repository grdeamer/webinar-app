

import type { PreviewBlock } from "./useProducerBlocks"
import type { StageState } from "./producerRoomTypes"

export function previewProgramStatesDifferent({
  stageState,
  programState,
  previewBlocks,
  programBlocks,
}: {
  stageState: StageState | null
  programState: StageState | null
  previewBlocks: PreviewBlock[]
  programBlocks: PreviewBlock[]
}) {
  return (
    JSON.stringify({
      layout: stageState?.layout ?? null,
      stage_participant_ids: stageState?.stage_participant_ids ?? [],
      primary_participant_id: stageState?.primary_participant_id ?? null,
      pinned_participant_id: stageState?.pinned_participant_id ?? null,
      screen_share_participant_id:
        stageState?.screen_share_participant_id ?? null,
      screen_share_track_id: stageState?.screen_share_track_id ?? null,
      is_live: stageState?.is_live ?? false,
      blocks: previewBlocks,
    }) !==
    JSON.stringify({
      layout: programState?.layout ?? null,
      stage_participant_ids: programState?.stage_participant_ids ?? [],
      primary_participant_id: programState?.primary_participant_id ?? null,
      pinned_participant_id: programState?.pinned_participant_id ?? null,
      screen_share_participant_id:
        programState?.screen_share_participant_id ?? null,
      screen_share_track_id: programState?.screen_share_track_id ?? null,
      is_live: programState?.is_live ?? false,
      blocks: programBlocks,
    })
  )
}

export function getHasProgramSource({
  programBlocks,
  programState,
}: {
  programBlocks: PreviewBlock[]
  programState: StageState | null
}) {
  if (programBlocks.some((block) => !block.hidden)) return true
  if (programState?.screen_share_participant_id) return true
  if (programState?.primary_participant_id) return true
  if (programState?.pinned_participant_id) return true

  return Boolean(programState?.stage_participant_ids?.length)
}