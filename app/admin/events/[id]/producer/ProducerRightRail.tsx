import { useState, type JSX } from "react"
import {
  Archive,
  Camera,
  CircleDot,
  Mic2,
  Radio,
  ScreenShare,
  ShieldCheck,
  ThumbsUp,
  Users,
} from "lucide-react"
function InspectorParticipantRow({
  participant,
  role,
  onStage,
  screenTrackSid,
  onAddToStage,
  onRemoveFromStage,
  onSetPrimary,
  onSetScreenShare,
}: {
  participant: ProducerParticipant
  role: string
  onStage: boolean
  screenTrackSid: string | null
  onAddToStage: (identity: string) => void
  onRemoveFromStage: (identity: string) => void
  onSetPrimary: (identity: string) => void
  onSetScreenShare: (participantId: string, trackId: string) => void
}): JSX.Element {
  const initials = (participant.name || participant.identity || "G")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const cameraOn = Boolean(participant.cameraEnabled)
  const micOn = Boolean(participant.micEnabled)
  const screenReady = Boolean(screenTrackSid || participant.screenShareEnabled)

  return (
    <div className="group/participant rounded-[13px] border border-white/[0.035] bg-white/[0.018] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.010)] transition hover:border-white/[0.075] hover:bg-white/[0.028]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-black text-white/72 shadow-[0_0_10px_rgba(16,185,129,0.10)] ${
            onStage
              ? "border-emerald-200/14 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.42),rgba(16,185,129,0.24)_38%,rgba(15,23,42,0.80)_80%)]"
              : "border-sky-200/10 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.34),rgba(56,189,248,0.16)_38%,rgba(15,23,42,0.82)_80%)]"
          }`}>
            {initials}
          </div>

          <div className="min-w-0">
            <div className="truncate text-[10px] font-semibold tracking-[-0.02em] text-white/70">
              {participant.name || participant.identity}
            </div>
            <div className="mt-px text-[8px] font-semibold text-white/26">
              {role}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onStage) {
              onRemoveFromStage(participant.identity)
              return
            }

            onAddToStage(participant.identity)
          }}
          className={`shrink-0 rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.08em] transition ${
            onStage
              ? "border-red-300/12 bg-red-400/[0.045] text-red-100/54 hover:bg-red-400/[0.08]"
              : "border-emerald-300/12 bg-emerald-400/[0.065] text-emerald-100/62 hover:bg-emerald-400/[0.11]"
          }`}
        >
          {onStage ? "Remove" : "Stage"}
        </button>
      </div>

      <div className="mt-1.5 grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => {
            onAddToStage(participant.identity)
          }}
          className={`flex items-center justify-center gap-1 rounded-[8px] border px-1.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] transition ${
            cameraOn
              ? "border-emerald-300/10 bg-emerald-400/[0.060] text-emerald-100/62 hover:bg-emerald-400/[0.10]"
              : "border-white/[0.04] bg-white/[0.020] text-white/42 hover:bg-white/[0.035] hover:text-white/62"
          }`}
          title="Send participant camera to stage"
        >
          <Camera size={10} />
          {cameraOn ? "Cam" : "Cam"}
        </button>

        <button
          type="button"
          onClick={() => onAddToStage(participant.identity)}
          className={`flex items-center justify-center gap-1 rounded-[8px] border px-1.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] transition ${
            micOn
              ? "border-emerald-300/10 bg-emerald-400/[0.060] text-emerald-100/62 hover:bg-emerald-400/[0.10]"
              : "border-white/[0.04] bg-white/[0.020] text-white/42 hover:bg-white/[0.035] hover:text-white/62"
          }`}
          title="Send participant audio to stage"
        >
          <Mic2 size={10} />
          {micOn ? "Mic" : "Mic"}
        </button>

        <button
          type="button"
          onClick={() => {
            onAddToStage(participant.identity)
            if (screenTrackSid) {
              window.setTimeout(() => {
                onSetScreenShare(participant.identity, screenTrackSid)
              }, 120)
            }
          }}
          className={`flex items-center justify-center gap-1 rounded-[8px] border px-1.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] transition ${
            screenReady
              ? "border-sky-300/10 bg-sky-400/[0.060] text-sky-100/62 hover:bg-sky-400/[0.10]"
              : "border-white/[0.04] bg-white/[0.020] text-white/42 hover:bg-white/[0.035] hover:text-white/62"
          }`}
          title={screenTrackSid ? "Send screen share to stage" : "Send participant to stage"}
        >
          <ScreenShare size={10} />
          Share
        </button>
      </div>
    </div>
  )
}

function EngagementSparkline(): JSX.Element {
  return (
    <div className="mt-2 h-12 rounded-[14px] border border-white/[0.035] bg-black/12 px-2 py-2">
      <svg viewBox="0 0 180 42" className="h-full w-full overflow-visible">
        <path
          d="M0 30 C12 22 18 20 28 23 C42 28 48 18 62 22 C78 26 82 12 96 18 C110 24 116 6 132 10 C148 14 150 20 164 14 C172 10 176 9 180 8"
          fill="none"
          stroke="rgba(52,211,153,0.85)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M0 30 C12 22 18 20 28 23 C42 28 48 18 62 22 C78 26 82 12 96 18 C110 24 116 6 132 10 C148 14 150 20 164 14 C172 10 176 9 180 8 L180 42 L0 42 Z"
          fill="rgba(52,211,153,0.08)"
        />
      </svg>
    </div>
  )
}
import RightInspectorRail from "./RightInspectorRail"
import type { PreviewBlock } from "./useProducerBlocks"
import type { ProducerParticipant, StageState } from "./producerRoomTypes"

function RightRailMetric({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: JSX.Element
  label: string
  value: string | number
  tone?: "neutral" | "green" | "violet" | "red" | "sky"
}): JSX.Element {
  const toneClass =
    tone === "green"
      ? "border-emerald-300/8 bg-emerald-400/[0.04] text-emerald-100/42"
      : tone === "violet"
        ? "border-violet-300/8 bg-violet-400/[0.04] text-violet-100/42"
        : tone === "red"
          ? "border-red-300/8 bg-red-400/[0.04] text-red-100/42"
          : tone === "sky"
            ? "border-sky-300/8 bg-sky-400/[0.04] text-sky-100/42"
            : "border-white/6 bg-white/[0.024] text-white/34"

  return (
    <div
      className={`group relative overflow-hidden rounded-[11px] border px-1.5 py-1 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.014)] ${toneClass}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.006)_42%,transparent_64%)] opacity-18 transition-opacity duration-500 group-hover:opacity-36" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent" />
      <div className="relative z-10 mx-auto flex h-5 w-5 items-center justify-center rounded-md border border-white/6 bg-white/[0.020] text-white/30">
        {icon}
      </div>
      <div className="relative z-10 mt-px text-[12px] font-semibold tracking-tight text-white/50">
        {value}
      </div>
      <div className="relative z-10 mt-px text-[7px] font-black uppercase tracking-[0.09em] opacity-30">
        {label}
      </div>
    </div>
  )
}

