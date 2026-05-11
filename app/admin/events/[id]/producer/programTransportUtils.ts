import type { PreviewBlock } from "./useProducerBlocks"
import type { StageState } from "./producerRoomTypes"
import type { CinematicTransitionType } from "./commandDeckTypes"

export function broadcastPresenterProgramSource({
  mode,
  transitionType,
  transitionDurationMs,
  sessionId,
  stageState,
  previewBlocks,
}: {
  mode: "cut" | "auto"
  transitionType?: CinematicTransitionType
  transitionDurationMs: number
  sessionId: string
  stageState: StageState | null
  previewBlocks: PreviewBlock[]
}) {
  const channelKey = `jupiter:program-source:${sessionId}`

  const screenShareParticipant =
    stageState?.screen_share_participant_id ?? null

  const screenShareTrackId =
    stageState?.screen_share_track_id ?? null

  const primaryParticipant =
    stageState?.primary_participant_id ?? null

  const pinnedParticipant =
    stageState?.pinned_participant_id ?? null

  const firstStageParticipant =
    stageState?.stage_participant_ids?.[0] ?? null

  const activeParticipant =
    screenShareParticipant ??
    primaryParticipant ??
    pinnedParticipant ??
    firstStageParticipant

  const resolvedTransitionType =
    mode === "cut"
      ? "none"
      : transitionType ?? "fade"

  const visiblePreviewBlocks = previewBlocks
    .filter((block) => !block.hidden)
    .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

  const programBlocksPayload = visiblePreviewBlocks.map((block) => ({
    id: block.id,
    type: block.type,
    src: block.src ?? null,
    label: block.label ?? null,
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.height,
    zIndex: block.zIndex ?? 0,
    opacity: block.opacity ?? 1,
  }))

  const mediaBlock = visiblePreviewBlocks.find(
    (block) =>
      (block.type === "image" || block.type === "video") &&
      typeof block.src === "string" &&
      block.src.trim().length > 0
  )

  const payload = mediaBlock
    ? {
        mode,
        transitionType: resolvedTransitionType,
        transitionDurationMs,
        sourceType: "media",
        participantIdentity: activeParticipant,
        screenShareParticipantIdentity: screenShareParticipant,
        screenShareTrackId,
        mediaUrl: mediaBlock.src ?? null,
        mediaType: mediaBlock.type === "video" ? "video" : "image",
        mediaLabel: mediaBlock.label ?? mediaBlock.type,
        programBlocks: programBlocksPayload,
        layout: stageState?.layout ?? null,
        isLive: Boolean(stageState?.is_live),
        updatedAt: Date.now(),
      }
    : {
        mode,
        transitionType: resolvedTransitionType,
        transitionDurationMs,
        sourceType: screenShareParticipant
          ? "screen"
          : activeParticipant
            ? "camera"
            : "empty",
        participantIdentity: activeParticipant,
        screenShareParticipantIdentity: screenShareParticipant,
        screenShareTrackId,
        mediaUrl: null,
        mediaType: null,
        mediaLabel: null,
        programBlocks: programBlocksPayload,
        layout: stageState?.layout ?? null,
        isLive: Boolean(stageState?.is_live),
        updatedAt: Date.now(),
      }

  try {
    window.localStorage.setItem(channelKey, JSON.stringify(payload))

    const channel = new BroadcastChannel(channelKey)

    channel.postMessage(payload)
    channel.close()
  } catch (_err: unknown) {
    // best effort
  }
}