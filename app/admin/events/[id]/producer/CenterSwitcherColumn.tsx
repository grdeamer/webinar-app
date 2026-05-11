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

type ScreenLayoutPreset = "classic" | "brand" | "speaker_focus" | "fullscreen"

type ConfidenceMonitorMode = "standard" | "confidence" | "multiview"

const CONFIDENCE_MONITOR_MODES: Array<{
  value: ConfidenceMonitorMode
  label: string
  description: string
}> = [
  {
    value: "standard",
    label: "Standard",
    description: "Preview and Program",
  },
  {
    value: "confidence",
    label: "Confidence",
    description: "Presenter-safe output",
  },
  {
    value: "multiview",
    label: "Multiview",
    description: "Operator grid awareness",
  },
]


function MultiviewOverlay({
  label,
}: {
  label: string
}): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[22px]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:25%_25%] opacity-40" />

      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-white/6">
        {[
          "Program",
          "Preview",
          "Confidence",
          "Telemetry",
        ].map((cell) => (
          <div
            key={cell}
            className="relative overflow-hidden bg-black/18"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.08),transparent_48%)]" />

            <div className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/46 backdrop-blur-sm">
              {cell}
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-20 rounded-xl border border-white/8 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 right-3 rounded-full border border-violet-300/20 bg-black/65 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-violet-100/72 shadow-[0_0_20px_rgba(168,85,247,0.12)] backdrop-blur-md">
        {label}
      </div>
    </div>
  )
}

