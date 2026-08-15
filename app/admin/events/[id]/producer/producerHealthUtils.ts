import type { ProducerParticipant, StageState } from "./producerRoomTypes"
import type { PreviewBlock } from "./useProducerBlocks"

export type ProducerTransportHealth =
  | "connecting"
  | "connected"
  | "recovering"
  | "degraded"

export type ProducerHealthIssue = {
  id: string
  label: string
  detail: string
  severity: "warning" | "critical"
}

export type ProducerHealthSnapshot = {
  overall: "healthy" | "warning" | "critical"
  canTake: boolean
  takeBlockReason: string | null
  previewReady: boolean
  programReady: boolean
  stageReady: boolean
  issues: ProducerHealthIssue[]
}

function hasRenderableMediaSource(block: PreviewBlock): boolean {
  if (block.hidden) return false
  if (block.type === "camera-slot") return Boolean(block.assignedParticipantId)
  if (block.type === "video" || block.type === "image" || block.type === "pdf") {
    return Boolean(block.src)
  }
  return false
}

export function getProducerHealthSnapshot({
  transportHealth,
  syncWarning,
  participants,
  previewState,
  programState,
  previewBlocks,
  programBlocks,
}: {
  transportHealth: ProducerTransportHealth
  syncWarning: string | null
  participants: ProducerParticipant[]
  previewState: StageState | null
  programState: StageState | null
  previewBlocks: PreviewBlock[]
  programBlocks: PreviewBlock[]
}): ProducerHealthSnapshot {
  const issues: ProducerHealthIssue[] = []
  const connectedParticipantIds = new Set(participants.map((participant) => participant.identity))
  const previewStageIds = previewState?.stage_participant_ids ?? []
  const missingStageIds = previewStageIds.filter((identity) => !connectedParticipantIds.has(identity))
  const unavailableCameraSlots = previewBlocks.filter((block) => {
    if (block.hidden || block.type !== "camera-slot" || !block.assignedParticipantId) return false
    const participant = participants.find((item) => item.identity === block.assignedParticipantId)
    if (!participant) return true
    return !participant.cameraEnabled && !participant.tracks.some((track) => track.source === 1 || track.source === "CAMERA")
  })

  const connectedStageSource = previewStageIds.some((identity) => connectedParticipantIds.has(identity))
  const previewReady = connectedStageSource || previewBlocks.some(hasRenderableMediaSource)
  const programReady = Boolean(
    programBlocks.some(hasRenderableMediaSource) ||
      programState?.stage_participant_ids?.length ||
      programState?.screen_share_track_id,
  )
  const stageReady = previewStageIds.length === 0 || missingStageIds.length === 0

  if (transportHealth !== "connected") {
    issues.push({
      id: "transport",
      label: transportHealth === "recovering" ? "Transport recovery in progress" : "Live transport is not healthy",
      detail: transportHealth === "connecting"
        ? "Jupiter is connecting to the live room."
        : transportHealth === "recovering"
          ? "State and credentials are being refreshed."
          : "Reconnect before changing Program.",
      severity: "critical",
    })
  }

  if (syncWarning) {
    issues.push({
      id: "sync",
      label: "Control state needs attention",
      detail: syncWarning,
      severity: "critical",
    })
  }

  if (!previewReady) {
    issues.push({
      id: "preview-source",
      label: "Preview has no healthy full-frame source",
      detail: "Route a connected presenter, camera, image, video, slide, or holding source before TAKE.",
      severity: "critical",
    })
  }

  if (missingStageIds.length > 0) {
    issues.push({
      id: "missing-stage-source",
      label: `${missingStageIds.length} routed stage source${missingStageIds.length === 1 ? " is" : "s are"} disconnected`,
      detail: "Remove the stale route or reconnect the participant before TAKE.",
      severity: "critical",
    })
  }

  if (unavailableCameraSlots.length > 0) {
    issues.push({
      id: "camera-slot",
      label: `${unavailableCameraSlots.length} camera slot${unavailableCameraSlots.length === 1 ? " is" : "s are"} unavailable`,
      detail: "Reassign the slot or restore the participant camera before TAKE.",
      severity: "critical",
    })
  }

  if (!programReady) {
    issues.push({
      id: "program-source",
      label: "Program is waiting for its first committed source",
      detail: "This is safe while rehearsing, but the audience cannot go live yet.",
      severity: "warning",
    })
  }

  const criticalIssue = issues.find((issue) => issue.severity === "critical")
  const overall = criticalIssue ? "critical" : issues.length > 0 ? "warning" : "healthy"

  return {
    overall,
    canTake: !criticalIssue,
    takeBlockReason: criticalIssue?.detail ?? null,
    previewReady,
    programReady,
    stageReady,
    issues,
  }
}
