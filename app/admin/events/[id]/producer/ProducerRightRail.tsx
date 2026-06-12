import { useRef, useState, type JSX } from "react"
import {
  Camera,
  Mic2,
  ScreenShare,
  ShieldCheck,
  ThumbsUp,
  Users,
} from "lucide-react"
const PARTICIPANT_ACCENT_STYLES = [
  {
    id: "violet",
    rgb: "168,85,247",
    swatch: "bg-violet-300",
    ring: "border-violet-300/55",
    glow: "shadow-[0_0_22px_rgba(168,85,247,0.34)]",
    card: "border-violet-400/34",
    cardGlow: "shadow-[0_0_30px_rgba(168,85,247,0.18)]",
  },
  {
    id: "cyan",
    rgb: "34,211,238",
    swatch: "bg-cyan-300",
    ring: "border-cyan-300/55",
    glow: "shadow-[0_0_22px_rgba(34,211,238,0.34)]",
    card: "border-cyan-400/34",
    cardGlow: "shadow-[0_0_30px_rgba(34,211,238,0.16)]",
  },
  {
    id: "green",
    rgb: "16,185,129",
    swatch: "bg-emerald-300",
    ring: "border-emerald-300/55",
    glow: "shadow-[0_0_22px_rgba(16,185,129,0.30)]",
    card: "border-emerald-400/30",
    cardGlow: "shadow-[0_0_30px_rgba(16,185,129,0.14)]",
  },
  {
    id: "amber",
    rgb: "251,191,36",
    swatch: "bg-amber-300",
    ring: "border-amber-300/55",
    glow: "shadow-[0_0_22px_rgba(251,191,36,0.30)]",
    card: "border-amber-400/30",
    cardGlow: "shadow-[0_0_30px_rgba(251,191,36,0.14)]",
  },
  {
    id: "rose",
    rgb: "244,63,94",
    swatch: "bg-rose-300",
    ring: "border-rose-300/55",
    glow: "shadow-[0_0_22px_rgba(244,63,94,0.30)]",
    card: "border-rose-400/30",
    cardGlow: "shadow-[0_0_30px_rgba(244,63,94,0.14)]",
  },
] as const
type ParticipantAccentId = (typeof PARTICIPANT_ACCENT_STYLES)[number]["id"]
type ParticipantGlowLevel = "low" | "med" | "high"
type ParticipantOutlineWeight = "soft" | "standard" | "bold"
type ParticipantAppearanceOverride = {
  accentId?: ParticipantAccentId
  glowLevel?: ParticipantGlowLevel
  outlineWeight?: ParticipantOutlineWeight
}

const PARTICIPANT_GLOW_LEVELS: Array<{
  id: ParticipantGlowLevel
  label: string
}> = [
  { id: "low", label: "Low" },
  { id: "med", label: "Med" },
  { id: "high", label: "High" },
]

const PARTICIPANT_OUTLINE_WEIGHTS: Array<{
  id: ParticipantOutlineWeight
  label: string
}> = [
  { id: "soft", label: "Soft" },
  { id: "standard", label: "Std" },
  { id: "bold", label: "Bold" },
]

const PARTICIPANT_GLOW_OPACITY: Record<ParticipantGlowLevel, number> = {
  low: 0.18,
  med: 0.36,
  high: 0.62,
}

const PARTICIPANT_CARD_GLOW_OPACITY: Record<ParticipantGlowLevel, number> = {
  low: 0.10,
  med: 0.18,
  high: 0.32,
}

