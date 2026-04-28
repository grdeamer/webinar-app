import type { JSX } from "react"
import AudienceOriginCue from "@/components/live/AudienceOriginCue"
import StageVideoPreview from "./StageVideoPreview"
import type { PreviewBlock } from "./useProducerBlocks"
import MonitorHeader from "./MonitorHeader"
import AudienceOriginTestPanel from "./AudienceOriginTestPanel"
import MediaBlocksPanel from "./MediaBlocksPanel"
import ScenesStatusPanel from "./ScenesStatusPanel"
import type { ProducerParticipant, StageState } from "./producerRoomTypes"
import { renderPlacedBlocks } from "./producerRoomBlockHelpers"

export default function CenterSwitcherColumn({
  triggerAudienceCue,
  onHideAudienceCue,
  previewProgramDifferent,
  onPreviewCanvasMouseMove,
  stopDraggingBlock,
  onClearSelectedBlock,
  stageState,
  onStageParticipants,
  previewBlocks,
  selectedBlockId,
  setSelectedBlockId,
  startDraggingBlock,
  startResizingBlock,
  programState,
  programBlocks,
  showAudienceCue,
  audienceCueRegion,
  audienceCueMoonMode,
  audienceCueQuestionLabel,
  isTransitioning,
  transitionFromState,
  transitionFromBlocks,
  transitionFadingOut,
  sceneName,
  onSceneNameChange,
  onSaveScene,
  sceneBusy,
  scenes,
  onApplyScene,
  onClearScreenShare,
  onUnpin,
  onClearPrimary,
  addTestTextBlock,
  addTestVideoBlock,
  addTestPdfBlock,
  addTestImageBlock,
  onUploadPdf,
  onUploadVideo,
  onUploadImage,
  duplicateSelectedBlock,
  bringSelectedBlockToFront,
  deleteSelectedBlock,
}: {
  triggerAudienceCue: (options?: {
    region?: string
    moonMode?: boolean
    questionLabel?: string
    durationMs?: number
  }) => void
  onHideAudienceCue: () => void
  previewProgramDifferent: boolean
  onPreviewCanvasMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  stopDraggingBlock: () => void
  onClearSelectedBlock: () => void
  stageState: StageState | null
  onStageParticipants: ProducerParticipant[]
  previewBlocks: PreviewBlock[]
  selectedBlockId: string | null
  setSelectedBlockId: (value: string | null) => void
  startDraggingBlock: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void
  startResizingBlock: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void
  programState: StageState | null
  programBlocks: PreviewBlock[]
  showAudienceCue: boolean
  audienceCueRegion: string
  audienceCueMoonMode: boolean
  audienceCueQuestionLabel: string
  isTransitioning: boolean
  transitionFromState: StageState | null
  transitionFromBlocks: PreviewBlock[]
  transitionFadingOut: boolean
  sceneName: string
  onSceneNameChange: (value: string) => void
  onSaveScene: () => void
  sceneBusy: boolean
  scenes: Array<{ id: string; name: string }>
  onApplyScene: (sceneId: string) => void
  onClearScreenShare: () => void
  onUnpin: () => void
  onClearPrimary: () => void
  addTestTextBlock: () => void
  addTestVideoBlock: () => void
  addTestPdfBlock: () => void
  addTestImageBlock: () => void
  onUploadPdf: () => void
  onUploadVideo: () => void
  onUploadImage: () => void
  duplicateSelectedBlock: () => void
  bringSelectedBlockToFront: () => void
  deleteSelectedBlock: () => void
}): JSX.Element {
  return (
    <div className="space-y-5 xl:col-start-2">
      <AudienceOriginTestPanel
        onTriggerCue={triggerAudienceCue}
        onHideCue={onHideAudienceCue}
      />

      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,42,0.92),rgba(5,8,22,0.98))] p-4 xl:p-4 2xl:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
            Switcher
          </div>
          <div className="mt-1 text-lg font-semibold text-white">
            Preview → Program
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:gap-4">
          <div className="rounded-[24px] border border-sky-400/10 bg-[#07111f] p-2.5 xl:p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <MonitorHeader
              title="Preview"
              subtitle="What you are preparing"
              tone="preview"
              badge={
                <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
                  {previewProgramDifferent ? "Changed" : "Ready"}
                </span>
              }
            />

            <div
              className="relative h-[520px] overflow-hidden rounded-[18px] border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:h-[600px] 2xl:h-[680px]"
              onMouseMove={onPreviewCanvasMouseMove}
              onMouseUp={stopDraggingBlock}
              onMouseLeave={stopDraggingBlock}
              onClick={onClearSelectedBlock}
            >
                            {isTransitioning ? (
                <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-white/[0.03]">
                  <div className="rounded-full border border-white/30 bg-white px-6 py-3 text-[11px] font-black uppercase tracking-[0.28em] text-black shadow-[0_0_70px_rgba(255,255,255,0.5)]">
                    Live Cut
                  </div>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />

              <StageVideoPreview
                stageState={stageState}
                participantIds={onStageParticipants.map((p) => p.identity)}
              />

              {renderPlacedBlocks({
                blocks: previewBlocks,
                opts: {
                  selectable: true,
                  showChrome: true,
                  selectedBlockId,
                },
                selectedBlockId,
                setSelectedBlockId,
                startDraggingBlock,
                startResizingBlock,
              })}

              <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] font-medium text-white/65 backdrop-blur">
                PREVIEW
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-red-400/15 bg-[#170b0d] p-2.5 xl:p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <MonitorHeader
              title="Program"
              subtitle="What the audience is seeing"
              tone="program"
              badge={
                <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-200">
                  {programState?.is_live ? "LIVE" : "HOLDING"}
                </span>
              }
            />

            <div
className={`relative h-[520px] overflow-hidden rounded-[18px] bg-black transition-all duration-300 xl:h-[600px] 2xl:h-[680px] ${
  previewProgramDifferent
    ? "border border-amber-300/35 shadow-[0_0_40px_rgba(251,191,36,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]"
    : "border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
}`}
>
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />
{previewProgramDifferent ? (
  <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-amber-400 px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.24em] text-black shadow-[0_0_32px_rgba(251,191,36,0.28)]">
    Untaken Changes
  </div>
) : null}
              <div className="relative z-10 h-full">
                <StageVideoPreview
                  stageState={programState}
                  participantIds={programState?.stage_participant_ids || []}
                />

                {renderPlacedBlocks({
                  blocks: programBlocks,
                  opts: {
                    selectable: false,
                    showChrome: false,
                  },
                  selectedBlockId,
                  setSelectedBlockId,
                  startDraggingBlock,
                  startResizingBlock,
                })}

                <div className="absolute inset-0 z-30 pointer-events-none p-4">
                  <AudienceOriginCue
                    visible={showAudienceCue}
                    region={audienceCueRegion}
                    moonMode={audienceCueMoonMode}
                    entering
                    questionLabel={audienceCueQuestionLabel}
                    compact
                    broadcast
                  />
                </div>
              </div>

              {isTransitioning && transitionFromState ? (
                <div
                  className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-500 ${
                    transitionFadingOut ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <StageVideoPreview
                    stageState={transitionFromState}
                    participantIds={transitionFromState.stage_participant_ids || []}
                  />

                  {renderPlacedBlocks({
                    blocks: transitionFromBlocks,
                    opts: {
                      selectable: false,
                      showChrome: false,
                    },
                    selectedBlockId,
                    setSelectedBlockId,
                    startDraggingBlock,
                    startResizingBlock,
                  })}
                </div>
              ) : null}

<div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full border border-red-400/20 bg-black/60 px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] text-red-200 backdrop-blur-md shadow-[0_0_30px_rgba(239,68,68,0.12)]">
  <span className="relative flex h-2.5 w-2.5 items-center justify-center">
    <span
      className={`absolute inset-0 rounded-full ${
        programState?.is_live
          ? "animate-ping bg-red-400/50"
          : "bg-transparent"
      }`}
    />
    <span
      className={`relative h-2.5 w-2.5 rounded-full ${
        programState?.is_live
          ? "bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.9)]"
          : "bg-white/30"
      }`}
    />
  </span>

  {programState?.is_live ? "LIVE" : "PROGRAM"}
</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <MediaBlocksPanel
          previewBlocksCount={previewBlocks.length}
          onAddText={addTestTextBlock}
          onAddVideo={addTestVideoBlock}
          onAddPdf={addTestPdfBlock}
          onAddImage={addTestImageBlock}
          onUploadPdf={onUploadPdf}
          onUploadVideo={onUploadVideo}
          onUploadImage={onUploadImage}
          onDuplicate={duplicateSelectedBlock}
          onBringToFront={bringSelectedBlockToFront}
          onDelete={deleteSelectedBlock}
          hasSelectedBlock={Boolean(selectedBlockId)}
        />

        <ScenesStatusPanel
          sceneName={sceneName}
          onSceneNameChange={onSceneNameChange}
          onSaveScene={onSaveScene}
          sceneBusy={sceneBusy}
          stageState={stageState}
          scenes={scenes}
          onApplyScene={onApplyScene}
          onClearScreenShare={onClearScreenShare}
          onUnpin={onUnpin}
          onClearPrimary={onClearPrimary}
        />
      </div>
    </div>
  )
}