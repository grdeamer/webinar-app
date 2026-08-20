import type { StageState } from "./producerRoomTypes"
import type { PreviewBlock } from "./useProducerBlocks"

export function getStaleProducerRouteIds({
  connectedParticipantIds,
  previewState,
  previewBlocks,
}: {
  connectedParticipantIds: Set<string>
  previewState: StageState | null
  previewBlocks: PreviewBlock[]
}): string[] {
  const routedIds = new Set(previewState?.stage_participant_ids ?? [])

  for (const block of previewBlocks) {
    if (block.type === "camera-slot" && block.assignedParticipantId) {
      routedIds.add(block.assignedParticipantId)
    }
  }

  return Array.from(routedIds).filter((identity) => !connectedParticipantIds.has(identity))
}

export function clearStaleCameraSlotAssignments(
  previewBlocks: PreviewBlock[],
  staleParticipantIds: Set<string>,
): PreviewBlock[] {
  let changed = false
  const nextBlocks = previewBlocks.map((block) => {
    if (
      block.type !== "camera-slot" ||
      !block.assignedParticipantId ||
      !staleParticipantIds.has(block.assignedParticipantId)
    ) {
      return block
    }

    changed = true
    return {
      ...block,
      assignedParticipantId: null,
      assignedTrackSid: null,
      assignedParticipantAccent: null,
    }
  })

  return changed ? nextBlocks : previewBlocks
}