const PARTICIPANT_OUTLINE_WIDTH: Record<ParticipantOutlineWeight, number> = {
  soft: 1,
  standard: 2,
  bold: 3,
}
function InspectorParticipantRow({
  participant,
  role,
  onStage,
  screenTrackSid,
  selectedAccentId,
  selectedGlowLevel,
  selectedOutlineWeight,
  onSetAccentColor,
  onSetGlowLevel,
  onSetOutlineWeight,
  onAddToStage,
  onRemoveFromStage,
  onSetPrimary,
  onSetScreenShare,
}: {
  participant: ProducerParticipant
  role: string
  onStage: boolean
  screenTrackSid: string | null
  selectedAccentId?: string | null
  selectedGlowLevel?: ParticipantGlowLevel | null
  selectedOutlineWeight?: ParticipantOutlineWeight | null
  onSetAccentColor: (identity: string, accentId: ParticipantAccentId) => void
  onSetGlowLevel: (identity: string, glowLevel: ParticipantGlowLevel) => void
  onSetOutlineWeight: (identity: string, outlineWeight: ParticipantOutlineWeight) => void
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
  const fallbackAccentStyle =
    PARTICIPANT_ACCENT_STYLES[
      Math.abs(participant.identity.length) % PARTICIPANT_ACCENT_STYLES.length
    ]
  const accentStyle =
    PARTICIPANT_ACCENT_STYLES.find((style) => style.id === selectedAccentId) ??
    fallbackAccentStyle
  const glowLevel = selectedGlowLevel ?? "med"
  const outlineWeight = selectedOutlineWeight ?? "standard"
  const glowOpacity = PARTICIPANT_GLOW_OPACITY[glowLevel]
  const cardGlowOpacity = PARTICIPANT_CARD_GLOW_OPACITY[glowLevel]
  const outlineWidth = PARTICIPANT_OUTLINE_WIDTH[outlineWeight]
  const [visualControlsOpen, setVisualControlsOpen] = useState(false)

  return (
    <div
      className={`group/participant rounded-[16px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.008))] px-2.5 py-2 transition hover:bg-white/[0.036] ${accentStyle.card}`}
      style={{
        borderColor: `rgba(${accentStyle.rgb}, ${outlineWeight === "soft" ? 0.24 : 0.46})`,
        borderWidth: outlineWidth,
        boxShadow: `0 6px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.012), 0 0 ${glowLevel === "high" ? 44 : glowLevel === "med" ? 30 : 18}px rgba(${accentStyle.rgb}, ${cardGlowOpacity})`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.34),rgba(56,189,248,0.16)_38%,rgba(15,23,42,0.82)_80%)] text-[11px] font-black text-white/78 ${accentStyle.ring}`}
            style={{
              borderColor: `rgba(${accentStyle.rgb}, ${outlineWeight === "soft" ? 0.42 : 0.78})`,
              borderWidth: outlineWidth,
              boxShadow: `0 0 ${glowLevel === "high" ? 34 : glowLevel === "med" ? 22 : 12}px rgba(${accentStyle.rgb}, ${glowOpacity})`,
            }}
          >
            {initials}
          </div>

          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold tracking-[-0.02em] text-white/82">
              {participant.name || participant.identity}
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/34">
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
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] transition ${
            onStage
              ? "border-red-300/12 bg-red-400/[0.045] text-red-100/54 hover:bg-red-400/[0.08]"
              : "border-emerald-300/12 bg-emerald-400/[0.065] text-emerald-100/62 hover:bg-emerald-400/[0.11]"
          }`}
        >
          {onStage ? "Remove" : "Stage"}
        </button>
      </div>

      <div className="mt-2 rounded-[11px] border border-white/[0.040] bg-black/18">
        <button
          type="button"
          onClick={() => setVisualControlsOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left transition hover:bg-white/[0.025]"
        >
          <span className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full border border-white/18 ${accentStyle.swatch}`}
            />
            <span className="text-[7px] font-black uppercase tracking-[0.12em] text-white/34">
              Visual Accent
            </span>
          </span>

          <span className="text-[7px] font-black uppercase tracking-[0.10em] text-white/28">
            {visualControlsOpen ? "Hide" : "Edit"}
          </span>
        </button>

        {visualControlsOpen ? (
          <div className="border-t border-white/[0.040] p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[7px] font-black uppercase tracking-[0.12em] text-white/28">
                Accent
              </span>
              <div className="flex items-center gap-1">
                {PARTICIPANT_ACCENT_STYLES.map((style) => {
                  const isSelected = style.id === accentStyle.id

                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => onSetAccentColor(participant.identity, style.id)}
                      className={`h-4 w-4 rounded-full border transition hover:scale-110 ${style.swatch} ${
                        isSelected
                          ? "border-white/80 shadow-[0_0_12px_rgba(255,255,255,0.22)]"
                          : "border-white/18 opacity-70 hover:opacity-100"
                      }`}
                      title={`Set ${style.id} accent`}
                    />
                  )
                })}
              </div>
            </div>

            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="rounded-[11px] border border-white/[0.040] bg-black/18 px-2 py-1.5">
                <div className="text-[7px] font-black uppercase tracking-[0.12em] text-white/28">
                  Outline
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {PARTICIPANT_OUTLINE_WEIGHTS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSetOutlineWeight(participant.identity, item.id)}
                      className={`rounded-md border px-1 py-1 text-[7px] font-black uppercase tracking-[0.08em] transition ${
                        outlineWeight === item.id
                          ? "border-white/26 bg-white/[0.10] text-white/78"
                          : "border-white/[0.04] bg-white/[0.018] text-white/32 hover:bg-white/[0.04] hover:text-white/58"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[11px] border border-white/[0.040] bg-black/18 px-2 py-1.5">
                <div className="text-[7px] font-black uppercase tracking-[0.12em] text-white/28">
                  Glow
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {PARTICIPANT_GLOW_LEVELS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSetGlowLevel(participant.identity, item.id)}
                      className={`rounded-md border px-1 py-1 text-[7px] font-black uppercase tracking-[0.08em] transition ${
                        glowLevel === item.id
                          ? "border-white/26 bg-white/[0.10] text-white/78"
                          : "border-white/[0.04] bg-white/[0.018] text-white/32 hover:bg-white/[0.04] hover:text-white/58"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => {
            onAddToStage(participant.identity)
          }}
          className={`flex items-center justify-center gap-1 rounded-[10px] border px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] transition ${
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
          className={`flex items-center justify-center gap-1 rounded-[10px] border px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] transition ${
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
          className={`flex items-center justify-center gap-1 rounded-[10px] border px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] transition ${
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
  previewBlocks,
  selectedBlockId,
  onSelectBlock,
  onToggleLayerHidden,
  onMoveLayerForward,
  onMoveLayerBackward,
  onReorderLayers,
  onToggleHidden,
  onToggleLocked,
  onUpdateOpacity,
  onUpdateScale,
  onUpdateRotation,
  onUpdateBlur,
  onUpdateGlow,
  onUpdateGlowColor,
  onUpdateBorderRadius,
  onUpdateShadowIntensity,
  onUpdateShadowColor,
  onUpdateLabel,
  onUpdateBlendMode,
  onUpdateGroupId,
  onUpdateTimelineStart,
  onUpdateTimelineDuration,
  onUpdateAnimationType,
  onUpdateAnimationProgress,
  onUpdatePosition,
  onUpdateSize,
  onUpdateSrc,
  onUpdateTextContent,
  onAssignParticipantToCameraSlot,
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
  previewBlocks: PreviewBlock[]
  selectedBlockId: string | null
  onSelectBlock: (blockId: string) => void
  onToggleLayerHidden: (blockId: string) => void
  onMoveLayerForward: (blockId: string) => void
  onMoveLayerBackward: (blockId: string) => void
  onReorderLayers: (orderedBlockIds: string[]) => void
  onToggleHidden: () => void
  onToggleLocked: () => void
  onUpdateOpacity: (value: string) => void
  onUpdateScale: (value: string) => void
  onUpdateRotation: (value: string) => void
  onUpdateBlur: (value: string) => void
  onUpdateGlow: (value: string) => void
  onUpdateGlowColor: (value: string) => void
  onUpdateBorderRadius: (value: string) => void
  onUpdateShadowIntensity: (value: string) => void
  onUpdateShadowColor: (value: string) => void
  onUpdateLabel: (value: string) => void
  onUpdateBlendMode: (value: string) => void
  onUpdateGroupId: (value: string) => void
  onUpdateTimelineStart: (value: string) => void
  onUpdateTimelineDuration: (value: string) => void
  onUpdateAnimationType: (value: string) => void
  onUpdateAnimationProgress: (value: string) => void
  onUpdatePosition: (field: "x" | "y", value: string) => void
  onUpdateSize: (field: "width" | "height", value: string) => void
  onUpdateSrc: (value: string) => void
  onUpdateTextContent: (value: string) => void
  onAssignParticipantToCameraSlot: (blockId: string, participantId: string | null) => void
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
  const [participantAppearanceOverrides, setParticipantAppearanceOverrides] =
    useState<Record<string, ParticipantAppearanceOverride>>({})

  function handleSetParticipantAccentColor(
    identity: string,
    accentId: ParticipantAccentId,
  ): void {
    setParticipantAppearanceOverrides((current) => ({
      ...current,
      [identity]: {
        ...current[identity],
        accentId,
      },
    }))
  }

  function handleSetParticipantGlowLevel(
    identity: string,
    glowLevel: ParticipantGlowLevel,
  ): void {
    setParticipantAppearanceOverrides((current) => ({
      ...current,
      [identity]: {
        ...current[identity],
        glowLevel,
      },
    }))
  }

  function handleSetParticipantOutlineWeight(
    identity: string,
    outlineWeight: ParticipantOutlineWeight,
  ): void {
    setParticipantAppearanceOverrides((current) => ({
      ...current,
      [identity]: {
        ...current[identity],
        outlineWeight,
      },
    }))
  }
  const defaultRailTab = previewBlocks.length > 0 || selectedBlock ? "Blocks" : "Stage"
  const [activeRailTab, setActiveRailTab] = useState(defaultRailTab)
  const blocksSectionRef = useRef<HTMLDivElement | null>(null)
  const stageSectionRef = useRef<HTMLDivElement | null>(null)
  const talentSectionRef = useRef<HTMLDivElement | null>(null)

  function scrollToRailSection(tab: "Stage" | "Talent" | "Blocks"): void {
    setActiveRailTab(tab)

    const targetRef =
      tab === "Blocks"
        ? blocksSectionRef
        : tab === "Talent"
          ? talentSectionRef
          : stageSectionRef

    targetRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }
  const audienceCount = Math.max(participants.length * 611, 2462)
  return (
    <div className="group flex h-full min-w-0 flex-col gap-2 overflow-hidden border-l border-white/[0.055] bg-[linear-gradient(180deg,rgba(5,9,18,0.94),rgba(2,4,9,0.995))] p-2 shadow-[inset_1px_0_0_rgba(255,255,255,0.018)] backdrop-blur-2xl lg:col-start-3">
      

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[20px] border border-white/[0.045] bg-[linear-gradient(180deg,rgba(7,12,24,0.72),rgba(3,7,15,0.92))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)] scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="sticky top-0 z-30 -mx-2.5 -mt-2.5 flex items-center justify-between gap-2 border-b border-white/[0.045] bg-[linear-gradient(180deg,rgba(7,12,24,0.96),rgba(7,12,24,0.86))] px-2.5 pb-2 pt-2.5 backdrop-blur-xl">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/52">
              Right Rail
            </div>
            <div className="mt-1 grid grid-cols-3 gap-0.5 rounded-[10px] border border-white/[0.04] bg-white/[0.014] p-0.5">
              {[
                "Stage",
                "Talent",
                "Blocks",
              ].map((tab, index) => (
                <button
                  key={`${tab}-${index}`}
                  type="button"
                  onClick={() => scrollToRailSection(tab as "Stage" | "Talent" | "Blocks")}
                  className={`rounded-[8px] px-1.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] transition ${
                    tab === activeRailTab
                      ? "border border-sky-300/16 bg-sky-400/[0.12] text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.08)]"
                      : "border border-white/[0.035] bg-white/[0.018] text-white/40 hover:bg-white/[0.035] hover:text-white/62"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedBlock || previewBlocks.length > 0 ? (
          <div ref={blocksSectionRef} className="scroll-mt-16 border-t border-sky-300/[0.075] pt-3">
            <RightInspectorRail
              selectedBlock={selectedBlock}
              previewBlocks={previewBlocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
              onToggleLayerHidden={onToggleLayerHidden}
              onMoveLayerForward={onMoveLayerForward}
              onMoveLayerBackward={onMoveLayerBackward}
              onReorderLayers={onReorderLayers}
              onToggleHidden={onToggleHidden}
              onToggleLocked={onToggleLocked}
              onUpdateOpacity={onUpdateOpacity}
              onUpdateScale={onUpdateScale}
              onUpdateRotation={onUpdateRotation}
              onUpdateBlur={onUpdateBlur}
              onUpdateGlow={onUpdateGlow}
              onUpdateGlowColor={onUpdateGlowColor}
              onUpdateBorderRadius={onUpdateBorderRadius}
              onUpdateShadowIntensity={onUpdateShadowIntensity}
              onUpdateShadowColor={onUpdateShadowColor}
              onUpdateLabel={onUpdateLabel}
              onUpdateBlendMode={onUpdateBlendMode}
              onUpdateGroupId={onUpdateGroupId}
              onUpdateTimelineStart={onUpdateTimelineStart}
              onUpdateTimelineDuration={onUpdateTimelineDuration}
              onUpdateAnimationType={onUpdateAnimationType}
              onUpdateAnimationProgress={onUpdateAnimationProgress}
              onUpdatePosition={onUpdatePosition}
              onUpdateSize={onUpdateSize}
              onUpdateSrc={onUpdateSrc}
              onUpdateTextContent={onUpdateTextContent}
              onAssignParticipantToCameraSlot={onAssignParticipantToCameraSlot}
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
        ) : null}

        <div ref={stageSectionRef} className="scroll-mt-16 border-t border-white/[0.035] pt-3">
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

        <div className="mt-5 border-t border-white/[0.05] pt-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
                On Stage
              </div>
              <div className="mt-1 text-[20px] font-semibold tracking-[-0.05em] text-white/90">
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
                  selectedAccentId={participant.accentColor ?? participantAppearanceOverrides[participant.identity]?.accentId ?? null}
                  selectedGlowLevel={participantAppearanceOverrides[participant.identity]?.glowLevel ?? null}
                  selectedOutlineWeight={participantAppearanceOverrides[participant.identity]?.outlineWeight ?? null}
                  onSetAccentColor={handleSetParticipantAccentColor}
                  onSetGlowLevel={handleSetParticipantGlowLevel}
                  onSetOutlineWeight={handleSetParticipantOutlineWeight}
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

        <div ref={talentSectionRef} className="scroll-mt-16 border-t border-white/[0.045] pt-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
                Talent / Backstage
              </div>
              <div className="mt-1 text-[19px] font-semibold tracking-[-0.05em] text-white/88">
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
                  selectedAccentId={participant.accentColor ?? participantAppearanceOverrides[participant.identity]?.accentId ?? null}
                  selectedGlowLevel={participantAppearanceOverrides[participant.identity]?.glowLevel ?? null}
                  selectedOutlineWeight={participantAppearanceOverrides[participant.identity]?.outlineWeight ?? null}
                  onSetAccentColor={handleSetParticipantAccentColor}
                  onSetGlowLevel={handleSetParticipantGlowLevel}
                  onSetOutlineWeight={handleSetParticipantOutlineWeight}
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

        <div className="hidden">
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

        <div className="hidden">
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

        <div className="hidden">
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

        {/* Block inspector section removed as per instructions */}
      </div>
    </div>
  )
}