import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { ScanLine } from "lucide-react";
import AudienceOriginCue from "@/components/live/AudienceOriginCue";
import StageVideoPreview from "./StageVideoPreview";
import { EmptyMonitorState } from "./monitorChrome";
import {
  PRODUCER_BLOCK_CANVAS_HEIGHT,
  PRODUCER_BLOCK_CANVAS_WIDTH,
  type PreviewBlock,
} from "./useProducerBlocks";
import type { ProducerParticipant, StageState } from "./producerRoomTypes";
import type {
  ProducerHealthSnapshot,
  ProducerTransportHealth,
} from "./producerHealthUtils";
import { renderPlacedBlocks } from "./producerRoomBlockHelpers";
import type { ProducerWorkspaceMode } from "./ProducerModeBar";
import type { CinematicTransitionType } from "./commandDeckTypes";
import {
  broadcastOutputProfileLabel,
  type BroadcastOutputProfile,
} from "@/lib/broadcast/outputProfiles";
function LiveProductionStatusPanel({
  programState,
  previewProgramDifferent,
  takeBusy,
  isAutoRunning,
}: {
  programState: StageState | null;
  previewProgramDifferent: boolean;
  takeBusy: boolean;
  isAutoRunning: boolean;
}): JSX.Element {
  const isLive = Boolean(programState?.is_live);
  const transitionState = takeBusy || isAutoRunning ? "Transitioning" : "Ready";

  return (
    <section className="shrink-0 border-b border-white/[0.08] bg-[#060a12] px-2 py-1.5">
      <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr] items-center rounded-[8px] border border-white/[0.09] bg-[#090e18] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        <div className="min-w-0 px-2">
          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-sky-200/82">1 · Preview</div>
          <div className="truncate text-[11px] font-semibold text-white/76">
            {previewProgramDifferent ? "Prepared and ready" : "Matches Program"}
          </div>
        </div>
        <div className="text-center text-xs text-white/18" aria-hidden="true">→</div>
        <div className="min-w-0 border-x border-white/[0.06] px-2 text-center">
          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/48">2 · Take</div>
          <div className={`truncate text-[11px] font-semibold ${takeBusy || isAutoRunning ? "text-amber-200/88" : "text-white/76"}`}>
            {transitionState}
          </div>
        </div>
        <div className="text-center text-xs text-white/18" aria-hidden="true">→</div>
        <div className="min-w-0 px-2 text-right">
          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-red-200/84">3 · Program</div>
          <div className={`truncate text-[11px] font-semibold ${isLive ? "text-red-100/92" : "text-white/68"}`}>
            {isLive ? "Live to audience" : "Standing by"}
          </div>
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
      className={`producer-switcher-surface relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border shadow-[0_12px_32px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.025)] transition-colors duration-300 ${
        live
          ? "border-red-300/14 bg-[#05080f]"
          : armed
            ? "border-sky-300/13 bg-[#05080f]"
            : "border-white/[0.07] bg-[#05080f]"
      }`}
    >
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function MonitorSignalMeter({
  label,
  sourceReady,
  stageReady,
  transportHealth,
  live = false,
}: {
  label: string;
  sourceReady: boolean;
  stageReady: boolean;
  transportHealth: ProducerTransportHealth;
  live?: boolean;
}): JSX.Element {
  const transportReady = transportHealth === "connected";
  const transportPending =
    transportHealth === "connecting" || transportHealth === "recovering";
  const activeBars = sourceReady
    ? Number(transportReady) + 1 + Number(stageReady) + Number(live)
    : 0;
  const level = !sourceReady
    ? "No source"
    : !transportReady || !stageReady
      ? transportPending
        ? "Connecting"
        : "Degraded"
      : live
        ? "Live and healthy"
        : "Ready";
  const activeClass =
    !sourceReady || !transportReady
      ? "bg-red-300/80 shadow-[0_0_5px_rgba(248,113,113,0.28)]"
      : !stageReady
        ? "bg-amber-300/82 shadow-[0_0_5px_rgba(252,211,77,0.26)]"
        : "bg-emerald-300/82 shadow-[0_0_5px_rgba(110,231,183,0.22)]";

  return (
    <div
      className="pointer-events-auto flex items-end gap-1.5 rounded-[10px] border border-white/7 bg-black/38 px-2 py-1 shadow-[0_6px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.018)] backdrop-blur-md"
      title={`${label} signal: ${level}. Transport ${transportHealth}; source ${sourceReady ? "available" : "missing"}; stage routes ${stageReady ? "healthy" : "need attention"}.`}
      aria-label={`${label} signal ${level}`}
    >
      <div className="flex h-6 items-end gap-0.5" aria-hidden="true">
        {[8, 12, 17, 22].map((height, index) => (
          <span
            key={height}
            className={`w-1 rounded-full transition-all duration-300 ${
              index < activeBars ? activeClass : "bg-white/10"
            }`}
            style={{ height }}
          />
        ))}
      </div>
      <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-white/48">
        {level}
      </span>
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

  const [countdownSeconds, setCountdownSeconds] = useState(
    isProgram ? 0 : 5,
  );

  useEffect(() => {
    if (isProgram) return;

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
          style={{ left: `${(snapGuideX / PRODUCER_BLOCK_CANVAS_WIDTH) * 100}%` }}
        >
          <div className="absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full border border-sky-100/40 bg-sky-300/80 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
          <div className="absolute bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border border-sky-100/40 bg-sky-300/80 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
        </div>
      ) : null}

      {snapGuideY !== null ? (
        <div
          className="absolute left-0 h-px w-full -translate-y-1/2 bg-sky-200/72 shadow-[0_0_12px_rgba(125,211,252,0.44)]"
          style={{ top: `${(snapGuideY / PRODUCER_BLOCK_CANVAS_HEIGHT) * 100}%` }}
        >
          <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-sky-100/40 bg-sky-300/80 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
          <div className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-sky-100/40 bg-sky-300/80 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
        </div>
      ) : null}
    </div>
  );
}

export default function CenterSwitcherColumn({
  workspaceMode,
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
  onRemoveProgramBlock,
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
  addCameraSlotBlock,
  onAddMediaAssetToPreview,
  onUploadPdf,
  onUploadVideo,
  onUploadImage,
  duplicateSelectedBlock,
  bringSelectedBlockToFront,
  deleteSelectedBlock,
  healthSnapshot,
  transportHealth,
  outputProfile,
}: {
  workspaceMode: ProducerWorkspaceMode;
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
  onTake: (
    mode: "cut" | "auto",
    transitionType?: CinematicTransitionType,
    transitionDurationMs?: number,
  ) => void;
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
  onRemoveProgramBlock: (blockId: string) => void;
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
  addCameraSlotBlock: (
    participantId?: string | null,
    participantLabel?: string | null,
  ) => void;
  onAddMediaAssetToPreview: (block: PreviewBlock) => void;
  onUploadPdf: () => void;
  onUploadVideo: () => void;
  onUploadImage: () => void;
  duplicateSelectedBlock: () => void;
  bringSelectedBlockToFront: () => void;
  deleteSelectedBlock: () => void;
  healthSnapshot: ProducerHealthSnapshot;
  transportHealth: ProducerTransportHealth;
  outputProfile: BroadcastOutputProfile;
}): JSX.Element {
  const switcherGridRef = useRef<HTMLDivElement | null>(null);
  const transitionPopoverRef = useRef<HTMLDivElement | null>(null);
  const isDraggingSplitRef = useRef(false);
  const [previewPanePercent, setPreviewPanePercent] = useState(() => {
    const storedValue = window.localStorage.getItem("producer-preview-pane-percent");
    const parsedValue = storedValue ? Number(storedValue) : NaN;
    return Number.isFinite(parsedValue) ? Math.max(32, Math.min(68, parsedValue)) : 50;
  });
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [takeFlashVisible, setTakeFlashVisible] = useState(false);
  const [confidenceMonitorMode, setConfidenceMonitorMode] =
    useState<ConfidenceMonitorMode>(() => {
      const storedValue = window.localStorage.getItem("producer-confidence-monitor-mode");
      if (
        storedValue === "standard" ||
        storedValue === "confidence" ||
        storedValue === "multiview"
      ) {
        return storedValue;
      }
      return "standard";
    });
  const [selectedTransitionPreset, setSelectedTransitionPreset] =
    useState<SwitcherTransitionPreset>(() => {
      const storedValue = window.localStorage.getItem("producer-transition-preset");
      if (
        storedValue === "smooth" ||
        storedValue === "fast" ||
        storedValue === "dip" ||
        storedValue === "blur" ||
        storedValue === "warp"
      ) {
        return storedValue;
      }
      return "smooth";
    });
  const [transitionDuration, setTransitionDuration] = useState(() => {
    const storedValue = window.localStorage.getItem("producer-transition-duration");
    const parsedValue = storedValue ? Number(storedValue) : NaN;
    return Number.isFinite(parsedValue) ? Math.max(0.2, Math.min(2.5, parsedValue)) : 1;
  });
  const [transitionPopoverOpen, setTransitionPopoverOpen] = useState(false);
  const defaultCameraParticipantId =
    stageState?.pinned_participant_id ??
    stageState?.primary_participant_id ??
    stageState?.stage_participant_ids?.[0] ??
    null;
  const defaultCameraParticipant = onStageParticipants.find(
    (participant) => participant.identity === defaultCameraParticipantId,
  );
  const previewHasCameraLayer = previewBlocks.some(
    (block) =>
      block.type === "camera-slot" &&
      !block.hidden &&
      Boolean(block.assignedParticipantId),
  );
  const programHasCameraLayer = programBlocks.some(
    (block) =>
      block.type === "camera-slot" &&
      !block.hidden &&
      Boolean(block.assignedParticipantId),
  );
  const [showCompositionGuides, setShowCompositionGuides] = useState(
    () => window.localStorage.getItem("producer-composition-guides") === "true",
  );
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
  const selectedTransitionType: CinematicTransitionType =
    selectedTransitionPreset === "warp"
      ? "warp"
      : selectedTransitionPreset === "dip"
        ? "curtain"
        : "fade";

  useEffect(() => {
    if (!transitionPopoverOpen) return;

    const closeTransitionPopover = (event: PointerEvent) => {
      if (
        transitionPopoverRef.current &&
        !transitionPopoverRef.current.contains(event.target as Node)
      ) {
        setTransitionPopoverOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTransitionPopoverOpen(false);
    };

    document.addEventListener("pointerdown", closeTransitionPopover);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeTransitionPopover);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [transitionPopoverOpen]);

  useEffect(() => {
    const onId = window.setTimeout(() => {
      setTakeFlashVisible(isTransitioning);
    }, 0);
    const offId = isTransitioning
      ? window.setTimeout(() => {
          setTakeFlashVisible(false);
        }, 620)
      : null;

    return () => {
      window.clearTimeout(onId);
      if (offId) window.clearTimeout(offId);
    };
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

  function setMonitorMode(value: ConfidenceMonitorMode) {
    setConfidenceMonitorMode(value);
    window.localStorage.setItem("producer-confidence-monitor-mode", value);
  }

  function setTransitionPreset(value: SwitcherTransitionPreset) {
    setSelectedTransitionPreset(value);
    window.localStorage.setItem("producer-transition-preset", value);
  }

  function toggleCompositionGuides() {
    setShowCompositionGuides((current) => {
      const nextValue = !current;
      window.localStorage.setItem(
        "producer-composition-guides",
        String(nextValue),
      );
      return nextValue;
    });
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
      onTake("auto", selectedTransitionType, transitionDuration * 1000);
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
    const logicalPointerX = (event.clientX - rect.left) * (PRODUCER_BLOCK_CANVAS_WIDTH / rect.width);
    const logicalPointerY = (event.clientY - rect.top) * (PRODUCER_BLOCK_CANVAS_HEIGHT / rect.height);

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

    const nextX = Math.max(0, logicalPointerX - ghostWidth / 2);
    const nextY = Math.max(0, logicalPointerY - ghostHeight / 2);

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
      const logicalPointerX = (event.clientX - rect.left) * (PRODUCER_BLOCK_CANVAS_WIDTH / rect.width);
      const logicalPointerY = (event.clientY - rect.top) * (PRODUCER_BLOCK_CANVAS_HEIGHT / rect.height);
      const blockWidth = block.width ?? 320;
      const blockHeight = block.height ?? 180;
      const nextX = Math.max(0, logicalPointerX - blockWidth / 2);
      const nextY = Math.max(0, logicalPointerY - blockHeight / 2);

      onAddMediaAssetToPreview({
        ...block,
        id: crypto.randomUUID(),
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: blockWidth,
        height: blockHeight,
      });
    } catch {
    }
  }

  function handlePreviewCanvasDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setPreviewDropActive(false);
      setPreviewDropGhost(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden xl:col-start-2">
      <div className="hidden"><LiveProductionStatusPanel
        programState={programState}
        previewProgramDifferent={previewProgramDifferent}
        takeBusy={takeBusy}
        isAutoRunning={isAutoRunning}
      /></div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SwitcherSurfaceChrome
          armed={previewProgramDifferent}
          live={Boolean(programState?.is_live)}
        >
        <div className="hidden">
          <div className="relative z-10">
            <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/54">Live switcher</div>
          </div>

          <div className="relative z-10 hidden items-center gap-1.5 xl:flex">
            <button
              type="button"
              onClick={() =>
                addCameraSlotBlock(
                  defaultCameraParticipantId,
                  defaultCameraParticipant?.name || defaultCameraParticipantId,
                )
              }
              className="rounded-[6px] border border-sky-300/16 bg-sky-400/[0.055] px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.10em] text-sky-100/66 transition hover:border-sky-200/34 hover:bg-sky-400/[0.10] hover:text-white"
              title={
                defaultCameraParticipantId
                  ? "Add the on-stage camera as a movable, resizable layer"
                  : "Add a resizable camera layer, then assign a presenter"
              }
            >
              + Camera Layer
            </button>

            {workspaceMode !== "show" ? (
            <>
            <button
              type="button"
              onClick={toggleCompositionGuides}
              className={`rounded-[6px] border px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.10em] transition ${
                showCompositionGuides
                  ? "border-sky-300/18 bg-sky-400/[0.06] text-sky-100/58 shadow-[0_0_10px_rgba(56,189,248,0.08)]"
                  : "border-white/5 bg-white/[0.018] text-white/28 hover:border-white/10 hover:text-white/44"
              }`}
              title="Toggle canvas composition guides"
            >
              Guides {showCompositionGuides ? "On" : "Off"}
            </button>
            {workspaceMode === "advanced" ? (
              <div className="rounded-[6px] border border-white/5 bg-white/[0.018] px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.10em] text-white/28">
                Monitor · {confidenceMonitorMode}
              </div>
            ) : null}
            </>
            ) : null}
          </div>
        </div>

<div
  ref={switcherGridRef}
  className="relative grid min-h-[430px] flex-1 items-stretch gap-3 p-0"
  style={{
    gridTemplateColumns: `minmax(0, ${previewPanePercent}fr) clamp(88px,5.8vw,96px) minmax(0, ${100 - previewPanePercent}fr)`,
  }}
>
          <div className="producer-monitor producer-monitor--preview relative flex h-full min-w-0 flex-col overflow-hidden rounded-[12px] border border-blue-500 bg-[#06101c] p-0 shadow-[0_0_22px_rgba(37,99,235,0.18)]">
            <div className="producer-monitor__header flex h-14 items-center justify-between border-b border-blue-400/35 bg-[#07182b] px-5 text-[16px] font-semibold uppercase tracking-[0.10em] text-blue-400">
              <div className="flex items-center gap-3">
                <span>Preview</span>
                <span
                  className="whitespace-nowrap rounded-full border border-sky-300/14 bg-black/24 px-2 py-1 text-[8px] font-bold normal-case tracking-[0.04em] text-sky-100/52"
                  title={`Actual output: ${broadcastOutputProfileLabel(outputProfile)}`}
                >
                  {outputProfile.resolutionTier} · {outputProfile.frameRate} fps · {outputProfile.aspectRatio}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleCompositionGuides}
                  aria-pressed={showCompositionGuides}
                  aria-label={`${showCompositionGuides ? "Hide" : "Show"} title-safe and action-safe guides`}
                  title={`${showCompositionGuides ? "Hide" : "Show"} title-safe and action-safe guides`}
                  className={`group/safe relative grid h-8 w-8 place-items-center rounded-[8px] border transition-all duration-150 active:scale-95 ${
                    showCompositionGuides
                      ? "border-sky-300/32 bg-sky-400/[0.12] text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.14),inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "border-white/[0.09] bg-white/[0.025] text-white/38 hover:border-sky-300/22 hover:bg-sky-400/[0.06] hover:text-sky-100/76"
                  }`}
                >
                  <ScanLine aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={1.7} />
                  {showCompositionGuides ? (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_7px_rgba(125,211,252,0.9)]" />
                  ) : null}
                </button>
                <span
                  className={`inline-flex items-center rounded-[8px] border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                    previewProgramDifferent
                      ? "border-amber-300/18 bg-amber-400/[0.06] text-amber-100/62"
                      : "border-sky-300/12 bg-sky-400/[0.04] text-sky-100/46"
                  }`}
                >
                  {previewProgramDifferent ? "Ready to take" : "Matched"}
                </span>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
            <div
              data-output-canvas="preview"
              style={{ aspectRatio: outputProfile.aspectRatioValue }}
              className={`relative flex-none overflow-hidden bg-black ring-1 ring-inset ring-white/[0.06] transition-shadow duration-300 ${
                outputProfile.aspectRatioValue < 1
                  ? "h-full w-auto max-w-full"
                  : "h-auto max-h-full w-full"
              } ${
                previewProgramDifferent
                  ? "shadow-[inset_0_0_0_1px_rgba(125,211,252,0.10)]"
                  : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]"
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
                className={`pointer-events-none absolute inset-0 z-[8] border transition-all duration-200 ${
                  previewDropActive
                    ? "border-sky-300/34 bg-sky-400/[0.035] shadow-[inset_0_0_44px_rgba(56,189,248,0.12),0_0_34px_rgba(56,189,248,0.08)]"
                    : "border-sky-300/0"
                }`}
              />
              {previewDropGhost ? (
                <div
                  className="pointer-events-none absolute z-[60] overflow-hidden rounded-[16px] border border-sky-200/42 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_38%),linear-gradient(180deg,rgba(8,18,32,0.62),rgba(2,7,16,0.78))] shadow-[0_0_34px_rgba(56,189,248,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
                  style={{
                    left: `${(previewDropGhost.x / PRODUCER_BLOCK_CANVAS_WIDTH) * 100}%`,
                    top: `${(previewDropGhost.y / PRODUCER_BLOCK_CANVAS_HEIGHT) * 100}%`,
                    width: `${(previewDropGhost.width / PRODUCER_BLOCK_CANVAS_WIDTH) * 100}%`,
                    height: `${(previewDropGhost.height / PRODUCER_BLOCK_CANVAS_HEIGHT) * 100}%`,
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

              <PreviewCompositionGuides visible={showCompositionGuides} />

              <PreviewSnapGuides
                snapGuideX={snapGuideX}
                snapGuideY={snapGuideY}
              />

              {!stageState?.stage_participant_ids?.length && !previewBlocks.some((block) => !block.hidden) ? (
                <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(var(--producer-brand-primary),0.16),transparent_34%),linear-gradient(135deg,#050b18_0%,#101a48_48%,#06162c_100%)] shadow-[inset_0_0_22px_rgba(0,0,0,0.55)]" />
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-10 bg-gradient-to-b from-black/22 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 bg-gradient-to-t from-black/22 to-transparent" />


              {!previewHasCameraLayer && stageState?.stage_participant_ids?.length ? (
                <StageVideoPreview
                  stageState={stageState}
                  participantIds={stageState?.stage_participant_ids ?? []}
                  participantAppearanceOverrides={participantAppearanceOverrides}
                  screenLayoutPreset={screenLayoutPreset}
                />
              ) : null}

              {!stageState?.stage_participant_ids?.length && !previewBlocks.some((block) => !block.hidden) ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <div className="absolute inset-0">
                    <EmptyMonitorState
                      title="Standing By"
                      subtitle="Choose a camera, media asset, or color source to build the next look"
                    />
                  </div>
                </div>
              ) : null}

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
                deleteBlock: () => deleteSelectedBlock(),
              })}

              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 flex min-h-14 items-center border-t border-white/10 bg-[#07111d]/90 px-5 text-left backdrop-blur-md">
                <div className="text-[14px] font-medium tracking-[-0.01em] text-white/90">
                  {selectedSceneLabel ? selectedSceneLabel : "Preview Source"}
                </div>
                <div className="ml-3 text-[11px] font-medium text-white/38">
                  {previewProgramDifferent ? "Ready for transition" : "Mirrors program"}
                </div>
              </div>

              <div className="absolute bottom-2 right-2 z-30">
                <MonitorSignalMeter
                  label="Preview"
                  sourceReady={healthSnapshot.previewReady}
                  stageReady={healthSnapshot.stageReady}
                  transportHealth={transportHealth}
                />
              </div>
              {confidenceMonitorMode === "confidence" ? (
                <PresenterConfidenceCue key="preview" variant="preview" />
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
          <div
            className="group relative z-[999] flex h-full min-h-full cursor-col-resize items-stretch justify-center self-stretch select-none overflow-visible"
            onMouseDown={startSplitDrag}
            onDoubleClick={resetSplit}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize preview and program panes"
            aria-valuemin={32}
            aria-valuemax={68}
            aria-valuenow={previewPaneRounded}
          >
              <div className="producer-take-console relative flex w-full flex-col overflow-visible rounded-[10px] border border-white/[0.12] bg-[#0a101a] shadow-[0_12px_28px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.025)] transition-colors duration-200 group-hover:border-white/[0.20]">
                <div className="relative z-20 flex h-12 items-center justify-center border-b border-white/[0.06] px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/48">
                  Take
                </div>

                <div className="relative z-20 flex flex-1 flex-col items-center justify-center gap-2 px-1.5 py-3">
                  <button
                    type="button"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      runAutoTransition();
                    }}
                    disabled={takeBusy || isAutoRunning || !previewProgramDifferent}
                    className={`relative flex h-[92px] w-[78px] flex-col items-center justify-center rounded-[13px] border text-center transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
                      previewProgramDifferent
                        ? "border-sky-200/55 bg-[#0f4d91] text-white shadow-[0_0_24px_rgba(37,99,235,0.24),inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-[#145ca8]"
                        : "border-white/10 bg-white/[0.035] text-white/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <span aria-hidden="true" className="mb-1 text-[24px] font-light leading-none text-sky-100/90">→</span>
                    <span className="block text-[15px] font-semibold tracking-[0.06em]">
                      {isAutoRunning ? "RUN" : "TAKE"}
                    </span>
                  </button>

                  <div ref={transitionPopoverRef} className="relative">
                    <button
                      type="button"
                      aria-expanded={transitionPopoverOpen}
                      aria-haspopup="dialog"
                      aria-label={`Transition details, ${transitionDuration.toFixed(1)} seconds`}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        setTransitionPopoverOpen((current) => !current);
                      }}
                      className={`flex h-8 min-w-[64px] items-center justify-center gap-1 rounded-full border px-2 text-[11px] font-semibold tracking-[0.02em] transition ${
                        transitionPopoverOpen
                          ? "border-sky-300/35 bg-sky-400/[0.10] text-sky-100"
                          : "border-white/10 bg-white/[0.035] text-sky-100/72 hover:border-white/18 hover:bg-white/[0.055]"
                      }`}
                    >
                      {transitionDuration.toFixed(1)}s
                      <span aria-hidden="true" className="text-[10px] text-white/45">⌄</span>
                    </button>

                    {transitionPopoverOpen ? (
                      <div
                        role="dialog"
                        aria-label="Transition details"
                        onMouseDown={(event) => event.stopPropagation()}
                        className="absolute left-1/2 top-10 z-[120] w-[210px] -translate-x-1/2 rounded-[12px] border border-white/[0.14] bg-[#09121f]/98 p-3 text-left shadow-[0_18px_48px_rgba(0,0,0,0.58),0_0_24px_rgba(37,99,235,0.12)] backdrop-blur-xl"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/48">Transition</span>
                          <span className="text-[11px] font-semibold text-sky-200/86">{transitionDuration.toFixed(1)}s</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {SWITCHER_TRANSITION_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setTransitionPreset(preset.value)}
                              className={`rounded-[7px] border px-2 py-1.5 text-[10px] font-medium transition ${
                                selectedTransitionPreset === preset.value
                                  ? "border-sky-300/32 bg-sky-400/[0.10] text-sky-100"
                                  : "border-white/[0.07] bg-white/[0.025] text-white/52 hover:border-white/[0.13] hover:text-white/76"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[8px] font-bold uppercase tracking-[0.10em] text-white/30">Rate</span>
                          <input
                            type="range"
                            min={0.2}
                            max={2.5}
                            step={0.1}
                            value={transitionDuration}
                            onChange={(event) => updateTransitionDuration(Number(event.target.value))}
                            className="h-4 min-w-0 flex-1 cursor-pointer accent-sky-300"
                            aria-label="Transition duration"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onTake("cut", undefined, 0);
                    }}
                    disabled={takeBusy || !previewProgramDifferent}
                    className="mt-auto min-h-9 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/34 transition hover:text-white/66 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    CUT
                  </button>
                </div>
              </div>
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 rounded-full bg-white/[0.010] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <div className="producer-monitor producer-monitor--program relative flex h-full min-w-0 flex-col overflow-hidden rounded-[12px] border border-red-500 bg-[#14090d] p-0 shadow-[0_0_22px_rgba(239,68,68,0.15)]">
            <div className="producer-monitor__header flex h-14 items-center justify-between border-b border-red-400/35 bg-[#211018] px-5 text-[16px] font-semibold uppercase tracking-[0.10em] text-red-400">
              <div className="flex items-center gap-3">
                <span>Program</span>
                <span
                  className="whitespace-nowrap rounded-full border border-red-300/14 bg-black/24 px-2 py-1 text-[8px] font-bold normal-case tracking-[0.04em] text-red-100/50"
                  title={`Actual output: ${broadcastOutputProfileLabel(outputProfile)}`}
                >
                  {outputProfile.resolutionTier} · {outputProfile.frameRate} fps · {outputProfile.aspectRatio}
                </span>
              </div>
              <span className="inline-flex items-center rounded-[8px] border border-red-400/25 bg-red-500/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-red-300">
                {programState?.is_live ? "Live" : "Idle"}
              </span>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
            <div
              data-output-canvas="program"
              style={{ aspectRatio: outputProfile.aspectRatioValue }}
              className={`relative flex-none overflow-hidden border-0 bg-black ring-1 ring-inset ring-white/[0.06] transition-shadow duration-300 ${
                outputProfile.aspectRatioValue < 1
                  ? "h-full w-auto max-w-full"
                  : "h-auto max-h-full w-full"
              } ${
                isTransitioning
                  ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]"
                  : "shadow-[inset_0_0_0_1px_rgba(248,113,113,0.08)]"
              }`}
            >
              {!programState?.stage_participant_ids?.length && !programBlocks.some((block) => !block.hidden) ? (
                <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(var(--producer-brand-primary),0.16),transparent_34%),linear-gradient(135deg,#050b18_0%,#101a48_48%,#06162c_100%)] shadow-[inset_0_0_22px_rgba(0,0,0,0.55)]" />
              ) : null}
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
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <div className="absolute inset-0">
                      <EmptyMonitorState
                        title="Standing By"
                        subtitle="Preview is clear. Route a source, then TAKE when the next look is ready"
                      />
                    </div>
                  </div>
                ) : null}

                {!programHasCameraLayer && programState?.stage_participant_ids?.length ? (
                  <StageVideoPreview
                    stageState={programState}
                    participantIds={programState?.stage_participant_ids ?? []}
                    screenLayoutPreset={screenLayoutPreset}
                  />
                ) : null}

                {renderPlacedBlocks({
                  blocks: programBlocks,
                  opts: {
                    selectable: false,
                    showChrome: false,
                    liveRemove: true,
                    renderCameraSlotContent,
                  },
                  selectedBlockId,
                  setSelectedBlockId,
                  startDraggingBlock,
                  startResizingBlock,
                  deleteBlock: onRemoveProgramBlock,
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

              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 flex min-h-14 items-center border-t border-white/10 bg-[#07111d]/90 px-5 text-left backdrop-blur-md">
                <div className="text-[14px] font-medium tracking-[-0.01em] text-white/90">
                  Program Output
                </div>
                <div className="ml-3 text-[11px] font-medium text-white/38">
                  {programState?.is_live ? "Live to audience" : "Program standby"}
                </div>
              </div>

              <div className="absolute bottom-2 right-2 z-30">
                <MonitorSignalMeter
                  label="Program"
                  sourceReady={healthSnapshot.programReady}
                  stageReady={healthSnapshot.stageReady}
                  transportHealth={transportHealth}
                  live={Boolean(programState?.is_live)}
                />
              </div>
              {confidenceMonitorMode === "confidence" ? (
                <PresenterConfidenceCue key="program" variant="program" />
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
