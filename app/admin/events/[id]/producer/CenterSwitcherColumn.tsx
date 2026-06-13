import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import AudienceOriginCue from "@/components/live/AudienceOriginCue";
import StageVideoPreview from "./StageVideoPreview";
import type { PreviewBlock } from "./useProducerBlocks";
import type { ProducerParticipant, StageState } from "./producerRoomTypes";
import { renderPlacedBlocks } from "./producerRoomBlockHelpers";
function LiveProductionStatusPanel({
  programState,
  previewProgramDifferent,
  takeBusy,
  isAutoRunning,
  onTake,
  onAutoTransition,
}: {
  programState: StageState | null;
  previewProgramDifferent: boolean;
  takeBusy: boolean;
  isAutoRunning: boolean;
  onTake: (mode: "cut" | "auto") => void;
  onAutoTransition: () => void;
}): JSX.Element {
  const isLive = Boolean(programState?.is_live);
  const statusValue = isLive ? "Live" : "Standby";

  const statusItems = [
    { label: "Status", value: statusValue, tone: "red" },
    { label: "Runtime", value: "00:54:00", tone: "neutral" },
    { label: "Rec", value: "00:54:00", tone: "neutral" },
    { label: "Confidence", value: "99%", tone: "green" },
    { label: "Audience", value: "2,462", tone: "neutral" },
  ];

  return (
    <section className="relative overflow-hidden border-b border-white/[0.045] bg-[linear-gradient(180deg,rgba(7,12,22,0.74),rgba(3,6,12,0.88))] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.010] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_28px)]" />

      <div className="relative z-10 flex items-center gap-2">
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.045] bg-white/[0.016] px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.45)]" />
          <span className="text-[8px] font-black uppercase tracking-[0.14em] text-white/48">
            Live Production
          </span>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-5 gap-1.5">
          {statusItems.map((item) => (
            <div
              key={item.label}
              className="flex min-w-0 items-center gap-1.5 rounded-[9px] border border-white/[0.04] bg-white/[0.014] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.010)]"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  item.tone === "red"
                    ? "bg-red-300 shadow-[0_0_6px_rgba(248,113,113,0.36)]"
                    : item.tone === "green"
                      ? "bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.30)]"
                      : "bg-white/30"
                }`}
              />
              <span className="truncate text-[7px] font-black uppercase tracking-[0.10em] text-white/24">
                {item.label}
              </span>
              <span className="ml-auto truncate text-[9px] font-semibold tracking-[-0.03em] text-white/66">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onTake("cut")}
            disabled={takeBusy || !previewProgramDifferent}
            className="h-8 rounded-[10px] border border-red-300/18 bg-[linear-gradient(180deg,rgba(127,29,29,0.76),rgba(69,10,10,0.92))] px-3 text-[9px] font-black uppercase tracking-[0.10em] text-red-50/82 shadow-[0_0_16px_rgba(239,68,68,0.10),inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:-translate-y-px disabled:opacity-40"
          >
            Cut
          </button>

          <button
            type="button"
            onClick={onAutoTransition}
            disabled={takeBusy || isAutoRunning || !previewProgramDifferent}
            className="h-8 rounded-[10px] border border-white/[0.06] bg-white/[0.020] px-3 text-[9px] font-black uppercase tracking-[0.10em] text-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)] transition hover:-translate-y-px hover:bg-white/[0.035] disabled:opacity-40"
          >
            Auto
          </button>
        </div>
      </div>
    </section>
  );
}

type ScreenLayoutPreset = "classic" | "brand" | "speaker_focus" | "fullscreen";


type ConfidenceMonitorMode = "standard" | "confidence" | "multiview";


type SwitcherTransitionPreset = "smooth" | "fast" | "dip" | "blur" | "warp";

type ParticipantAccentId = "none" | "violet" | "cyan" | "green" | "amber" | "rose";
type ParticipantGlowLevel = "low" | "med" | "high";
type ParticipantOutlineWeight = "soft" | "standard" | "bold";

type ParticipantAppearanceOverride = {
  accentId?: ParticipantAccentId;
  glowLevel?: ParticipantGlowLevel;
  outlineWeight?: ParticipantOutlineWeight;
};

type ParticipantAccentTone = {
  rgb: string;
  border: string;
  text: string;
  glow: string;
};

function getParticipantAccentTone(accentId?: string | null): ParticipantAccentTone {
  switch (accentId) {
    case "violet":
      return {
        rgb: "168,85,247",
        border: "border-violet-300/34",
        text: "text-violet-100/68",
        glow: "shadow-[0_0_24px_rgba(168,85,247,0.16)]",
      };
    case "cyan":
      return {
        rgb: "34,211,238",
        border: "border-cyan-300/34",
        text: "text-cyan-100/68",
        glow: "shadow-[0_0_24px_rgba(34,211,238,0.14)]",
      };
    case "green":
      return {
        rgb: "16,185,129",
        border: "border-emerald-300/34",
        text: "text-emerald-100/68",
        glow: "shadow-[0_0_24px_rgba(16,185,129,0.14)]",
      };
    case "amber":
      return {
        rgb: "251,191,36",
        border: "border-amber-300/34",
        text: "text-amber-100/68",
        glow: "shadow-[0_0_24px_rgba(251,191,36,0.14)]",
      };
    case "rose":
      return {
        rgb: "244,63,94",
        border: "border-rose-300/34",
        text: "text-rose-100/68",
        glow: "shadow-[0_0_24px_rgba(244,63,94,0.14)]",
      };
    default:
      return {
        rgb: "148,163,184",
        border: "border-white/12",
        text: "text-white/46",
        glow: "shadow-none",
      };
  }
}

function getParticipantInitials(participant: ProducerParticipant | null): string {
  if (!participant) return "—";

  const label = participant.name || participant.identity;
  const parts = label.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return parts.map((part) => part[0]).join("").toUpperCase();
}

function getParticipantResolvedAccent(
  participant: ProducerParticipant | null,
  participantAppearanceOverrides: Record<string, ParticipantAppearanceOverride>,
): ParticipantAccentTone {
  if (!participant) return getParticipantAccentTone(null);

  return getParticipantAccentTone(
    participant.accentColor ?? participantAppearanceOverrides[participant.identity]?.accentId ?? null,
  );
}

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

const SWITCHER_TRANSITION_PRESETS: Array<{
  value: SwitcherTransitionPreset;
  label: string;
  durationLabel: string;
}> = [
  { value: "smooth", label: "Smooth", durationLabel: "1.0s dissolve" },
  { value: "fast", label: "Fast", durationLabel: "0.4s dissolve" },
  { value: "dip", label: "Dip", durationLabel: "1.2s black" },
  { value: "blur", label: "Blur", durationLabel: "0.8s blur" },
  { value: "warp", label: "Warp", durationLabel: "1.4s cinematic" },
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
      className={`relative flex h-full flex-col overflow-hidden rounded-[18px] border p-0.5 shadow-[0_14px_42px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.030)] transition-all duration-700 xl:p-1 ${
        live
          ? "border-red-300/10 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.046),transparent_42%),linear-gradient(180deg,rgba(10,13,22,0.94),rgba(3,5,11,0.985))]"
          : armed
            ? "border-amber-300/8 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.024),transparent_42%),linear-gradient(180deg,rgba(10,13,22,0.92),rgba(3,5,11,0.982))]"
            : "border-white/5 bg-[linear-gradient(180deg,rgba(10,13,22,0.90),rgba(3,5,11,0.978))]"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.004)_42%,transparent_64%)] animate-[switcherSurfaceSweep_42s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.010] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.012)_0px,rgba(255,255,255,0.012)_1px,transparent_1px,transparent_14px)]" />
      <div className="pointer-events-none absolute inset-0 rounded-[22px] shadow-[inset_0_0_24px_rgba(0,0,0,0.18)]" />

      {armed ? (
        <div className="pointer-events-none absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-200/16 to-transparent animate-[switcherArmedRail_4s_ease-in-out_infinite]" />
      ) : null}

      {live ? (
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-red-200/20 to-transparent animate-[switcherLiveRail_4s_ease-in-out_infinite]" />
      ) : null}

      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function MultiviewOverlay({
  label,
  participants,
  participantAppearanceOverrides,
}: {
  label: string;
  participants: ProducerParticipant[];
  participantAppearanceOverrides: Record<string, ParticipantAppearanceOverride>;
}): JSX.Element {
  const multiviewCells = [
    { label: "Program", participant: participants[0] ?? null },
    { label: "Preview", participant: participants[1] ?? participants[0] ?? null },
    { label: "Confidence", participant: participants[2] ?? participants[0] ?? null },
    { label: "Telemetry", participant: participants[3] ?? null },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[20px]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:25%_25%] opacity-28" />

      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-white/[0.035]">
        {multiviewCells.map((cell) => {
          const accentTone = getParticipantResolvedAccent(
            cell.participant,
            participantAppearanceOverrides,
          );
          const initials = getParticipantInitials(cell.participant);
          const participantLabel = cell.participant?.name || cell.participant?.identity || "No source assigned";

          return (
            <div key={cell.label} className="relative overflow-hidden bg-black/24">
              <div
                className="absolute inset-0 opacity-75"
                style={{
                  background: `radial-gradient(circle at top, rgba(${accentTone.rgb}, 0.075), transparent 48%)`,
                }}
              />

              <div className={`absolute left-2 top-2 rounded-full border bg-black/34 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] backdrop-blur-sm ${accentTone.border} ${accentTone.text}`}>
                {cell.label}
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`flex h-10 w-16 items-center justify-center rounded-lg border bg-white/[0.022] text-[10px] font-black tracking-[0.10em] text-white/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)] ${accentTone.border} ${accentTone.glow}`}
                  style={{
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.018), 0 0 24px rgba(${accentTone.rgb}, 0.12)`,
                  }}
                >
                  {initials}
                </div>
              </div>

              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 rounded-[10px] border border-white/6 bg-black/36 px-2 py-1 backdrop-blur-sm">
                <span className="truncate text-[7px] font-black uppercase tracking-[0.10em] text-white/44">
                  {participantLabel}
                </span>
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: `rgba(${accentTone.rgb}, 0.78)`,
                    boxShadow: `0 0 8px rgba(${accentTone.rgb}, 0.42)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-3 right-3 rounded-full border border-violet-300/12 bg-black/46 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.10em] text-violet-100/52 shadow-[0_0_10px_rgba(168,85,247,0.06)] backdrop-blur-md">
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
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-[20px]">
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-violet-950/34 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/58 to-transparent" />

      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-violet-300/12 bg-black/44 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.10em] text-violet-100/56 shadow-[0_0_10px_rgba(168,85,247,0.06)] backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-300/72 shadow-[0_0_5px_rgba(196,181,253,0.28)]" />
        Confidence Return
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-emerald-300/12 bg-emerald-400/[0.07] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.10em] text-emerald-100/52 shadow-[0_0_8px_rgba(52,211,153,0.05)] backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/72 shadow-[0_0_5px_rgba(110,231,183,0.28)]" />
        Return Active
      </div>

      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-[22px] border border-white/7 bg-black/42 px-5 py-3 text-center shadow-[0_16px_44px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.026)] backdrop-blur-md">
        <div className="text-[8px] font-black uppercase tracking-[0.10em] text-white/28">
          {isProgram ? "Program Return" : "Standby"}
        </div>

        <div className="mt-1 text-3xl font-black tracking-[-0.06em] text-white/90 tabular-nums drop-shadow-[0_0_14px_rgba(196,181,253,0.12)]">
          {isProgram ? "LIVE" : countdownSeconds}
        </div>

        <div className="mt-1 text-[9px] font-black uppercase tracking-[0.10em] text-violet-100/46">
          {isProgram
            ? "Live to audience"
            : countdownSeconds === 0
              ? "Ready for cue"
              : "Stand by"}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 grid gap-1.5 md:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-white/7 bg-black/46 px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.024)] backdrop-blur-md">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/34">
            Presenter Cue
          </div>
          <div className="mt-1 text-sm font-semibold text-white/86">
            {isProgram
              ? "Live to audience"
              : countdownSeconds === 0
                ? "Ready for producer cue"
                : "Stand by"}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-violet-300/10 bg-violet-400/[0.06] px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] text-violet-100/50 shadow-[0_0_8px_rgba(168,85,247,0.05)] backdrop-blur-md">
          <span className="text-white/36">IFB</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.75)]" />
          Open
        </div>
      </div>
    </div>
  );
}

