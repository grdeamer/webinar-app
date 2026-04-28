import { useEffect, useRef, useState } from "react"
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
import ProducerTopDeck from "./ProducerTopDeck"

export default function CenterSwitcherColumn({
  triggerAudienceCue,
  onHideAudienceCue,
  previewProgramDifferent,
  takeBusy,
  lastTakeMode,
  onTake,
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
  takeBusy: boolean
  lastTakeMode: "cut" | "auto"
  onTake: (mode: "cut" | "auto") => void
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
  const switcherGridRef = useRef<HTMLDivElement | null>(null)
  const isDraggingSplitRef = useRef(false)
  const [previewPanePercent, setPreviewPanePercent] = useState(50)
  const [isAutoRunning, setIsAutoRunning] = useState(false)

  useEffect(() => {
    const storedValue = window.localStorage.getItem("producer-preview-pane-percent")
    const parsedValue = storedValue ? Number(storedValue) : NaN

    if (Number.isFinite(parsedValue)) {
      setPreviewPanePercent(Math.max(32, Math.min(68, parsedValue)))
    }
  }, [])

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      if (!isDraggingSplitRef.current) return

      const rect = switcherGridRef.current?.getBoundingClientRect()
      if (!rect) return

      const nextPercent = ((event.clientX - rect.left) / rect.width) * 100
      const clampedPercent = Math.max(32, Math.min(68, nextPercent))

      setPreviewPanePercent(clampedPercent)
      window.localStorage.setItem(
        "producer-preview-pane-percent",
        String(Math.round(clampedPercent))
      )
    }

    function onMouseUp() {
      isDraggingSplitRef.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  function startSplitDrag() {
    isDraggingSplitRef.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  function resetSplit() {
    setPreviewPanePercent(50)
    window.localStorage.setItem("producer-preview-pane-percent", "50")
  }

  function runAutoTransition() {
    if (takeBusy || isAutoRunning || !previewProgramDifferent) return

    setIsAutoRunning(true)

    window.setTimeout(() => {
      onTake("auto")
    }, 260)

    window.setTimeout(() => {
      setIsAutoRunning(false)
    }, 760)
  }

  return (
  <div className="space-y-3 xl:col-start-2">
    <ProducerTopDeck />
      <div className="opacity-55 transition-opacity duration-300 hover:opacity-100">
        <AudienceOriginTestPanel
          onTriggerCue={triggerAudienceCue}
          onHideCue={onHideAudienceCue}
        />
      </div>

      <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(35,46,92,0.36),transparent_42%),linear-gradient(180deg,rgba(8,14,34,0.96),rgba(3,5,14,0.99))] p-3 xl:p-3.5 2xl:p-4 shadow-[0_30px_110px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/32">
              Switcher Surface
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              Preview → Program
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white/35 backdrop-blur md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.7)]" />
            Control online
          </div>
        </div>

        <div
          ref={switcherGridRef}
          className="grid gap-0"
          style={{
            gridTemplateColumns: `minmax(0, ${previewPanePercent}fr) 56px minmax(0, ${100 - previewPanePercent}fr)`,
          }}
        >
          <div className="relative min-w-0 rounded-[28px] border border-sky-300/15 bg-[linear-gradient(180deg,rgba(7,17,31,0.98),rgba(2,7,15,0.98))] p-2 xl:p-2.5 shadow-[0_22px_70px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.06)] before:pointer-events-none before:absolute before:inset-x-8 before:-bottom-2 before:h-2 before:rounded-b-[22px] before:bg-black/45 before:blur-sm">
            <MonitorHeader
              title="Preview"
              subtitle="What you are preparing"
              tone="preview"
              badge={
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_0_22px_rgba(56,189,248,0.14)] ${
                  previewProgramDifferent
                    ? "border-amber-300/35 bg-amber-400/15 text-amber-100 shadow-[0_0_26px_rgba(251,191,36,0.18)]"
                    : "border-sky-300/25 bg-sky-400/12 text-sky-100"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    previewProgramDifferent
                      ? "bg-amber-300 animate-pulse shadow-[0_0_12px_rgba(252,211,77,0.9)]"
                      : "bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.75)]"
                  }`} />
                  {previewProgramDifferent ? "Changed" : "Ready"}
                </span>
              }
            />

            <div
              className={`relative aspect-video w-full overflow-hidden rounded-[22px] border bg-[radial-gradient(circle_at_center,#05070b_0%,#000_76%,#000_100%)] transition-all duration-300 ${
                previewProgramDifferent
                  ? "border-amber-300/30 shadow-[0_0_0_1px_rgba(251,191,36,0.16),0_0_70px_rgba(251,191,36,0.16),0_28px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.9)] animate-pulse"
                  : "border-sky-300/18 shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_24px_80px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.9)]"
              }`}
              onMouseMove={onPreviewCanvasMouseMove}
              onMouseUp={stopDraggingBlock}
              onMouseLeave={stopDraggingBlock}
              onClick={onClearSelectedBlock}
            >
              <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(118deg,transparent_4%,rgba(255,255,255,0.11)_18%,rgba(255,255,255,0.035)_28%,transparent_43%)] opacity-60" />
              <div className="pointer-events-none absolute inset-x-8 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
              <div className="pointer-events-none absolute inset-0 z-10 rounded-[22px] shadow-[inset_0_0_46px_rgba(0,0,0,0.72),inset_0_0_0_1px_rgba(255,255,255,0.035)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />

              {previewProgramDifferent ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-amber-300 px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.26em] text-black shadow-[0_0_36px_rgba(251,191,36,0.34)]">
                  Armed Preview
                </div>
              ) : null}

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

              <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full border border-sky-300/20 bg-black/65 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.12)] backdrop-blur-md">
                PVW
              </div>
            </div>
          </div>

<div
  className="group relative z-[999] flex min-h-full cursor-col-resize items-center justify-center self-stretch px-1"
  onMouseDown={startSplitDrag}
  onDoubleClick={resetSplit}
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize preview and program panes"
>
  {/* center rail */}
  <div className="absolute inset-y-3 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-violet-200/20 via-violet-300/35 to-violet-200/20 transition-all duration-300 group-hover:w-[4px] group-hover:from-violet-100/70 group-hover:via-violet-200/95 group-hover:to-violet-100/70 group-hover:shadow-[0_0_22px_rgba(196,181,253,0.55)]" />

  {/* glow field */}
  <div className="absolute inset-y-0 left-1/2 w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-500/8 to-transparent blur-md" />

  <div className="relative z-20 flex h-full items-center">
    <div className="rounded-[32px] border border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_28%),linear-gradient(180deg,rgba(28,28,42,0.97),rgba(8,8,14,0.99))] px-3 py-4 shadow-[0_30px_110px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.65)] backdrop-blur-xl">
      <div className="flex flex-col items-center gap-3">

        {/* CUT */}
        <button
          type="button"
          onClick={() => onTake("cut")}
          disabled={takeBusy || !previewProgramDifferent}
          className={`relative h-14 w-14 rounded-2xl border text-[10px] font-black tracking-[0.18em] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
            previewProgramDifferent
              ? "border-red-300/40 bg-red-500/18 text-red-100 shadow-[0_0_28px_rgba(239,68,68,0.32)] animate-pulse"
              : "border-red-400/20 bg-red-500/10 text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.18)]"
          }`}
        >
          <span className="absolute inset-x-2 top-1 h-[1px] bg-white/20" />
          {takeBusy ? "TAKING" : "CUT"}
        </button>

        {/* AUTO */}
        <button
          type="button"
          onClick={runAutoTransition}
          disabled={takeBusy || isAutoRunning || !previewProgramDifferent}
          className={`relative h-16 w-16 rounded-2xl border text-[10px] font-black tracking-[0.18em] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
            isAutoRunning
              ? "border-emerald-200/70 bg-emerald-400/25 text-emerald-50 shadow-[0_0_44px_rgba(52,211,153,0.44)]"
              : previewProgramDifferent
                ? "border-emerald-300/35 bg-emerald-500/14 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.24)]"
                : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.18)]"
          }`}
        >
          <span className="absolute inset-x-2 top-1 h-[1px] bg-white/20" />
          {isAutoRunning ? "RUN" : "AUTO"}
        </button>

        {/* T-Bar */}
        <div className="w-full px-1 pt-1">
          <div className="mb-1 text-center text-[8px] font-black tracking-[0.16em] text-white/30">
            T-BAR
          </div>

          <div className={`relative mx-auto h-16 w-3 rounded-full border bg-black/35 transition-all duration-300 ${
            isAutoRunning
              ? "border-emerald-300/35 shadow-[0_0_18px_rgba(52,211,153,0.22)]"
              : "border-white/10"
          }`}>
            <div className="absolute left-1/2 top-2 h-12 w-[2px] -translate-x-1/2 bg-white/10" />
            <div
              className={`absolute left-1/2 h-6 w-6 -translate-x-1/2 rounded-xl border border-white/15 bg-gradient-to-b from-zinc-300 to-zinc-600 shadow-[0_8px_18px_rgba(0,0,0,0.45)] transition-all duration-700 ease-in-out ${
                isAutoRunning ? "top-10" : "top-2"
              }`}
            />
          </div>
        </div>

        {/* status lights */}
        <div className={`grid grid-cols-2 gap-1 pt-1 transition-opacity duration-300 ${
          isAutoRunning || takeBusy ? "opacity-100" : "opacity-70"
        }`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`h-[4px] w-[4px] rounded-full ${
                i < 2
                  ? takeBusy
                    ? "bg-red-200 animate-pulse shadow-[0_0_14px_rgba(252,165,165,0.95)]"
                    : "bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.8)]"
                  : i < 4
                  ? isAutoRunning
                    ? "bg-emerald-200 animate-pulse shadow-[0_0_14px_rgba(110,231,183,0.95)]"
                    : "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]"
                  : "bg-violet-200/70"
              }`}
            />
          ))}
        </div>

        <div className="pt-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/32 [writing-mode:vertical-rl]">
          Split
        </div>
      </div>
    </div>
  </div>
</div>
          <div className="relative min-w-0 rounded-[28px] border border-red-300/18 bg-[linear-gradient(180deg,rgba(25,9,12,0.98),rgba(6,3,5,0.99))] p-2 xl:p-2.5 shadow-[0_22px_80px_rgba(0,0,0,0.54),inset_0_1px_0_rgba(255,255,255,0.06)] before:pointer-events-none before:absolute before:inset-x-8 before:-bottom-2 before:h-2 before:rounded-b-[22px] before:bg-black/50 before:blur-sm">
            <MonitorHeader
              title="Program"
              subtitle="What the audience is seeing"
              tone="program"
              badge={
                <span className="inline-flex items-center gap-2 rounded-full border border-red-300/25 bg-red-500/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.18)]">
                  <span className={`h-2 w-2 rounded-full ${
                    programState?.is_live
                      ? "bg-red-400 animate-pulse shadow-[0_0_12px_rgba(248,113,113,0.95)]"
                      : "bg-white/35"
                  }`} />
                  {programState?.is_live ? "LIVE" : "HOLDING"}
                </span>
              }
            />

            <div
              className={`relative aspect-video w-full overflow-hidden rounded-[18px] border bg-black transition-all duration-300 ${
                isTransitioning
                  ? "rounded-[22px] border-white/40 shadow-[0_0_0_1px_rgba(255,255,255,0.22),0_0_95px_rgba(255,255,255,0.16),0_28px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "rounded-[22px] border-red-300/18 shadow-[0_0_0_1px_rgba(248,113,113,0.10),0_0_76px_rgba(239,68,68,0.14),0_28px_90px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.9)]"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(118deg,transparent_4%,rgba(255,255,255,0.12)_18%,rgba(255,255,255,0.035)_28%,transparent_43%)] opacity-60" />
              <div className="pointer-events-none absolute inset-x-8 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
              <div className="pointer-events-none absolute inset-0 z-10 rounded-[22px] shadow-[inset_0_0_50px_rgba(0,0,0,0.74),inset_0_0_0_1px_rgba(255,255,255,0.035)]" />
              {isTransitioning ? (
                <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-white/[0.035] backdrop-blur-[1px]">
                  <div className="rounded-full border border-white/35 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-[0.32em] text-black shadow-[0_0_80px_rgba(255,255,255,0.55)] animate-pulse">
                    {lastTakeMode === "auto" ? "Auto Dissolve" : "Live Cut"}
                  </div>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />

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

              <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full border border-red-300/25 bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-red-100 shadow-[0_0_34px_rgba(239,68,68,0.18)] backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span
                    className={`absolute inset-0 rounded-full ${
                      programState?.is_live ? "animate-ping bg-red-400/50" : "bg-transparent"
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

                {programState?.is_live ? "LIVE" : "PGM HOLD"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 opacity-65 transition-opacity duration-300 hover:opacity-100 xl:grid-cols-[1.2fr_0.8fr]">
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