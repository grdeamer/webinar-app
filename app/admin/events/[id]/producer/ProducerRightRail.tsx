

import type { JSX } from "react"
import RightInspectorRail from "./RightInspectorRail"
import type { PreviewBlock } from "./useProducerBlocks"
import type { ProducerParticipant, StageState } from "./producerRoomTypes"

export default function ProducerRightRail({
  participants,
  stageIds,
  selectedBlock,
  onToggleHidden,
  onUpdateOpacity,
  onUpdateLabel,
  onUpdatePosition,
  onUpdateSize,
  onUpdateSrc,
  onUpdateTextContent,
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
  participants: ProducerParticipant[]
  stageIds: Set<string>
  selectedBlock: PreviewBlock | null
  onToggleHidden: () => void
  onUpdateOpacity: (value: string) => void
  onUpdateLabel: (value: string) => void
  onUpdatePosition: (field: "x" | "y", value: string) => void
  onUpdateSize: (field: "width" | "height", value: string) => void
  onUpdateSrc: (value: string) => void
  onUpdateTextContent: (value: string) => void
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
    <div className="min-w-0 overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.96))] p-3 shadow-[0_30px_120px_rgba(0,0,0,0.52)] backdrop-blur-2xl transition duration-300 hover:border-white/15 hover:shadow-[0_34px_140px_rgba(0,0,0,0.62)] lg:col-start-3">
      <div className="mb-3 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.26em] text-white/35">
              Backstage
            </div>
            <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
              Talent Dock
            </div>
            <div className="mt-1 text-xs leading-5 text-white/45">
              Route guests, camera, mic, screen, and stage status.
            </div>
          </div>
          <div className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
            {participants.length} Feeds
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <div className="text-lg font-semibold text-white">{stageIds.size}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
              Stage
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <div className="text-lg font-semibold text-white">
              {participants.filter((p) => p.cameraEnabled).length}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
              Cam
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <div className="text-lg font-semibold text-white">
              {participants.filter((p) => p.micEnabled).length}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
              Mic
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-black/20 p-2">
        <RightInspectorRail
          selectedBlock={selectedBlock}
          onToggleHidden={onToggleHidden}
          onUpdateOpacity={onUpdateOpacity}
          onUpdateLabel={onUpdateLabel}
          onUpdatePosition={onUpdatePosition}
          onUpdateSize={onUpdateSize}
          onUpdateSrc={onUpdateSrc}
          onUpdateTextContent={onUpdateTextContent}
          participants={participants}
          stageIds={stageIds}
          stageState={stageState}
          getScreenTrackSid={getScreenTrackSid}
          onAddToStage={onAddToStage}
          onSetScreenShare={onSetScreenShare}
          onClearPrimary={onClearPrimary}
          onSetPrimary={onSetPrimary}
          onUnpin={onUnpin}
          onPin={onPin}
          onRemoveFromStage={onRemoveFromStage}
          onError={onError}
        />
      </div>
    </div>
  )
}