import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import AudienceOriginCue from "@/components/live/AudienceOriginCue";
import StageVideoPreview from "./StageVideoPreview";
import type { PreviewBlock } from "./useProducerBlocks";
import MonitorHeader from "./MonitorHeader";
import AudienceOriginTestPanel from "./AudienceOriginTestPanel";
import MediaBlocksPanel from "./MediaBlocksPanel";
import ScenesStatusPanel from "./ScenesStatusPanel";
import type { ProducerParticipant, StageState } from "./producerRoomTypes";
import { renderPlacedBlocks } from "./producerRoomBlockHelpers";
import ProducerTopDeck from "./ProducerTopDeck";

type ScreenLayoutPreset = "classic" | "brand" | "speaker_focus" | "fullscreen";

type ConfidenceMonitorMode = "standard" | "confidence" | "multiview";

const CONFIDENCE_MONITOR_MODES: Array<{
  value: ConfidenceMonitorMode;
  label: string;
  description: string;
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
];

function SwitcherSurfaceChrome({
  armed,
  live,
  children,
}: {
  armed: boolean;
  live: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border p-2 shadow-[0_22px_72px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.035)] transition-all duration-700 xl:p-2.5 ${
        live
          ? "border-red-300/10 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.075),transparent_42%),linear-gradient(180deg,rgba(7,8,18,0.99),rgba(2,4,12,0.995))]"
          : armed
            ? "border-amber-300/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.055),transparent_42%),linear-gradient(180deg,rgba(5,10,24,0.985),rgba(2,4,12,0.995))]"
            : "border-white/7 bg-[linear-gradient(180deg,rgba(5,10,24,0.985),rgba(2,4,12,0.995))]"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.01)_42%,transparent_64%)] animate-[switcherSurfaceSweep_16s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_1px,transparent_1px,transparent_10px)]" />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_0_36px_rgba(0,0,0,0.22)]" />

      {armed ? (
        <div className="pointer-events-none absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-200/16 to-transparent animate-[switcherArmedRail_4s_ease-in-out_infinite]" />
      ) : null}

      {live ? (
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-red-200/20 to-transparent animate-[switcherLiveRail_4s_ease-in-out_infinite]" />
      ) : null}

      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function MultiviewOverlay({ label }: { label: string }): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[22px]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:25%_25%] opacity-40" />

      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-white/6">
        {["Program", "Preview", "Confidence", "Telemetry"].map((cell) => (
          <div key={cell} className="relative overflow-hidden bg-black/18">
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
  );
}

function PresenterConfidenceCue({
  variant,
}: {
  variant: "preview" | "program";
}): JSX.Element {
  const isProgram = variant === "program";

  const [countdownSeconds, setCountdownSeconds] = useState(5);

  useEffect(() => {
    if (isProgram) {
      setCountdownSeconds(0);
      return;
    }

    setCountdownSeconds(5);

    const id = window.setInterval(() => {
      setCountdownSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [isProgram]);

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
  );
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
  audienceOriginCollapsed,
  onToggleAudienceOriginCollapsed,
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
    region?: string;
    moonMode?: boolean;
    questionLabel?: string;
    durationMs?: number;
  }) => void;
  onHideAudienceCue: () => void;
  previewProgramDifferent: boolean;
  takeBusy: boolean;
  lastTakeMode: "cut" | "auto";
  onTake: (mode: "cut" | "auto") => void;
  onPreviewCanvasMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  stopDraggingBlock: () => void;
  onClearSelectedBlock: () => void;
  stageState: StageState | null;
  onStageParticipants: ProducerParticipant[];
  previewBlocks: PreviewBlock[];
  selectedBlockId: string | null;
  setSelectedBlockId: (value: string | null) => void;
  startDraggingBlock: (
    e: React.MouseEvent<HTMLDivElement>,
    blockId: string,
  ) => void;
  startResizingBlock: (
    e: React.MouseEvent<HTMLDivElement>,
    blockId: string,
  ) => void;
  programState: StageState | null;
  programBlocks: PreviewBlock[];
  screenLayoutPreset: ScreenLayoutPreset;
  showAudienceCue: boolean;
  audienceCueRegion: string;
  audienceCueMoonMode: boolean;
  audienceCueQuestionLabel: string;
  audienceOriginCollapsed: boolean;
  onToggleAudienceOriginCollapsed: () => void;
  isTransitioning: boolean;
  transitionFromState: StageState | null;
  transitionFromBlocks: PreviewBlock[];
  transitionFadingOut: boolean;
  sceneName: string;
  onSceneNameChange: (value: string) => void;
  onSaveScene: () => void;
  sceneBusy: boolean;
  scenes: Array<{ id: string; name: string }>;
  selectedSceneId: string | null;
  selectedSceneLabel: string | null;
  onApplyScene: (sceneId: string) => void;
  onClearScreenShare: () => void;
  onUnpin: () => void;
  onClearPrimary: () => void;
  addTestTextBlock: () => void;
  addTestVideoBlock: () => void;
  addTestPdfBlock: () => void;
  addTestImageBlock: () => void;
  onUploadPdf: () => void;
  onUploadVideo: () => void;
  onUploadImage: () => void;
  duplicateSelectedBlock: () => void;
  bringSelectedBlockToFront: () => void;
  deleteSelectedBlock: () => void;
}): JSX.Element {
  const switcherGridRef = useRef<HTMLDivElement | null>(null);
  const isDraggingSplitRef = useRef(false);
  const [previewPanePercent, setPreviewPanePercent] = useState(50);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [takeFlashVisible, setTakeFlashVisible] = useState(false);
  const [confidenceMonitorMode, setConfidenceMonitorMode] =
    useState<ConfidenceMonitorMode>("standard");

  useEffect(() => {
    const storedValue = window.localStorage.getItem(
      "producer-preview-pane-percent",
    );
    const parsedValue = storedValue ? Number(storedValue) : NaN;

    if (Number.isFinite(parsedValue)) {
      setPreviewPanePercent(Math.max(32, Math.min(68, parsedValue)));
    }
  }, []);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(
      "producer-confidence-monitor-mode",
    );

    if (
      storedValue === "standard" ||
      storedValue === "confidence" ||
      storedValue === "multiview"
    ) {
      setConfidenceMonitorMode(storedValue);
    }
  }, []);

  useEffect(() => {
    if (!isTransitioning) return;

    setTakeFlashVisible(true);

    const id = window.setTimeout(() => {
      setTakeFlashVisible(false);
    }, 620);

    return () => window.clearTimeout(id);
  }, [isTransitioning, lastTakeMode]);

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      if (!isDraggingSplitRef.current) return;

      const rect = switcherGridRef.current?.getBoundingClientRect();
      if (!rect) return;

      const nextPercent = ((event.clientX - rect.left) / rect.width) * 100;
      const clampedPercent = Math.max(32, Math.min(68, nextPercent));

      setPreviewPanePercent(clampedPercent);
      window.localStorage.setItem(
        "producer-preview-pane-percent",
        String(Math.round(clampedPercent)),
      );
    }

    function onMouseUp() {
      isDraggingSplitRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function startSplitDrag() {
    isDraggingSplitRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function resetSplit() {
    setPreviewPanePercent(50);
    window.localStorage.setItem("producer-preview-pane-percent", "50");
  }

  function setMonitorMode(value: ConfidenceMonitorMode) {
    setConfidenceMonitorMode(value);
    window.localStorage.setItem("producer-confidence-monitor-mode", value);
  }

  function runAutoTransition() {
    if (takeBusy || isAutoRunning || !previewProgramDifferent) return;

    setIsAutoRunning(true);

    window.setTimeout(() => {
      onTake("auto");
    }, 260);

    window.setTimeout(() => {
      setIsAutoRunning(false);
    }, 760);
  }

  return (
    <div className="space-y-2 xl:col-start-2">
      <ProducerTopDeck />
      <div
        className={`overflow-hidden rounded-[18px] border border-white/6 bg-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.016)] transition-all duration-300 ${
          audienceOriginCollapsed
            ? "opacity-35 hover:opacity-70"
            : "opacity-50 hover:opacity-90"
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-3 py-1.5">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/24">
              Audience Origin
            </div>
            <div className="mt-0.5 text-xs font-semibold text-white/30">
              Earth / Moon cue controls
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleAudienceOriginCollapsed}
            className="rounded-full border border-white/8 bg-white/[0.022] px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/38 transition hover:border-white/14 hover:bg-white/[0.04] hover:text-white/64"
          >
            {audienceOriginCollapsed ? "Show" : "Hide"}
          </button>
        </div>

        {audienceOriginCollapsed ? null : (
          <div className="border-t border-white/5 px-2 pb-2">
            <AudienceOriginTestPanel
              onTriggerCue={triggerAudienceCue}
              onHideCue={onHideAudienceCue}
            />
          </div>
        )}
      </div>

      <SwitcherSurfaceChrome
        armed={previewProgramDifferent}
        live={Boolean(programState?.is_live)}
      >
        <div className="relative mb-2 flex items-end justify-between gap-4 px-1 py-1">
          <div className="relative z-10">
            <div className="text-[9px] font-black uppercase tracking-[0.10em] text-white/18">
              Switcher
            </div>
            <div className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-white/66">
              Preview <span className="text-white/20">→</span> Program
            </div>
          </div>

          <div className="relative z-10 hidden items-center gap-2 xl:flex">
            <div className="flex items-center gap-1 rounded-full border border-white/6 bg-black/12 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
              {CONFIDENCE_MONITOR_MODES.map((mode) => {
                const active = confidenceMonitorMode === mode.value;

                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setMonitorMode(mode.value)}
                    className={[
                      "rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.10em] transition",
                      active
                        ? "bg-white/[0.05] text-white/62 shadow-[0_0_6px_rgba(255,255,255,0.03)]"
                        : "text-white/24 hover:bg-white/[0.03] hover:text-white/50",
                    ].join(" ")}
                    title={mode.description}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          ref={switcherGridRef}
          className="relative grid gap-0"
          style={{
            gridTemplateColumns: `minmax(0, ${previewPanePercent}fr) 56px minmax(0, ${100 - previewPanePercent}fr)`,
          }}
        >
          <div className="pointer-events-none absolute inset-y-3 left-1/2 z-20 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/8 to-transparent" />
          <div className="relative min-w-0 rounded-[22px] border border-sky-300/8 bg-[linear-gradient(180deg,rgba(5,14,27,0.99),rgba(1,5,12,0.99))] p-1.5 shadow-[0_18px_54px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.035)] xl:p-2">
            <MonitorHeader
              title="Preview"
              subtitle="What you are preparing"
              tone="preview"
              badge={
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] ${
                    previewProgramDifferent
                      ? "border-amber-300/14 bg-amber-400/[0.05] text-amber-100/50"
                      : "border-sky-300/10 bg-sky-400/[0.04] text-sky-100/42"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      previewProgramDifferent
                        ? "bg-amber-300/75 shadow-[0_0_5px_rgba(252,211,77,0.28)]"
                        : "bg-sky-300/70 shadow-[0_0_5px_rgba(125,211,252,0.22)]"
                    }`}
                  />
                  {previewProgramDifferent ? "Ready" : "Matched"}
                </span>
              }
            />

            <div
              className={`relative aspect-video w-full overflow-hidden rounded-[20px] border bg-[radial-gradient(circle_at_50%_42%,rgba(15,23,42,0.92)_0%,rgba(2,6,23,0.98)_58%,#000_100%)] transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:z-[9] before:rounded-[20px] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent_13%,transparent_72%,rgba(255,255,255,0.014)),radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.055),transparent_38%)] before:opacity-65 ${
                previewProgramDifferent
                  ? "border-amber-200/20 shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_0_28px_rgba(251,191,36,0.08),0_22px_64px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.055)]"
                  : "border-sky-200/14 shadow-[0_0_0_1px_rgba(125,211,252,0.055),0_0_24px_rgba(56,189,248,0.055),0_22px_64px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.045)]"
              }`}
              onMouseMove={onPreviewCanvasMouseMove}
              onMouseUp={stopDraggingBlock}
              onMouseLeave={stopDraggingBlock}
              onClick={onClearSelectedBlock}
            >
              <div className="pointer-events-none absolute inset-0 z-10 rounded-[20px] shadow-[inset_0_0_34px_rgba(0,0,0,0.58),inset_0_0_0_1px_rgba(255,255,255,0.025)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />
              <div className="pointer-events-none absolute right-3 top-3 z-30 hidden rounded-full border border-white/8 bg-black/32 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] backdrop-blur-md 2xl:block">
                Source
              </div>

              {previewProgramDifferent ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-amber-300/72 px-3 py-1 text-center text-[9px] font-black uppercase tracking-[0.08em] text-black/74 shadow-[0_0_8px_rgba(251,191,36,0.08)]">
                  Preview Ready
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

              <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full border border-sky-300/10 bg-black/28 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-sky-100/48 backdrop-blur-md">
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
            <div className="pointer-events-none absolute inset-y-6 left-1/2 w-8 -translate-x-1/2 rounded-full bg-white/[0.018] blur-md opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
            {/* center rail */}
            <div className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 rounded-full bg-gradient-to-b from-white/6 via-white/14 to-white/6 transition-all duration-300 group-hover:via-white/28" />

            {/* glow field */}
            <div className="absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.018] to-transparent blur-md" />

            <div className="relative z-20 flex h-full items-center">
              <div className="relative overflow-hidden rounded-[22px] border border-white/7 bg-[linear-gradient(180deg,rgba(18,18,30,0.88),rgba(5,6,12,0.96))] px-2 py-2.5 shadow-[0_16px_44px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.028)] backdrop-blur-md">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.014)_42%,transparent_64%)] animate-[switcherRailSweep_14s_ease-in-out_infinite]" />
                <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  {/* CUT */}
                  <button
                    type="button"
                    onClick={() => onTake("cut")}
                    disabled={takeBusy || !previewProgramDifferent}
                    className={`relative h-12 w-12 rounded-2xl border text-[10px] font-black tracking-[0.14em] transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
                      previewProgramDifferent
                        ? "border-red-300/22 bg-red-500/[0.10] text-red-100/72 shadow-[0_0_12px_rgba(239,68,68,0.12)]"
                        : "border-red-400/12 bg-red-500/[0.055] text-red-200/48 shadow-[0_0_8px_rgba(239,68,68,0.06)]"
                    }`}
                  >
                    <span className="absolute inset-x-2 top-1 h-[1px] bg-white/20" />
                    {takeBusy ? "TAKING" : "CUT"}
                  </button>

                  {/* AUTO */}
                  <button
                    type="button"
                    onClick={runAutoTransition}
                    disabled={
                      takeBusy || isAutoRunning || !previewProgramDifferent
                    }
                    className={`relative h-14 w-14 rounded-2xl border text-[10px] font-black tracking-[0.14em] transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
                      isAutoRunning
                        ? "border-emerald-200/32 bg-emerald-400/[0.13] text-emerald-50/80 shadow-[0_0_16px_rgba(52,211,153,0.16)]"
                        : previewProgramDifferent
                          ? "border-emerald-300/20 bg-emerald-500/[0.085] text-emerald-100/70 shadow-[0_0_10px_rgba(52,211,153,0.10)]"
                          : "border-emerald-400/12 bg-emerald-500/[0.055] text-emerald-200/48 shadow-[0_0_8px_rgba(52,211,153,0.06)]"
                    }`}
                  >
                    <span className="absolute inset-x-2 top-1 h-[1px] bg-white/20" />
                    {isAutoRunning ? "RUN" : "AUTO"}
                  </button>

                  {/* T-Bar */}
                  <div className="w-full px-1 pt-1">
                    <div className="mb-1 text-center text-[8px] font-black tracking-[0.12em] text-white/22">
                      T-BAR
                    </div>

                    <div
                      className={`relative mx-auto h-14 w-2.5 rounded-full border bg-black/24 transition-all duration-300 ${
                        isAutoRunning
                          ? "border-emerald-300/20 shadow-[0_0_8px_rgba(52,211,153,0.10)]"
                          : "border-white/7"
                      }`}
                    >
                      <div className="absolute left-1/2 top-2 h-12 w-[2px] -translate-x-1/2 bg-white/10" />
                      <div
                        className={`absolute left-1/2 h-5 w-5 -translate-x-1/2 rounded-lg border border-white/10 bg-gradient-to-b from-zinc-300/80 to-zinc-700/90 shadow-[0_6px_12px_rgba(0,0,0,0.34)] transition-all duration-700 ease-in-out ${
                          isAutoRunning ? "top-9" : "top-2"
                        }`}
                      />
                    </div>
                  </div>

                  {/* status lights */}
                  <div
                    className={`grid grid-cols-2 gap-1 pt-1 transition-opacity duration-300 ${
                      isAutoRunning || takeBusy ? "opacity-72" : "opacity-38"
                    }`}
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-[4px] w-[4px] rounded-full ${
                          i < 2
                            ? takeBusy
                              ? "bg-red-200/75 shadow-[0_0_5px_rgba(252,165,165,0.28)]"
                              : "bg-red-300/62 shadow-[0_0_4px_rgba(252,165,165,0.18)]"
                            : i < 4
                              ? isAutoRunning
                                ? "bg-emerald-200/75 shadow-[0_0_5px_rgba(110,231,183,0.28)]"
                                : "bg-emerald-300/62 shadow-[0_0_4px_rgba(110,231,183,0.18)]"
                              : "bg-violet-200/70"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="pt-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/22 [writing-mode:vertical-rl]">
                    Split
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative min-w-0 rounded-[22px] border border-red-300/10 bg-[linear-gradient(180deg,rgba(20,7,10,0.99),rgba(4,2,4,0.995))] p-1.5 shadow-[0_18px_54px_rgba(0,0,0,0.42),0_0_24px_rgba(239,68,68,0.045),inset_0_1px_0_rgba(255,255,255,0.035)] xl:p-2">
            <MonitorHeader
              title="Program"
              subtitle="What the audience is seeing"
              tone="program"
              badge={
                <span className="inline-flex items-center gap-2 rounded-full border border-red-300/12 bg-red-500/[0.05] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-red-100/54">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      programState?.is_live
                        ? "bg-red-400/80 shadow-[0_0_5px_rgba(248,113,113,0.32)]"
                        : "bg-white/25"
                    }`}
                  />
                  {programState?.is_live ? "Live" : "Hold"}
                </span>
              }
            />

            <div
              className={`relative aspect-video w-full overflow-hidden rounded-[20px] border bg-[radial-gradient(circle_at_50%_44%,rgba(12,5,8,0.98)_0%,rgba(3,1,3,0.995)_62%,#000_100%)] transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:z-[9] before:rounded-[20px] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.038),transparent_14%,transparent_72%,rgba(255,255,255,0.014)),radial-gradient(circle_at_50%_0%,rgba(248,113,113,0.065),transparent_42%)] before:opacity-68 ${
                isTransitioning
                  ? "border-white/26 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_42px_rgba(255,255,255,0.08),0_22px_64px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "border-red-200/16 shadow-[0_0_0_1px_rgba(248,113,113,0.07),0_0_30px_rgba(239,68,68,0.075),0_22px_64px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.045)]"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 z-10 rounded-[20px] shadow-[inset_0_0_36px_rgba(0,0,0,0.60),inset_0_0_0_1px_rgba(255,255,255,0.025)]" />
              {takeFlashVisible ? (
                <div className="pointer-events-none absolute inset-0 z-[70] bg-white/38 mix-blend-screen animate-pulse" />
              ) : null}

              {isTransitioning ? (
                <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-white/[0.035] backdrop-blur-[1px]">
                  <div className="relative overflow-hidden rounded-full border border-white/18 bg-white/88 px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-black/76 shadow-[0_0_20px_rgba(255,255,255,0.16),0_0_10px_rgba(248,113,113,0.06)]">
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
                {!programState?.stage_participant_ids?.length &&
                !programBlocks.some((block) => !block.hidden) ? (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(248,113,113,0.08),transparent_48%)]">
                    <div className="rounded-[22px] border border-red-200/12 bg-black/42 px-5 py-4 text-center shadow-[0_16px_44px_rgba(0,0,0,0.32),0_0_16px_rgba(248,113,113,0.06),inset_0_1px_0_rgba(255,255,255,0.032)] backdrop-blur-md">
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-red-100/42">
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
                    participantIds={
                      transitionFromState.stage_participant_ids || []
                    }
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

              <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full border border-red-200/12 bg-black/30 px-3 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-red-100/56 shadow-[0_0_8px_rgba(239,68,68,0.06),inset_0_1px_0_rgba(255,255,255,0.022)] backdrop-blur-md">
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
                        ? "bg-red-400/82 shadow-[0_0_6px_rgba(248,113,113,0.32)]"
                        : "bg-white/30"
                    }`}
                  />
                </span>

                {programState?.is_live ? "LIVE" : "HOLD"}
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
      </SwitcherSurfaceChrome>

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

        @keyframes switcherSurfaceSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          46% {
            opacity: 0.18;
          }

          100% {
            transform: translateX(18%);
          }
        }

        @keyframes switcherArmedRail {
          0%,
          100% {
            opacity: 0.2;
            transform: scaleX(0.72);
          }

          50% {
            opacity: 0.38;
            transform: scaleX(1);
          }
        }

        @keyframes switcherLiveRail {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }

          50% {
            opacity: 0.42;
            transform: translateY(8px);
          }
        }
        @keyframes switcherRailSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-120%);
          }

          42% {
            opacity: 0.18;
          }

          100% {
            transform: translateX(220%);
          }
        }
      `}</style>
      <div className="grid gap-2 opacity-34 transition-opacity duration-300 hover:opacity-86 xl:grid-cols-[1.15fr_0.85fr]">
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
  );
}