function PreviewCompositionGuides({ visible }: { visible: boolean }): JSX.Element | null {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[55] rounded-b-[18px]">
      <div className="absolute inset-[6%] rounded-[14px] border border-sky-200/18 shadow-[inset_0_0_18px_rgba(56,189,248,0.035)]" />
      <div className="absolute inset-[10%] rounded-[12px] border border-violet-200/14 shadow-[inset_0_0_18px_rgba(168,85,247,0.025)]" />

      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-sky-200/22 to-transparent" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-sky-200/22 to-transparent" />

      <div className="absolute left-1/3 top-0 h-full w-px bg-white/[0.035]" />
      <div className="absolute left-2/3 top-0 h-full w-px bg-white/[0.035]" />
      <div className="absolute left-0 top-1/3 h-px w-full bg-white/[0.035]" />
      <div className="absolute left-0 top-2/3 h-px w-full bg-white/[0.035]" />

      <div className="absolute left-[6%] top-[6%] rounded-full border border-sky-200/16 bg-black/34 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-sky-100/48 backdrop-blur-md">
        Action Safe
      </div>

      <div className="absolute left-[10%] top-[10%] rounded-full border border-violet-200/14 bg-black/34 px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-violet-100/46 backdrop-blur-md">
        Title Safe
      </div>

      <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/18 bg-sky-400/[0.035] shadow-[0_0_18px_rgba(56,189,248,0.08)]" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-200/60 shadow-[0_0_10px_rgba(125,211,252,0.35)]" />
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
  participantAppearanceOverrides,
  previewBlocks,
  selectedBlockId,
  snapGuideX,
  snapGuideY,
  setSelectedBlockId,
  startDraggingBlock,
  startResizingBlock,
  programState,
  programBlocks,
  renderCameraSlotContent,
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
  addCameraSlotBlock,
  onAddMediaAssetToPreview,
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
  participantAppearanceOverrides: Record<string, ParticipantAppearanceOverride>;
  previewBlocks: PreviewBlock[];
  selectedBlockId: string | null;
  snapGuideX: number | null;
  snapGuideY: number | null;
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
  renderCameraSlotContent?: (block: PreviewBlock) => JSX.Element | null;
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
  addCameraSlotBlock: () => void;
  onAddMediaAssetToPreview: (block: PreviewBlock) => void;
  onUploadPdf: () => void;
  onUploadVideo: () => void;
  onUploadImage: () => void;
  duplicateSelectedBlock: () => void;
  bringSelectedBlockToFront: () => void;
  deleteSelectedBlock: () => void;
}): JSX.Element {
function PreviewSnapGuides({
  snapGuideX,
  snapGuideY,
}: {
  snapGuideX: number | null;
  snapGuideY: number | null;
}): JSX.Element | null {
  if (snapGuideX === null && snapGuideY === null) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[68] rounded-b-[18px]">
      {snapGuideX !== null ? (
        <div
          className="absolute top-0 h-full w-px -translate-x-1/2 bg-sky-200/72 shadow-[0_0_12px_rgba(125,211,252,0.44)]"
          style={{ left: snapGuideX }}
        >
          <div className="absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full border border-sky-100/40 bg-sky-300/80 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
          <div className="absolute bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-sky-100/40 bg-sky-300/80 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
        </div>
      ) : null}

      {snapGuideY !== null ? (
        <div
          className="absolute left-0 h-px w-full -translate-y-1/2 bg-sky-200/72 shadow-[0_0_12px_rgba(125,211,252,0.44)]"
          style={{ top: snapGuideY }}
        >
          <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-sky-100/40 bg-sky-300/80 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
          <div className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-sky-100/40 bg-sky-300/80 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
        </div>
      ) : null}
    </div>
  );
}
  const switcherGridRef = useRef<HTMLDivElement | null>(null);
  const isDraggingSplitRef = useRef(false);
  const [previewPanePercent, setPreviewPanePercent] = useState(50);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [takeFlashVisible, setTakeFlashVisible] = useState(false);
  const [confidenceMonitorMode, setConfidenceMonitorMode] =
    useState<ConfidenceMonitorMode>("standard");
  const [selectedTransitionPreset, setSelectedTransitionPreset] =
    useState<SwitcherTransitionPreset>("smooth");
  const [transitionDuration, setTransitionDuration] = useState(1);
  const [showCompositionGuides, setShowCompositionGuides] = useState(true);
  const [previewDropActive, setPreviewDropActive] = useState(false);
  const [previewDropGhost, setPreviewDropGhost] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    type: PreviewBlock["type"];
  } | null>(null);
  const previewPaneRounded = Math.round(previewPanePercent);
  const programPaneRounded = 100 - previewPaneRounded;
  const selectedTransition =
    SWITCHER_TRANSITION_PRESETS.find(
      (preset) => preset.value === selectedTransitionPreset,
    ) ?? SWITCHER_TRANSITION_PRESETS[0];

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
    const storedValue = window.localStorage.getItem(
      "producer-transition-preset",
    );

    if (
      storedValue === "smooth" ||
      storedValue === "fast" ||
      storedValue === "dip" ||
      storedValue === "blur" ||
      storedValue === "warp"
    ) {
      setSelectedTransitionPreset(storedValue);
    }
  }, []);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(
      "producer-transition-duration",
    );
    const parsedValue = storedValue ? Number(storedValue) : NaN;

    if (Number.isFinite(parsedValue)) {
      setTransitionDuration(Math.max(0.2, Math.min(2.5, parsedValue)));
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

  function startSplitDrag(event?: React.MouseEvent<HTMLDivElement>) {
    if (event?.button !== undefined && event.button !== 0) return;

    isDraggingSplitRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function resetSplit() {
    setPreviewPanePercent(50);
    window.localStorage.setItem("producer-preview-pane-percent", "50");
  }

  function setSplitPreset(value: number) {
    const clampedPercent = Math.max(32, Math.min(68, value));
    setPreviewPanePercent(clampedPercent);
    window.localStorage.setItem(
      "producer-preview-pane-percent",
      String(Math.round(clampedPercent)),
    );
  }

  function setMonitorMode(value: ConfidenceMonitorMode) {
    setConfidenceMonitorMode(value);
    window.localStorage.setItem("producer-confidence-monitor-mode", value);
  }

  function setTransitionPreset(value: SwitcherTransitionPreset) {
    setSelectedTransitionPreset(value);
    window.localStorage.setItem("producer-transition-preset", value);
  }

  function updateTransitionDuration(value: number) {
    const clampedDuration = Math.max(0.2, Math.min(2.5, value));

    setTransitionDuration(clampedDuration);
    window.localStorage.setItem(
      "producer-transition-duration",
      String(clampedDuration),
    );
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

  function handlePreviewCanvasDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes("application/x-jupiter-preview-block")) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";

    const rawPayload = event.dataTransfer.getData("application/x-jupiter-preview-block");
    const rect = event.currentTarget.getBoundingClientRect();

    let ghostWidth = 320;
    let ghostHeight = 180;
    let ghostLabel = "Media Asset";
    let ghostType: PreviewBlock["type"] = "image";

    if (rawPayload) {
      try {
        const block = JSON.parse(rawPayload) as PreviewBlock;
        ghostWidth = block.width ?? ghostWidth;
        ghostHeight = block.height ?? ghostHeight;
        ghostLabel = block.label || block.type;
        ghostType = block.type;
      } catch {
        // Ignore malformed drag preview payloads.
      }
    }

    const nextX = Math.max(0, event.clientX - rect.left - ghostWidth / 2);
    const nextY = Math.max(0, event.clientY - rect.top - ghostHeight / 2);

    setPreviewDropActive(true);
    setPreviewDropGhost({
      x: Math.round(nextX),
      y: Math.round(nextY),
      width: ghostWidth,
      height: ghostHeight,
      label: ghostLabel,
      type: ghostType,
    });
  }

  function handlePreviewCanvasDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes("application/x-jupiter-preview-block")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setPreviewDropActive(false);
    setPreviewDropGhost(null);

    const rawPayload = event.dataTransfer.getData("application/x-jupiter-preview-block");
    if (!rawPayload) return;

    try {
      const block = JSON.parse(rawPayload) as PreviewBlock;
      const rect = event.currentTarget.getBoundingClientRect();
      const blockWidth = block.width ?? 320;
      const blockHeight = block.height ?? 180;
      const nextX = Math.max(0, event.clientX - rect.left - blockWidth / 2);
      const nextY = Math.max(0, event.clientY - rect.top - blockHeight / 2);

      onAddMediaAssetToPreview({
        ...block,
        id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: blockWidth,
        height: blockHeight,
      });
    } catch (error) {
      console.error("Failed to drop media asset into preview", error);
    }
  }

  function handlePreviewCanvasDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setPreviewDropActive(false);
      setPreviewDropGhost(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden px-0 xl:col-start-2">
      <LiveProductionStatusPanel
        programState={programState}
        previewProgramDifferent={previewProgramDifferent}
        takeBusy={takeBusy}
        isAutoRunning={isAutoRunning}
        onTake={onTake}
        onAutoTransition={runAutoTransition}
      />

      <div className="min-h-0 overflow-hidden">
        <SwitcherSurfaceChrome
          armed={previewProgramDifferent}
          live={Boolean(programState?.is_live)}
        >
        <div className="relative mb-1 flex items-center justify-between gap-2 px-1 py-0.5">
          <div className="relative z-10">
            <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/18">
              Live Production Switcher
            </div>
            <div className="mt-px text-[10px] font-semibold tracking-[-0.02em] text-white/24">
              Preview, transition, and program output.
            </div>
          </div>

          <div className="relative z-10 hidden items-center gap-1.5 xl:flex">
            <button
              type="button"
              onClick={() => setShowCompositionGuides((current) => !current)}
              className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] transition hover:-translate-y-px ${
                showCompositionGuides
                  ? "border-sky-300/18 bg-sky-400/[0.06] text-sky-100/58 shadow-[0_0_10px_rgba(56,189,248,0.08)]"
                  : "border-white/5 bg-white/[0.018] text-white/28 hover:border-white/10 hover:text-white/44"
              }`}
              title="Toggle canvas composition guides"
            >
              Guides {showCompositionGuides ? "On" : "Off"}
            </button>

            <button
              type="button"
              onClick={addCameraSlotBlock}
              className="rounded-full border border-violet-300/16 bg-violet-400/[0.07] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-violet-100/58 shadow-[0_0_10px_rgba(168,85,247,0.08)] transition hover:-translate-y-px hover:border-violet-200/24 hover:bg-violet-400/[0.10] hover:text-violet-50/76"
              title="Add a persistent camera placeholder slot"
            >
              + Camera Slot
            </button>

            <div className="rounded-full border border-white/5 bg-white/[0.018] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-white/28">
              Edge · AWS us-east-1
            </div>
            <div className="rounded-full border border-white/5 bg-white/[0.018] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-white/28">
              {confidenceMonitorMode}
            </div>
          </div>
        </div>

<div
  ref={switcherGridRef}
  className="relative grid h-[clamp(420px,62vh,980px)] min-h-0 items-stretch gap-0"
  style={{
    gridTemplateColumns: `minmax(0, ${previewPanePercent}fr) 92px minmax(0, ${100 - previewPanePercent}fr)`,
  }}
>
          <div className="pointer-events-none absolute inset-y-3 left-1/2 z-20 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/8 to-transparent" />
          <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-l-[18px] border-y border-l border-sky-300/16 bg-[linear-gradient(180deg,rgba(8,18,32,0.94),rgba(2,7,16,0.985))] p-0 shadow-[0_0_0_1px_rgba(56,189,248,0.035),0_10px_32px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.026)]">
            <div className="flex h-9 items-center justify-between border-b border-sky-300/16 bg-[linear-gradient(180deg,rgba(56,189,248,0.055),rgba(2,7,16,0.10))] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-sky-200/78">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-300/62 shadow-[0_0_6px_rgba(125,211,252,0.18)]" />
                Preview
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] ${
                  previewProgramDifferent
                    ? "border-amber-300/18 bg-amber-400/[0.06] text-amber-100/62"
                    : "border-sky-300/12 bg-sky-400/[0.04] text-sky-100/46"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    previewProgramDifferent
                      ? "bg-amber-300/78 shadow-[0_0_6px_rgba(252,211,77,0.28)]"
                      : "bg-sky-300/62 shadow-[0_0_5px_rgba(125,211,252,0.18)]"
                  }`}
                />
                {previewProgramDifferent ? "Ready" : "Sync"}
              </span>
            </div>

            <div
              className={`relative min-h-0 flex-1 overflow-hidden rounded-b-[18px] border-0 bg-[radial-gradient(circle_at_50%_42%,rgba(24,36,58,0.94)_0%,rgba(9,17,32,0.985)_58%,rgba(2,7,16,0.998)_100%)] transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:z-[9] before:rounded-b-[18px] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.040),transparent_13%,transparent_72%,rgba(255,255,255,0.018)),radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.070),transparent_38%)] before:opacity-70 ${
                previewProgramDifferent
                  ? "shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_0_28px_rgba(251,191,36,0.08),0_22px_64px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.050)]"
                  : "shadow-[0_0_0_1px_rgba(125,211,252,0.06),0_0_24px_rgba(56,189,248,0.06),0_20px_56px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.050)]"
              }`}
              onMouseMove={onPreviewCanvasMouseMove}
              onMouseUp={stopDraggingBlock}
              onMouseLeave={() => {
                stopDraggingBlock();
                setPreviewDropActive(false);
                setPreviewDropGhost(null);
              }}
              onDragOver={handlePreviewCanvasDragOver}
              onDragLeave={handlePreviewCanvasDragLeave}
              onDrop={handlePreviewCanvasDrop}
              onClick={onClearSelectedBlock}
            >
              <div
                className={`pointer-events-none absolute inset-0 z-[8] rounded-b-[18px] border transition-all duration-200 ${
                  previewDropActive
                    ? "border-sky-300/34 bg-sky-400/[0.035] shadow-[inset_0_0_44px_rgba(56,189,248,0.12),0_0_34px_rgba(56,189,248,0.08)]"
                    : "border-sky-300/0"
                }`}
              />
              {previewDropGhost ? (
                <div
                  className="pointer-events-none absolute z-[60] overflow-hidden rounded-[16px] border border-sky-200/42 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_38%),linear-gradient(180deg,rgba(8,18,32,0.62),rgba(2,7,16,0.78))] shadow-[0_0_34px_rgba(56,189,248,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
                  style={{
                    left: previewDropGhost.x,
                    top: previewDropGhost.y,
                    width: previewDropGhost.width,
                    height: previewDropGhost.height,
                  }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_34%,rgba(56,189,248,0.08))]" />
                  <div className="absolute left-3 top-3 rounded-full border border-sky-100/24 bg-black/40 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-sky-50/78 shadow-[0_0_14px_rgba(56,189,248,0.18)] backdrop-blur-md">
                    Drop to Preview
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 rounded-[12px] border border-white/10 bg-black/44 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-md">
                    <div className="truncate text-xs font-semibold text-white/80">
                      {previewDropGhost.label}
                    </div>
                    <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-sky-100/46">
                      {previewDropGhost.type} · new layer
                    </div>
                  </div>
                </div>
              ) : null}

              <PreviewCompositionGuides
                visible={
                  showCompositionGuides &&
                  (previewDropActive || Boolean(selectedBlockId))
                }
              />

              <PreviewSnapGuides
                snapGuideX={snapGuideX}
                snapGuideY={snapGuideY}
              />

              <div className="pointer-events-none absolute inset-0 z-10 rounded-b-[18px] shadow-[inset_0_0_18px_rgba(0,0,0,0.58),inset_0_0_0_1px_rgba(255,255,255,0.025)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-10 bg-gradient-to-b from-black/22 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 bg-gradient-to-t from-black/22 to-transparent" />