function PresenterConfidenceCue({
  variant,
}: {
  variant: "preview" | "program"
}): JSX.Element {
  const isProgram = variant === "program"

  const [countdownSeconds, setCountdownSeconds] = useState(5)

  useEffect(() => {
    if (isProgram) {
      setCountdownSeconds(0)
      return
    }

    setCountdownSeconds(5)

    const id = window.setInterval(() => {
      setCountdownSeconds((value) => Math.max(0, value - 1))
    }, 1000)

    return () => window.clearInterval(id)
  }, [isProgram])

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[22px]">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-violet-950/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-violet-300/20 bg-black/62 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/78 shadow-[0_0_24px_rgba(168,85,247,0.12)] backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.75)]" />
        Presenter Confidence
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/70 shadow-[0_0_20px_rgba(52,211,153,0.1)] backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.75)]" />
        Return Feed Safe
      </div>

      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-[28px] border border-white/10 bg-black/50 px-6 py-4 text-center shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
        <div className="text-[9px] font-black uppercase tracking-[0.24em] text-white/36">
          {isProgram ? "Audience Feed" : "Standby Countdown"}
        </div>

        <div className="mt-1 text-4xl font-black tracking-[-0.06em] text-white tabular-nums drop-shadow-[0_0_22px_rgba(196,181,253,0.22)]">
          {isProgram ? "LIVE" : countdownSeconds}
        </div>

        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/62">
          {isProgram
            ? "You are on program"
            : countdownSeconds === 0
              ? "Ready for cue"
              : "Prepare to go live"}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 grid gap-2 md:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-white/10 bg-black/62 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/34">
            Presenter Cue
          </div>
          <div className="mt-1 text-sm font-semibold text-white/86">
            {isProgram
              ? "You are live to audience"
              : countdownSeconds === 0
                ? "Ready for producer cue"
                : "Stand by for program"}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-violet-300/16 bg-violet-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/70 shadow-[0_0_20px_rgba(168,85,247,0.1)] backdrop-blur-md">
          <span className="text-white/36">IFB</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.75)]" />
          Open
        </div>
      </div>
    </div>
  )
}

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
  screenLayoutPreset,
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
  selectedSceneId,
  selectedSceneLabel,
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
  screenLayoutPreset: ScreenLayoutPreset
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
  selectedSceneId: string | null
  selectedSceneLabel: string | null
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
  const [takeFlashVisible, setTakeFlashVisible] = useState(false)
  const [confidenceMonitorMode, setConfidenceMonitorMode] =
    useState<ConfidenceMonitorMode>("standard")

  useEffect(() => {
    const storedValue = window.localStorage.getItem("producer-preview-pane-percent")
    const parsedValue = storedValue ? Number(storedValue) : NaN

    if (Number.isFinite(parsedValue)) {
      setPreviewPanePercent(Math.max(32, Math.min(68, parsedValue)))
    }
  }, [])

  useEffect(() => {
    const storedValue = window.localStorage.getItem("producer-confidence-monitor-mode")

    if (
      storedValue === "standard" ||
      storedValue === "confidence" ||
      storedValue === "multiview"
    ) {
      setConfidenceMonitorMode(storedValue)
    }
  }, [])

  useEffect(() => {
    if (!isTransitioning) return

    setTakeFlashVisible(true)

    const id = window.setTimeout(() => {
      setTakeFlashVisible(false)
    }, 620)

    return () => window.clearTimeout(id)
  }, [isTransitioning, lastTakeMode])

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

  function setMonitorMode(value: ConfidenceMonitorMode) {
    setConfidenceMonitorMode(value)
    window.localStorage.setItem("producer-confidence-monitor-mode", value)
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

      <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(35,46,92,0.28),transparent_42%),linear-gradient(180deg,rgba(5,10,24,0.98),rgba(2,4,12,0.995))] p-2.5 xl:p-3 2xl:p-3.5 shadow-[0_34px_120px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="mb-2.5 flex items-end justify-between gap-4 px-1">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/32">
              Switcher Surface
            </div>
            <div className="mt-1 text-lg font-semibold tracking-tight text-white">
              Preview <span className="text-white/28">→</span> Program
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white/35 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.7)]" />
              Control online
            </div>

            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              {CONFIDENCE_MONITOR_MODES.map((mode) => {
                const active = confidenceMonitorMode === mode.value

                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setMonitorMode(mode.value)}
                    className={[
                      "rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] transition",
                      active
                        ? "bg-violet-300/14 text-violet-100 shadow-[0_0_14px_rgba(168,85,247,0.14)]"
                        : "text-white/34 hover:bg-white/[0.055] hover:text-white/68",
                    ].join(" ")}
                    title={mode.description}
                  >
                    {mode.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div
          ref={switcherGridRef}
          className="grid gap-0"
          style={{
            gridTemplateColumns: `minmax(0, ${previewPanePercent}fr) 56px minmax(0, ${100 - previewPanePercent}fr)`,
          }}
        >
          <div className="relative min-w-0 rounded-[28px] border border-sky-300/14 bg-[linear-gradient(180deg,rgba(5,14,27,0.99),rgba(1,5,12,0.99))] p-2 xl:p-2.5 shadow-[0_24px_82px_rgba(0,0,0,0.54),inset_0_1px_0_rgba(255,255,255,0.055)] before:pointer-events-none before:absolute before:inset-x-8 before:-bottom-2 before:h-2 before:rounded-b-[22px] before:bg-black/50 before:blur-sm">
            <MonitorHeader
              title="Preview"
              subtitle="What you are preparing"
              tone="preview"
              badge={
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] shadow-[0_0_22px_rgba(56,189,248,0.14)] ${
                  previewProgramDifferent
                    ? "border-amber-300/35 bg-amber-400/14 text-amber-100 shadow-[0_0_26px_rgba(251,191,36,0.16)]"
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
              className={`relative aspect-video w-full overflow-hidden rounded-[24px] border bg-[radial-gradient(circle_at_50%_42%,rgba(15,23,42,0.92)_0%,rgba(2,6,23,0.98)_58%,#000_100%)] transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:z-[9] before:rounded-[24px] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.075),transparent_13%,transparent_72%,rgba(255,255,255,0.035)),radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.12),transparent_38%)] before:opacity-80 after:pointer-events-none after:absolute after:inset-0 after:z-[11] after:rounded-[24px] after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.075),transparent)] after:translate-x-[-115%] after:animate-[monitor-sheen_6s_ease-in-out_infinite] ${
                previewProgramDifferent
                  ? "border-amber-200/36 shadow-[0_0_0_1px_rgba(251,191,36,0.16),0_0_72px_rgba(251,191,36,0.18),0_34px_105px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(0,0,0,0.95)]"
                  : "border-sky-200/20 shadow-[0_0_0_1px_rgba(125,211,252,0.10),0_0_52px_rgba(56,189,248,0.10),0_30px_96px_rgba(0,0,0,0.74),inset_0_1px_0_rgba(255,255,255,0.075),inset_0_-1px_0_rgba(0,0,0,0.95)]"
              }`}
              onMouseMove={onPreviewCanvasMouseMove}
              onMouseUp={stopDraggingBlock}
              onMouseLeave={stopDraggingBlock}
              onClick={onClearSelectedBlock}
            >
              <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(118deg,transparent_4%,rgba(255,255,255,0.14)_18%,rgba(255,255,255,0.04)_29%,transparent_45%)] opacity-70" />
              <div className="pointer-events-none absolute inset-x-8 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              <div className="pointer-events-none absolute inset-0 z-10 rounded-[24px] shadow-[inset_0_0_58px_rgba(0,0,0,0.78),inset_0_0_0_1px_rgba(255,255,255,0.045)]" />
              <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.055] [background:repeating-linear-gradient(0deg,rgba(255,255,255,0.9)_0px,rgba(255,255,255,0.9)_1px,transparent_1px,transparent_4px)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />
              <div className="pointer-events-none absolute right-3 top-3 z-30 rounded-full border border-white/10 bg-black/58 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md">
                Source Preview
              </div>

              {previewProgramDifferent ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-[linear-gradient(90deg,rgba(251,191,36,0.92),rgba(254,240,138,0.95),rgba(251,191,36,0.92))] px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.26em] text-black shadow-[0_0_34px_rgba(251,191,36,0.28)]">
                  Preview Armed For Take
                </div>
              ) : null}

              <StageVideoPreview
                stageState={stageState}
                participantIds={onStageParticipants.map((p) => p.identity)}
                screenLayoutPreset={screenLayoutPreset}
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
              {confidenceMonitorMode === "confidence" ? (
                <PresenterConfidenceCue variant="preview" />
              ) : null}

              {confidenceMonitorMode === "multiview" ? (
                <MultiviewOverlay label="Preview Multiview" />
              ) : null}
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
            <div className="absolute inset-y-4 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-violet-200/14 via-violet-300/30 to-violet-200/14 transition-all duration-300 group-hover:w-[4px] group-hover:from-violet-100/55 group-hover:via-violet-200/80 group-hover:to-violet-100/55 group-hover:shadow-[0_0_22px_rgba(196,181,253,0.42)]" />

            {/* glow field */}
            <div className="absolute inset-y-0 left-1/2 w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-500/8 to-transparent blur-md" />

            <div className="relative z-20 flex h-full items-center">
              <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.055),transparent_28%),linear-gradient(180deg,rgba(18,18,30,0.98),rgba(5,6,12,0.995))] px-2.5 py-3 shadow-[0_30px_110px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.055),inset_0_-1px_0_rgba(0,0,0,0.7)] backdrop-blur-xl">
                <div className="flex flex-col items-center gap-3">

                  {/* CUT */}
                  <button
                    type="button"
                    onClick={() => onTake("cut")}
                    disabled={takeBusy || !previewProgramDifferent}
                    className={`relative h-13 w-13 rounded-2xl border text-[10px] font-black tracking-[0.18em] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
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
                    className={`relative h-15 w-15 rounded-2xl border text-[10px] font-black tracking-[0.18em] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
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
          <div className="relative min-w-0 rounded-[28px] border border-red-300/18 bg-[linear-gradient(180deg,rgba(20,7,10,0.99),rgba(4,2,4,0.995))] p-2 xl:p-2.5 shadow-[0_26px_90px_rgba(0,0,0,0.6),0_0_70px_rgba(239,68,68,0.08),inset_0_1px_0_rgba(255,255,255,0.055)] before:pointer-events-none before:absolute before:inset-x-8 before:-bottom-2 before:h-2 before:rounded-b-[22px] before:bg-black/55 before:blur-sm">
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
              className={`relative aspect-video w-full overflow-hidden rounded-[24px] border bg-[radial-gradient(circle_at_50%_44%,rgba(12,5,8,0.98)_0%,rgba(3,1,3,0.995)_62%,#000_100%)] transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:z-[9] before:rounded-[24px] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_14%,transparent_72%,rgba(255,255,255,0.035)),radial-gradient(circle_at_50%_0%,rgba(248,113,113,0.16),transparent_42%)] before:opacity-85 after:pointer-events-none after:absolute after:inset-0 after:z-[11] after:rounded-[24px] after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.075),transparent)] after:translate-x-[-115%] after:animate-[monitor-sheen_7s_ease-in-out_infinite] ${
                isTransitioning
                  ? "border-white/42 shadow-[0_0_0_1px_rgba(255,255,255,0.24),0_0_105px_rgba(255,255,255,0.18),0_34px_105px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.10)]"
                  : "border-red-200/22 shadow-[0_0_0_1px_rgba(248,113,113,0.12),0_0_78px_rgba(239,68,68,0.16),0_34px_105px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.075),inset_0_-1px_0_rgba(0,0,0,0.95)]"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(118deg,transparent_4%,rgba(255,255,255,0.15)_18%,rgba(255,255,255,0.04)_29%,transparent_45%)] opacity-70" />
              <div className="pointer-events-none absolute inset-x-8 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              <div className="pointer-events-none absolute inset-0 z-10 rounded-[24px] shadow-[inset_0_0_62px_rgba(0,0,0,0.80),inset_0_0_0_1px_rgba(255,255,255,0.045)]" />
              <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.055] [background:repeating-linear-gradient(0deg,rgba(255,255,255,0.9)_0px,rgba(255,255,255,0.9)_1px,transparent_1px,transparent_4px)]" />
              {takeFlashVisible ? (
                <div className="pointer-events-none absolute inset-0 z-[70] bg-white/70 mix-blend-screen animate-pulse" />
              ) : null}

              {isTransitioning ? (
                <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-white/[0.035] backdrop-blur-[1px]">
                  <div className="relative overflow-hidden rounded-full border border-white/35 bg-white px-7 py-3 text-[10px] font-black uppercase tracking-[0.34em] text-black shadow-[0_0_95px_rgba(255,255,255,0.62),0_0_34px_rgba(248,113,113,0.22)] animate-pulse">
                    <span className="absolute inset-y-0 left-0 w-1/3 translate-x-[-120%] bg-gradient-to-r from-transparent via-black/10 to-transparent animate-[take-label-sheen_900ms_ease-out_infinite]" />
                    <span className="relative">
                      {lastTakeMode === "auto" ? "Auto Dissolve" : "Live Cut"}
                    </span>
                  </div>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />

              <div className="relative z-10 h-full">
                {!programState?.stage_participant_ids?.length && !programBlocks.some((block) => !block.hidden) ? (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(248,113,113,0.08),transparent_48%)]">
                    <div className="rounded-[26px] border border-red-200/18 bg-black/58 px-5 py-4 text-center shadow-[0_24px_80px_rgba(0,0,0,0.42),0_0_34px_rgba(248,113,113,0.12),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md">
                      <div className="text-[9px] font-black uppercase tracking-[0.28em] text-red-100/58">
                        No Program Source
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white/72">
                        Take a preview source to Program
                      </div>
                    </div>
                  </div>
                ) : null}

                <StageVideoPreview
                  stageState={programState}
                  participantIds={programState?.stage_participant_ids || []}
                  screenLayoutPreset={screenLayoutPreset}
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
                    screenLayoutPreset={screenLayoutPreset}
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

              <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full border border-red-200/32 bg-black/78 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-red-50 shadow-[0_0_44px_rgba(239,68,68,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
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
              {confidenceMonitorMode === "confidence" ? (
                <PresenterConfidenceCue variant="program" />
              ) : null}

              {confidenceMonitorMode === "multiview" ? (
                <MultiviewOverlay label="Operator Multiview" />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes take-label-sheen {
          0% {
            transform: translateX(-120%);
            opacity: 0;
          }
          25% {
            opacity: 0.7;
          }
          100% {
            transform: translateX(320%);
            opacity: 0;
          }
        }
      `}</style>
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
          selectedSceneId={selectedSceneId}
          selectedSceneLabel={selectedSceneLabel}
          onApplyScene={onApplyScene}
          onClearScreenShare={onClearScreenShare}
          onUnpin={onUnpin}
          onClearPrimary={onClearPrimary}
        />
      </div>
    </div>
  )
}
