import type { JSX } from "react"
import {
  Archive,
  Camera,
  CircleDot,
  Cpu,
  Globe2,
  Mic2,
  Radar,
  Radio,
  SatelliteDish,
  ScreenShare,
  ShieldCheck,
  Users,
} from "lucide-react"
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
      ? "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-100/52"
      : tone === "violet"
        ? "border-violet-300/10 bg-violet-400/[0.06] text-violet-100/52"
        : tone === "red"
          ? "border-red-300/10 bg-red-400/[0.06] text-red-100/52"
          : tone === "sky"
            ? "border-sky-300/10 bg-sky-400/[0.06] text-sky-100/52"
            : "border-white/8 bg-white/[0.024] text-white/42"

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border px-2 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.022)] ${toneClass}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.012)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative z-10 mx-auto flex h-7 w-7 items-center justify-center rounded-xl border border-white/7 bg-black/18 text-white/46">
        {icon}
      </div>
      <div className="relative z-10 mt-1.5 text-lg font-semibold tracking-tight text-white/78">
        {value}
      </div>
      <div className="relative z-10 mt-1 text-[9px] font-black uppercase tracking-[0.16em] opacity-48">
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
      ? "border-sky-300/10 bg-sky-400/[0.06] text-sky-100/52"
      : tone === "green"
        ? "border-emerald-300/10 bg-emerald-400/[0.06] text-emerald-100/52"
        : tone === "violet"
          ? "border-violet-300/10 bg-violet-400/[0.06] text-violet-100/52"
          : tone === "amber"
            ? "border-amber-300/10 bg-amber-400/[0.06] text-amber-100/52"
            : "border-white/8 bg-black/18 text-white/34"

  return (
    <div className={`group relative flex items-center gap-2 overflow-hidden rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] ${toneClass}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.012)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <span className="relative z-10 opacity-58">{icon}</span>
      <span className="relative z-10 text-white/30">{label}</span>
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
  return (
    <div className="group min-w-0 overflow-hidden rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.055),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.035),transparent_30%),linear-gradient(180deg,rgba(7,12,28,0.955),rgba(2,4,10,0.99))] p-2.5 shadow-[0_24px_86px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl transition duration-300 hover:border-white/11 hover:shadow-[0_28px_96px_rgba(0,0,0,0.48),0_0_20px_rgba(168,85,247,0.045)] lg:col-start-3">
      <div className="group relative mb-3 overflow-hidden rounded-[26px] border border-violet-300/9 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.05),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.032),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.01))] p-3 shadow-[0_18px_54px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.01)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/12 to-transparent" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-100/46">
              <Radio size={13} />
              Operations Rack
            </div>
            <div className="mt-1 text-lg font-semibold tracking-[-0.035em] text-white/80">
              Inspector and source controls
            </div>
            <div className="mt-1 text-xs leading-5 text-white/34">
              Manage contributors, layouts, and source monitoring.
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-400/[0.06] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/52 shadow-[0_0_8px_rgba(52,211,153,0.045)]">
            <CircleDot size={11} className="text-emerald-300/70" />
            {participants.length} Sources Ready
          </div>
        </div>

        <div className="relative z-10 mt-3 hidden flex-wrap gap-2 2xl:flex">
          <RailStatusChip
            icon={<SatelliteDish size={10} />}
            label="Signal"
            value="Stable"
            tone="green"
          />

          <RailStatusChip
            icon={<Globe2 size={10} />}
            label="Audience"
            value="Ready"
            tone="sky"
          />

          <RailStatusChip
            icon={<Cpu size={10} />}
            label="System"
            value="Normal"
            tone="amber"
          />

          <RailStatusChip
            icon={<Radar size={10} />}
            label="Control"
            value="Stable"
            tone="violet"
          />
        </div>

        <div className="relative z-10 mt-3 grid grid-cols-4 gap-1.5 text-center">
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

        <div className="relative z-10 mt-3 hidden grid-cols-2 gap-2 2xl:grid">
          <div className="flex items-center gap-2 rounded-2xl border border-red-300/12 bg-red-400/8 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-red-100/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <Archive size={12} />
            ISO Capture Ready
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-emerald-300/12 bg-emerald-400/8 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <ShieldCheck size={12} />
            Confidence Ready
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-sky-300/12 bg-sky-400/8 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-sky-100/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <Radar size={12} />
            Monitoring Active
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-violet-300/12 bg-violet-400/8 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <SatelliteDish size={12} />
            Signal Stable
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.01))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.022)]">
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