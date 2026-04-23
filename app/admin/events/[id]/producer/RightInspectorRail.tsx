import type { JSX } from "react"
import type { PreviewBlock } from "./useProducerBlocks"
import BackstagePanel from "./BackstagePanel"
import ParticipantCard from "./ParticipantCard"
import SelectedBlockInspector from "./SelectedBlockInspector"

type ProducerParticipant = {
  identity: string
  name: string
  joinedAt: string | null
  state: string | number | null
  isPublisher: boolean
  metadata?: Record<string, unknown>
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

type StageState = {
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

export default function RightInspectorRail({
  selectedBlock,
  onToggleHidden,
  onUpdateOpacity,
  onUpdateLabel,
  onUpdatePosition,
  onUpdateSize,
  onUpdateSrc,
  onUpdateTextContent,
  participants,
  stageIds,
  stageState,
  getScreenTrackSid,
  onAddToStage,
  onSetScreenShare,
  onClearPrimary,
  onSetPrimary,
  onUnpin,
  onPin,
  onRemoveFromStage,
  onError,
}: {
  selectedBlock: PreviewBlock | null
  onToggleHidden: () => void
  onUpdateOpacity: (value: string) => void
  onUpdateLabel: (value: string) => void
  onUpdatePosition: (field: "x" | "y", value: string) => void
  onUpdateSize: (field: "width" | "height", value: string) => void
  onUpdateSrc: (value: string) => void
  onUpdateTextContent: (value: string) => void
  participants: ProducerParticipant[]
  stageIds: Set<string>
  stageState: StageState | null
  getScreenTrackSid: (participant: ProducerParticipant) => string | null
  onAddToStage: (identity: string) => void
  onSetScreenShare: (participantId: string, trackId: string) => void
  onClearPrimary: () => void
  onSetPrimary: (identity: string) => void
  onUnpin: () => void
  onPin: (identity: string) => void
  onRemoveFromStage: (identity: string) => void
  onError: (value: string | null) => void
}): JSX.Element {
  return (
    <div className="space-y-4 xl:col-start-3">
      <SelectedBlockInspector
        selectedBlock={selectedBlock}
        onToggleHidden={onToggleHidden}
        onUpdateOpacity={onUpdateOpacity}
        onUpdateLabel={onUpdateLabel}
        onUpdatePosition={onUpdatePosition}
        onUpdateSize={onUpdateSize}
        onUpdateSrc={onUpdateSrc}
        onUpdateTextContent={onUpdateTextContent}
      />

      <BackstagePanel participantCount={participants.length}>
        {participants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-white/40">
            No participants connected yet.
          </div>
        ) : (
          participants.map((p) => {
            const isOnStage = stageIds.has(p.identity)
            const isPrimary = stageState?.primary_participant_id === p.identity
            const isPinned = stageState?.pinned_participant_id === p.identity
            const isUsingScreen = stageState?.screen_share_participant_id === p.identity
            const screenTrackSid = getScreenTrackSid(p)

            return (
              <ParticipantCard
                key={p.identity}
                participant={p}
                isOnStage={isOnStage}
                isPrimary={isPrimary}
                isPinned={isPinned}
                isUsingScreen={isUsingScreen}
                screenTrackSid={screenTrackSid}
                onAddToStage={onAddToStage}
                onSetScreenShare={onSetScreenShare}
                onClearPrimary={onClearPrimary}
                onSetPrimary={onSetPrimary}
                onUnpin={onUnpin}
                onPin={onPin}
                onRemoveFromStage={onRemoveFromStage}
                onError={onError}
              />
            )
          })
        )}
      </BackstagePanel>
    </div>
  )
}