<StageVideoPreview
  stageState={stageState}
  participantIds={stageState?.stage_participant_ids ?? []}
  participantAppearanceOverrides={participantAppearanceOverrides}
  screenLayoutPreset={screenLayoutPreset}
/>

              {renderPlacedBlocks({
                blocks: previewBlocks,
                opts: {
                  selectable: true,
                  showChrome: true,
                  selectedBlockId,
                  renderCameraSlotContent,
                },
                selectedBlockId,
                setSelectedBlockId,
                startDraggingBlock,
                startResizingBlock,
              })}

              <div className="pointer-events-none absolute bottom-2 left-2 z-30 rounded-[10px] border border-white/7 bg-black/40 px-2 py-1 text-left shadow-[0_6px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.018)] backdrop-blur-md">
                <div className="text-[12px] font-semibold tracking-[-0.02em] text-white/80">
                  {selectedSceneLabel ? selectedSceneLabel : "Preview Source"}
                </div>
                <div className="mt-px text-[9px] font-medium text-white/34">
                  {previewProgramDifferent ? "Ready for transition" : "Mirrors program"}
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-2 right-2 z-30 flex items-end gap-1.5 rounded-[10px] border border-white/7 bg-black/34 px-2 py-1 shadow-[0_6px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.016)] backdrop-blur-md">
                <div className="flex h-6 items-end gap-0.5">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <span
                      key={index}
                      className="w-1 rounded-full bg-emerald-300/76 shadow-[0_0_4px_rgba(110,231,183,0.16)]"
                      style={{ height: `${8 + ((index * 5) % 20)}px` }}
                    />
                  ))}
                </div>
                <span className="text-white/58">◖</span>
              </div>
              {confidenceMonitorMode === "confidence" ? (
                <PresenterConfidenceCue variant="preview" />
              ) : null}

              {confidenceMonitorMode === "multiview" ? (
                <MultiviewOverlay
                  label="Multiview"
                  participants={onStageParticipants}
                  participantAppearanceOverrides={participantAppearanceOverrides}
                />
              ) : null}
            </div>
          </div>
          <div
            className="group relative z-[999] flex h-full min-h-full cursor-col-resize items-stretch justify-center self-stretch select-none overflow-hidden"
            onMouseDown={startSplitDrag}
            onDoubleClick={resetSplit}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize preview and program panes"
            aria-valuemin={32}
            aria-valuemax={68}
            aria-valuenow={previewPaneRounded}
          >
            <div className="relative flex w-full flex-col overflow-hidden rounded-[14px] border border-white/7 bg-[linear-gradient(180deg,rgba(15,23,36,0.86),rgba(4,7,13,0.965))] shadow-[0_10px_26px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.024)] backdrop-blur-md transition-all duration-300 group-hover:border-white/11">
              <div className="pointer-events-none absolute inset-y-8 left-0 w-px bg-gradient-to-b from-transparent via-sky-300/16 to-transparent opacity-60" />
              <div className="pointer-events-none absolute inset-y-8 right-0 w-px bg-gradient-to-b from-transparent via-red-300/16 to-transparent opacity-60" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.006)_42%,transparent_64%)] opacity-30 transition-opacity duration-300 group-hover:opacity-60" />
              <div className="pointer-events-none absolute inset-y-10 left-1/2 z-0 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/8 to-transparent opacity-22" />
              <div className="pointer-events-none absolute left-1/2 top-10 z-30 flex h-9 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-white/8 bg-white/[0.016] opacity-28 shadow-[0_0_10px_rgba(255,255,255,0.025),inset_0_1px_0_rgba(255,255,255,0.014)] backdrop-blur-md transition-opacity duration-300 group-hover:opacity-60">
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <span
                      key={index}
                      className="h-0.5 w-1.5 rounded-full bg-white/48"
                    />
                  ))}
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-10 left-1/2 z-30 flex h-9 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-white/8 bg-white/[0.016] opacity-28 shadow-[0_0_10px_rgba(255,255,255,0.025),inset_0_1px_0_rgba(255,255,255,0.014)] backdrop-blur-md transition-opacity duration-300 group-hover:opacity-60">
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <span
                      key={index}
                      className="h-0.5 w-1.5 rounded-full bg-white/48"
                    />
                  ))}
                </div>
              </div>
              <div className="relative z-20 flex h-7 items-center justify-center border-b border-white/6 px-1 text-[7px] font-black uppercase tracking-[0.08em] text-sky-100/40">
                <span className="relative z-10">Transition</span>
              </div>

              <div className="relative z-20 flex flex-1 flex-col justify-center gap-3 px-2 py-3">
                <button
                  type="button"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    runAutoTransition();
                  }}
                  disabled={takeBusy || isAutoRunning || !previewProgramDifferent}
                  className={`relative min-h-[62px] rounded-[14px] border text-center transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 ${
                    previewProgramDifferent
                      ? "border-sky-300/22 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_56%),linear-gradient(180deg,rgba(255,255,255,0.060),rgba(255,255,255,0.018))] text-sky-100/82 shadow-[0_0_18px_rgba(56,189,248,0.10),inset_0_1px_0_rgba(255,255,255,0.045)]"
                      : "border-white/8 bg-white/[0.025] text-white/34 shadow-[inset_0_1px_0_rgba(255,255,255,0.024)]"
                  }`}
                >
                  <span className="block text-base font-semibold tracking-[-0.04em]">
                    {isAutoRunning ? "RUN" : "TAKE"}
                  </span>
                  <span className="mt-0.5 block text-[9px] font-black uppercase tracking-[0.08em] text-sky-200/58">
                    Auto
                  </span>
                </button>

                <div className="h-1.5 overflow-hidden rounded-full bg-white/7">
                  <div
                    className={`h-full rounded-full bg-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.28)] transition-all duration-700 ${
                      isAutoRunning ? "w-full" : "w-[46%]"
                    }`}
                  />
                </div>

                <label className="relative z-20 block rounded-[13px] border border-white/7 bg-white/[0.022] px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.018)] transition hover:border-white/11 hover:bg-white/[0.034]">
                  <span className="pointer-events-none flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-white/70">
                      {selectedTransition.label}
                    </span>
                    <span className="text-white/54">⌄</span>
                  </span>

                  <span className="pointer-events-none mt-px block truncate text-[9px] text-white/30">
                    {selectedTransition.durationLabel}
                  </span>

                  <div className="relative z-20 mt-2.5 flex items-center gap-2">
                    <span className="text-[7px] font-black uppercase tracking-[0.08em] text-white/26">
                      Rate
                    </span>

                    <div className="relative flex-1">
                      <div className="absolute inset-y-1/2 left-0 right-0 h-px -translate-y-1/2 bg-white/10" />
                      <div
                        className="absolute inset-y-1/2 left-0 h-px -translate-y-1/2 bg-sky-300/60 shadow-[0_0_6px_rgba(56,189,248,0.28)]"
                        style={{
                          width: `${
                            ((transitionDuration - 0.2) / (2.5 - 0.2)) * 100
                          }%`,
                        }}
                      />

                      <input
                        type="range"
                        min={0.2}
                        max={2.5}
                        step={0.1}
                        value={transitionDuration}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          event.stopPropagation();
                          updateTransitionDuration(Number(event.target.value));
                        }}
                        className="relative z-10 h-3 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-200 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(125,211,252,0.55)]"
                        aria-label="Transition duration"
                      />
                    </div>

                    <span className="w-[32px] text-right text-[8px] font-black uppercase tracking-[0.06em] text-sky-100/48">
                      {transitionDuration.toFixed(1)}s
                    </span>
                  </div>

                  <select
                    value={selectedTransitionPreset}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      setTransitionPreset(
                        event.target.value as SwitcherTransitionPreset,
                      );
                    }}
                    className="absolute inset-x-0 top-0 h-9 cursor-pointer opacity-0"
                    aria-label="Transition preset"
                  >
                    {SWITCHER_TRANSITION_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label} · {preset.durationLabel}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="hidden grid-cols-3 gap-1 2xl:grid">
                  {[
                    { label: "PVW", value: 60 },
                    { label: "50", value: 50 },
                    { label: "PGM", value: 40 },
                  ].map((preset) => {
                    const active = Math.round(previewPanePercent) === preset.value;

                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSplitPreset(preset.value);
                        }}
                        className={`rounded-[9px] border px-1 py-1 text-[7px] font-black uppercase tracking-[0.08em] transition hover:-translate-y-px active:translate-y-0 ${
                          active
                            ? "border-sky-300/18 bg-sky-400/[0.06] text-sky-100/62 shadow-[0_0_8px_rgba(56,189,248,0.08)]"
                            : "border-white/7 bg-white/[0.020] text-white/28 hover:border-white/11 hover:bg-white/[0.035] hover:text-white/50"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onTake("cut");
                  }}
                  disabled={takeBusy || !previewProgramDifferent}
                  className={`min-h-[46px] rounded-[12px] border text-sm font-semibold tracking-[-0.03em] transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 ${
                    previewProgramDifferent
                      ? "border-sky-300/18 bg-white/[0.045] text-sky-100/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : "border-white/8 bg-white/[0.022] text-white/32"
                  }`}
                >
                  CUT
                </button>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 rounded-full bg-white/[0.010] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-r-[18px] border-y border-r border-red-300/16 bg-[linear-gradient(180deg,rgba(33,14,18,0.92),rgba(8,3,7,0.985))] p-0 shadow-[0_0_0_1px_rgba(248,113,113,0.035),0_10px_32px_rgba(0,0,0,0.28),0_0_12px_rgba(239,68,68,0.028),inset_0_1px_0_rgba(255,255,255,0.026)]">
            <div className="flex h-9 items-center justify-between border-b border-red-300/16 bg-[linear-gradient(180deg,rgba(248,113,113,0.046),rgba(16,4,8,0.10))] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-red-200/82">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-300/70 shadow-[0_0_6px_rgba(248,113,113,0.20)]" />
                Program
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300/14 bg-red-500/[0.055] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-red-100/60">
                <span className="relative flex h-1.5 w-1.5 items-center justify-center">
                  {programState?.is_live ? (
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-300/50" />
                  ) : null}
                  <span
                    className={`relative h-1.5 w-1.5 rounded-full ${
                      programState?.is_live
                        ? "bg-red-300/82 shadow-[0_0_6px_rgba(248,113,113,0.28)]"
                        : "bg-white/28"
                    }`}
                  />
                </span>
                {programState?.is_live ? "Live" : "Hold"}
              </span>
            </div>

            <div
              className={`relative min-h-0 flex-1 overflow-hidden rounded-b-[18px] border-0 bg-[radial-gradient(circle_at_50%_44%,rgba(31,18,24,0.985)_0%,rgba(12,7,13,0.995)_62%,rgba(3,2,5,0.998)_100%)] transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:z-[9] before:rounded-b-[18px] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.042),transparent_14%,transparent_72%,rgba(255,255,255,0.018)),radial-gradient(circle_at_50%_0%,rgba(248,113,113,0.076),transparent_42%)] before:opacity-72 ${
                isTransitioning
                  ? "shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_0_42px_rgba(255,255,255,0.07),0_22px_64px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.052)]"
                  : "shadow-[0_0_0_1px_rgba(248,113,113,0.075),0_0_30px_rgba(239,68,68,0.075),0_20px_56px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.050)]"
              }`}
            >
              <div className="pointer-events-none absolute inset-0 z-10 rounded-b-[18px] shadow-[inset_0_0_36px_rgba(0,0,0,0.60),inset_0_0_0_1px_rgba(255,255,255,0.025)]" />
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
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-10 bg-gradient-to-b from-black/22 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 bg-gradient-to-t from-black/22 to-transparent" />

              <div className="relative z-10 h-full">
                {!programState?.stage_participant_ids?.length &&
                !programBlocks.some((block) => !block.hidden) ? (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(248,113,113,0.08),transparent_48%)]">
                    <div className="rounded-[18px] border border-red-200/12 bg-black/42 px-5 py-4 text-center shadow-[0_16px_44px_rgba(0,0,0,0.32),0_0_16px_rgba(248,113,113,0.06),inset_0_1px_0_rgba(255,255,255,0.032)] backdrop-blur-md">
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-red-100/42">
                        Program Idle
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white/72">
                        Awaiting source
                      </div>
                    </div>
                  </div>
                ) : null}

       <StageVideoPreview
  stageState={programState}
  participantIds={programState?.stage_participant_ids ?? []}
  screenLayoutPreset={screenLayoutPreset}
/>

                {renderPlacedBlocks({
                  blocks: programBlocks,
                  opts: {
                    selectable: false,
                    showChrome: false,
                    renderCameraSlotContent,
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
  participantIds={transitionFromState.stage_participant_ids ?? []}
  screenLayoutPreset={screenLayoutPreset}
/>

                  {renderPlacedBlocks({
                    blocks: transitionFromBlocks,
                    opts: {
                      selectable: false,
                      showChrome: false,
                      renderCameraSlotContent,
                    },
                    selectedBlockId,
                    setSelectedBlockId,
                    startDraggingBlock,
                    startResizingBlock,
                  })}
                </div>
              ) : null}

              <div className="pointer-events-none absolute bottom-2 left-2 z-30 rounded-[10px] border border-white/7 bg-black/40 px-2 py-1 text-left shadow-[0_6px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.018)] backdrop-blur-md">
                <div className="text-[12px] font-semibold tracking-[-0.02em] text-white/80">
                  Program Output
                </div>
                <div className="mt-px text-[9px] font-medium text-white/34">
                  {programState?.is_live ? "Live to audience" : "Program standby"}
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-2 right-2 z-30 flex items-end gap-1.5 rounded-[10px] border border-white/7 bg-black/34 px-2 py-1 shadow-[0_6px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.016)] backdrop-blur-md">
                <div className="flex h-6 items-end gap-0.5">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <span
                      key={index}
                      className="w-1 rounded-full bg-emerald-300/76 shadow-[0_0_4px_rgba(110,231,183,0.16)]"
                      style={{ height: `${8 + ((index * 6) % 20)}px` }}
                    />
                  ))}
                </div>
                <span className="text-white/58">◖</span>
              </div>
              {confidenceMonitorMode === "confidence" ? (
                <PresenterConfidenceCue variant="program" />
              ) : null}

              {confidenceMonitorMode === "multiview" ? (
                <MultiviewOverlay
                  label="Multiview"
                  participants={onStageParticipants}
                  participantAppearanceOverrides={participantAppearanceOverrides}
                />
              ) : null}
            </div>
          </div>
        </div>
        </SwitcherSurfaceChrome>
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

        @keyframes switcherSurfaceSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          46% {
            opacity: 0.035;
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
            opacity: 0.24;
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
            opacity: 0.28;
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
    </div>
  );
}