function RailStatusChip({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: JSX.Element
  label: string
  value: string
  tone?: "neutral" | "sky" | "green" | "violet" | "amber"
}): JSX.Element {
  const toneClass =
    tone === "sky"
      ? "border-sky-300/12 bg-sky-400/[0.07] text-sky-100/46"
      : tone === "green"
        ? "border-emerald-300/12 bg-emerald-400/[0.07] text-emerald-100/46"
        : tone === "violet"
          ? "border-violet-300/12 bg-violet-400/[0.07] text-violet-100/46"
          : tone === "amber"
            ? "border-amber-300/12 bg-amber-400/[0.07] text-amber-100/46"
            : "border-white/6 bg-white/[0.022] text-white/30"

  return (
    <div className={`group relative flex items-center gap-1 overflow-hidden rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.09em] ${toneClass}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.006)_42%,transparent_64%)] opacity-18 transition-opacity duration-500 group-hover:opacity-36" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent" />

      <span className="relative z-10 opacity-70">{icon}</span>
      <span className="relative z-10 text-white/42">{label}</span>
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {tone !== "neutral" ? (
          <span
            className={`h-1.5 w-1.5 rounded-full animate-pulse ${
              tone === "sky"
                ? "bg-sky-300/75 shadow-[0_0_5px_rgba(125,211,252,0.32)]"
                : tone === "green"
                  ? "bg-emerald-300/75 shadow-[0_0_5px_rgba(110,231,183,0.32)]"
                  : tone === "violet"
                    ? "bg-violet-300/75 shadow-[0_0_5px_rgba(196,181,253,0.32)]"
                    : "bg-amber-300/75 shadow-[0_0_5px_rgba(252,211,77,0.28)]"
            }`}
          />
        ) : null}

        {value}
      </span>
    </div>
  )
}

function RailDrawer({
  title,
  sub,
  icon,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string
  sub: string
  icon: JSX.Element
  meta?: string
  defaultOpen?: boolean
  children: JSX.Element
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[15px] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(255,255,255,0.009),rgba(255,255,255,0.003))] shadow-[0_4px_14px_rgba(0,0,0,0.075),inset_0_1px_0_rgba(255,255,255,0.010)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative z-10 flex w-full items-center justify-between gap-2 px-1.5 py-1 text-left transition hover:bg-white/[0.010]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/5 bg-white/[0.014] text-white/22">
            {icon}
          </span>

          <span className="min-w-0">
            <span className="block text-[8px] font-black uppercase tracking-[0.09em] text-white/20">
              {title}
            </span>
            <span className="mt-px block truncate text-[9px] font-semibold text-white/14">
              {sub}
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1 text-[7px] font-black uppercase tracking-[0.08em] text-white/14">
          {meta ? (
            <span className="rounded-full border border-white/5 bg-white/[0.012] px-1.5 py-0.5">
              {meta}
            </span>
          ) : null}
          <span className="rounded-full border border-white/5 bg-white/[0.012] px-1.5 py-0.5">
            {open ? "Hide" : "Open"}
          </span>
        </span>
      </button>

      {open ? (
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto border-t border-white/[0.028] px-1.25 pb-1.25 pt-1">
          {children}
        </div>
      ) : null}
    </div>
  )
}

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
  const cameraCount = participants.filter((p) => p.cameraEnabled).length
  const micCount = participants.filter((p) => p.micEnabled).length
  const screenCount = participants.filter((p) => p.screenShareEnabled).length
  const selectedBlockLabel = selectedBlock?.label || selectedBlock?.type || "No block selected"
  const sourceHealthLabel = participants.length > 0 ? "Sources online" : "Waiting for sources"
  const stageReadinessLabel = stageIds.size > 0 ? "Stage populated" : "Stage empty"
  const sourceBadgeLabel = participants.length > 0 ? `${participants.length} Sources Ready` : "No Sources Yet"
  const sourceBadgeToneClass = participants.length > 0
    ? "border-emerald-300/12 bg-emerald-400/[0.075] text-emerald-100/64 shadow-[0_0_10px_rgba(52,211,153,0.055)]"
    : "border-amber-300/12 bg-amber-400/[0.07] text-amber-100/62 shadow-[0_0_10px_rgba(251,191,36,0.045)]"
  const sourceBadgeDotClass = participants.length > 0
    ? "text-emerald-300/78"
    : "text-amber-300/78"
  const inspectorToneClass = selectedBlock
    ? "border-sky-300/10 bg-sky-400/[0.045]"
    : "border-white/8 bg-black/12"
  const featuredParticipants = participants.slice(0, 4)
  const onStageParticipants = participants.filter((participant) => stageIds.has(participant.identity))
  const backstageParticipants = participants.filter((participant) => !stageIds.has(participant.identity))
  const participantRole = (index: number): string =>
    index === 0 ? "Host" : index === 1 ? "Presenter" : index === 2 ? "Speaker" : "Guest"
  const fallbackParticipants: Array<{ name: string; role: string }> = [
    { name: "Jane Cooper", role: "Host" },
    { name: "Wade Warren", role: "Presenter" },
    { name: "Cameron Williamson", role: "Speaker" },
    { name: "Brooklyn Simmons", role: "Guest" },
  ]
  const backstageCount = participants.length > 0 ? backstageParticipants.length : 6
  const audienceCount = Math.max(participants.length * 611, 2462)
  return (
    <div className="group flex h-full min-w-0 flex-col gap-1.5 overflow-hidden border-l border-white/[0.045] bg-[linear-gradient(180deg,rgba(9,14,24,0.86),rgba(4,7,14,0.96))] p-1.5 shadow-[inset_1px_0_0_rgba(255,255,255,0.010)] backdrop-blur-2xl lg:col-start-3">
      <div className="group relative hidden overflow-hidden rounded-[16px] border border-white/[0.045] bg-[linear-gradient(180deg,rgba(255,255,255,0.010),rgba(255,255,255,0.003))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.010)] 2xl:block">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.005)_42%,transparent_64%)] opacity-18 transition-opacity duration-500 group-hover:opacity-34" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/8 to-transparent" />
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/34">
              <Radio size={10} />
              Operations Rack
            </div>
            <div className="mt-px text-[9px] font-semibold tracking-[-0.02em] text-white/24">
              Sources and inspector.
            </div>
          </div>
          <div className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.07em] ${sourceBadgeToneClass}`}>
            <CircleDot size={9} className={sourceBadgeDotClass} />
            {sourceBadgeLabel}
          </div>
        </div>

        <div className="relative z-10 mt-2 grid grid-cols-2 gap-1.5 text-center 2xl:grid-cols-2">
          <RightRailMetric
            icon={<Users size={13} />}
            label="On Stage"
            value={stageIds.size}
            tone="sky"
          />

          <RightRailMetric
            icon={<Camera size={13} />}
            label="Cameras"
            value={cameraCount}
            tone="neutral"
          />

          <RightRailMetric
            icon={<Mic2 size={13} />}
            label="Audio"
            value={micCount}
            tone="green"
          />

          <RightRailMetric
            icon={<ScreenShare size={13} />}
            label="Shares"
            value={screenCount}
            tone="violet"
          />
        </div>

        <div className="relative z-10 mt-2 grid gap-1.5 rounded-[16px] border border-white/5 bg-white/[0.008] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.010)] xl:grid-cols-2">
          <div className={`rounded-xl border px-1.5 py-1 ${inspectorToneClass}`}>
            <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/24">
              Inspector Focus
            </div>
            <div className="mt-0.5 truncate text-[10px] font-semibold text-white/56">
              {selectedBlockLabel}
            </div>
          </div>

          <div className="rounded-xl border border-white/7 bg-white/[0.03] px-1.5 py-1">
            <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/24">
              Source Health
            </div>
            <div className="mt-0.5 truncate text-[10px] font-semibold text-white/56">
              {sourceHealthLabel}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-2 grid grid-cols-1 gap-1.5 xl:grid-cols-1">
          <div className="flex items-center gap-1.5 rounded-xl border border-red-300/10 bg-red-400/[0.04] px-1.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-red-100/56 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
            <Archive size={12} />
            ISO Capture Standby
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-300/10 bg-emerald-400/[0.04] px-1.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-emerald-100/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
            <ShieldCheck size={12} />
            {stageReadinessLabel}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[16px] border border-white/[0.035] bg-[linear-gradient(180deg,rgba(7,12,24,0.54),rgba(3,7,15,0.78))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.008)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/48">
              Inspector
            </div>
            <div className="mt-1 grid grid-cols-4 gap-0.5 rounded-[10px] border border-white/[0.035] bg-white/[0.012] p-0.5">
              {[
                "Stage",
                "Sources",
                "Talent",
                "Audio",
              ].map((tab, index) => (
                <button
                  key={`${tab}-${index}`}
                  type="button"
                  className={`rounded-[8px] px-1.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] transition ${
                    index === 0
                      ? "border border-emerald-300/16 bg-emerald-400/[0.12] text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.08)]"
                      : "border border-white/[0.035] bg-white/[0.018] text-white/40 hover:bg-white/[0.035] hover:text-white/62"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-white/[0.035] pt-2.5">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/38">
            Stage Status
          </div>
          <div className="mt-2 text-[13px] font-semibold tracking-[-0.03em] text-white/82">
            {stageIds.size > 0 ? "Stage is live" : "Stage is offline"}
          </div>
          <div className="mt-px text-[10px] font-medium text-white/46">
            {stageIds.size > 0 ? `${stageIds.size} source${stageIds.size === 1 ? "" : "s"} on stage` : "No one is on stage"}
          </div>
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] border border-emerald-300/12 bg-emerald-400/[0.075] px-3 py-1.5 text-[9px] font-black text-emerald-100/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)] hover:bg-emerald-400/[0.12]"
          >
            <ShieldCheck size={13} />
            Send to Stage
          </button>
        </div>

        <div className="mt-4 border-t border-white/[0.045] pt-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/38">
                On Stage
              </div>
              <div className="mt-1 text-[16px] font-semibold tracking-[-0.05em] text-white/86">
                {onStageParticipants.length} Ready
              </div>
            </div>
            <button type="button" className="text-[9px] font-black text-emerald-200/62 hover:text-emerald-100">
              Manage all →
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            {onStageParticipants.length > 0 ? (
              onStageParticipants.slice(0, 4).map((participant, index) => (
                <InspectorParticipantRow
                  key={participant.identity}
                  participant={participant}
                  role={participantRole(index)}
                  onStage
                  screenTrackSid={getScreenTrackSid(participant)}
                  onAddToStage={onAddToStage}
                  onRemoveFromStage={onRemoveFromStage}
                  onSetPrimary={onSetPrimary}
                  onSetScreenShare={onSetScreenShare}
                />
              ))
            ) : (
              <div className="rounded-[13px] border border-white/[0.035] bg-white/[0.014] px-2 py-2 text-[10px] font-semibold text-white/34">
                No talent is currently routed to stage.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-white/[0.045] pt-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/38">
                Talent / Backstage
              </div>
              <div className="mt-1 text-[15px] font-semibold tracking-[-0.05em] text-white/82">
                {backstageCount} In backstage
              </div>
            </div>
            <button type="button" className="text-[9px] font-black text-emerald-200/62 hover:text-emerald-100">
              View all →
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            {backstageParticipants.length > 0 ? (
              backstageParticipants.slice(0, 5).map((participant, index) => (
                <InspectorParticipantRow
                  key={participant.identity}
                  participant={participant}
                  role={participantRole(index)}
                  onStage={false}
                  screenTrackSid={getScreenTrackSid(participant)}
                  onAddToStage={onAddToStage}
                  onRemoveFromStage={onRemoveFromStage}
                  onSetPrimary={onSetPrimary}
                  onSetScreenShare={onSetScreenShare}
                />
              ))
            ) : participants.length > 0 ? (
              <div className="rounded-[13px] border border-white/[0.035] bg-white/[0.014] px-2 py-2 text-[10px] font-semibold text-white/34">
                Everyone is currently on stage.
              </div>
            ) : (
              fallbackParticipants.slice(0, 4).map((participant) => (
                <div
                  key={participant.name}
                  className="rounded-[13px] border border-white/[0.035] bg-white/[0.018] px-2 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-200/10 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.34),rgba(56,189,248,0.16)_38%,rgba(15,23,42,0.82)_80%)] text-[9px] font-black text-white/72">
                        {participant.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[10px] font-semibold tracking-[-0.02em] text-white/70">
                          {participant.name}
                        </div>
                        <div className="mt-px text-[8px] font-semibold text-white/26">
                          {participant.role}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/[0.04] bg-white/[0.014] px-2 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-white/30">
                      Demo
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="hidden mt-4 border-t border-white/[0.045] pt-3 2xl:block">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/38">
            Audience
          </div>
          <div className="mt-1 text-[15px] font-semibold tracking-[-0.05em] text-white/82">
            {audienceCount.toLocaleString()} connected
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {[
              ["👍", "1.2K"],
              ["👏", "980"],
              ["❤️", "642"],
              ["🔥", "398"],
            ].map(([emoji, value]) => (
              <div key={emoji} className="rounded-[10px] border border-white/[0.035] bg-white/[0.018] px-1.5 py-1 text-center text-[9px] font-black text-white/72">
                <span className="mr-1">{emoji}</span>
                {value}
              </div>
            ))}
          </div>
        </div>

        <div className="hidden mt-4 border-t border-white/[0.045] pt-3 2xl:block">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/38">
                Engagement
              </div>
              <div className="mt-1 text-[16px] font-semibold tracking-[-0.05em] text-white/86">
                92%
              </div>
            </div>
            <div className="text-[9px] font-black text-emerald-200/62">
              Active
            </div>
          </div>
          <EngagementSparkline />
          <div className="mt-1 flex justify-between text-[8px] font-semibold text-white/24">
            <span>-60m</span>
            <span>-30m</span>
            <span>Now</span>
          </div>
        </div>

        <div className="hidden mt-4 border-t border-white/[0.045] pt-3 2xl:block">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/38">
            Quick Actions
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              "Send Announcement",
              "Enable Applause",
              "Toggle Chat",
              "View Analytics",
            ].map((label) => (
              <button
                key={label}
                type="button"
                className="rounded-[10px] border border-white/[0.04] bg-white/[0.020] px-2 py-2 text-[9px] font-semibold text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.010)] hover:border-white/[0.08] hover:bg-white/[0.035] hover:text-white/82"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-white/[0.045] pt-3">
          <RailDrawer
            title="Block Controls"
            sub="Selected source and overlay settings."
            icon={<ThumbsUp size={11} />}
            meta={selectedBlock ? "Block" : "Source"}
            defaultOpen={false}
          >
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
          </RailDrawer>
        </div>
      </div>
    </div>
  )
}