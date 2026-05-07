import type { JSX } from "react"
import {
  Layers3,
  Radio,
  SlidersHorizontal,
  Users,
} from "lucide-react"
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

function RailSectionLabel({
  icon,
  title,
  sub,
}: {
  icon: JSX.Element
  title: string
  sub: string
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-black/22 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-white/72 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
          {icon}
        </span>

        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/32">
            {title}
          </div>
          <div className="truncate text-sm font-semibold text-white/82">
            {sub}
          </div>
        </div>
      </div>

      <div className="hidden rounded-full border border-violet-300/14 bg-violet-400/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-violet-100/58 xl:block">
        Live
      </div>
    </div>
  )
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
    <div className="space-y-3 rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_34%),linear-gradient(180deg,rgba(7,12,28,0.88),rgba(2,4,10,0.97))] p-2.5 shadow-[0_32px_120px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition duration-300 hover:border-white/14 xl:col-start-3">
      <RailSectionLabel
        icon={<SlidersHorizontal size={16} />}
        title="Inspector"
        sub="Selected Layer Controls"
      />
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
      <RailSectionLabel
        icon={<Users size={16} />}
        title="Backstage"
        sub={`${participants.length} Connected Participants`}
      />

      <BackstagePanel participantCount={participants.length}>
        {participants.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/28 text-white/38 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
              <Radio size={16} />
            </div>

            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">
              Backstage Idle
            </div>

            <div className="mt-2 text-sm text-white/40">
              Waiting for presenters and contributors to join the live room.
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/24 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/34">
              <Layers3 size={11} />
              Production Queue Empty
            </div>
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