import { useEffect, useState, type JSX } from "react"
import {
  Activity,
  Radio,
  Disc3,
  ShieldCheck,
  Zap,
  Keyboard,
  CheckCircle2,
  AudioLines,
  Headphones,
  Mic2,
  Route,
  ClipboardList,
  MonitorSpeaker,
  SatelliteDish,
  FileVideo,
  MessageSquare,
  PlayCircle,
  AlertTriangle,
  Clapperboard,
  Users,
  Timer,
  Layers3,
  Send,
  Eye,
  ChevronDown,
} from "lucide-react"

import {
  CONFIDENCE_MONITORING_METRICS,
  DEFAULT_RUNDOWN_CUES,
  IFB_CHANNELS,
  TRANSITION_OPTIONS,
  type CinematicTransitionType,
  type ConfidenceSeverity,
  type IFBChannelState,
  type RundownCueState,
  type TakeControlProps,
  type TakeMode,
} from "./commandDeckTypes"

import {
  BusBadge,
  CommandActionButton,
  CompactStatusGrid,
  ConfidenceTile,
  LevelMeter,
  PanelCard,
  PrimaryTakeButton,
  RoutingRow,
  StatusPill,
  SurfaceDivider,
  SurfaceHeader,
  TelemetryAccent,
} from "./CommandDeckChrome"

type CommandWorkspaceMode = "director" | "audio" | "ops" | "compact" | "custom"

type CommandSurfaceKey = "transport" | "transition" | "audio" | "routing" | "rundown"

const COMMAND_WORKSPACE_LABELS: Record<CommandWorkspaceMode, string> = {
  director: "Director",
  audio: "Audio",
  ops: "Ops",
  compact: "Compact",
  custom: "Custom",
}

const COMMAND_WORKSPACE_OPEN_STATE: Record<CommandWorkspaceMode, Record<CommandSurfaceKey, boolean>> = {
  director: {
    transport: true,
    transition: false,
    audio: false,
    routing: false,
    rundown: true,
  },
  audio: {
    transport: false,
    transition: false,
    audio: true,
    routing: false,
    rundown: false,
  },
  ops: {
    transport: true,
    transition: true,
    audio: true,
    routing: true,
    rundown: true,
  },
  compact: {
    transport: false,
    transition: false,
    audio: false,
    routing: false,
    rundown: false,
  },
  custom: {
    transport: true,
    transition: false,
    audio: false,
    routing: false,
    rundown: true,
  },
}

const COMMAND_SURFACE_STATUS_CHIPS: Array<{
  key: CommandSurfaceKey
  label: string
  activeClassName: string
}> = [
  {
    key: "transport",
    label: "Transport",
    activeClassName: "border-amber-300/14 bg-amber-400/8 text-amber-100/52",
  },
  {
    key: "transition",
    label: "Transition",
    activeClassName: "border-violet-300/14 bg-violet-400/8 text-violet-100/52",
  },
  {
    key: "audio",
    label: "Audio",
    activeClassName: "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/52",
  },
  {
    key: "routing",
    label: "Routing",
    activeClassName: "border-sky-300/14 bg-sky-400/8 text-sky-100/52",
  },
  {
    key: "rundown",
    label: "Rundown",
    activeClassName: "border-fuchsia-300/14 bg-fuchsia-400/8 text-fuchsia-100/52",
  },
]

const COMMAND_WORKSPACE_STORAGE_KEY = "jupiter.commandDeck.workspace.v1"

function getSystemPressureTone(
  pressure: SystemPressureState
): "safe" | "warning" | "danger" {
  if (pressure === "critical") return "danger"
  if (pressure === "watch") return "warning"
  return "safe"
}

function getSystemPressureSurfaceTone(
  pressure: SystemPressureState
): "red" | "amber" | "emerald" {
  if (pressure === "critical") return "red"
  if (pressure === "watch") return "amber"
  return "emerald"
}

function getSurfaceStatusLabel(openSurfaceCount: number): string {
  return openSurfaceCount === 0
    ? "All Surfaces Collapsed"
    : `${openSurfaceCount} Surfaces Open`
}

function getTransportStatusLabel(previewProgramDifferent: boolean): string {
  return previewProgramDifferent ? "Preview Ready" : "Program Matched"
}

function getSurfaceModeLabel({
  focusedSurface,
  workspaceMode,
}: {
  focusedSurface: CommandSurfaceKey | null
  workspaceMode: CommandWorkspaceMode
}): string {
  return focusedSurface
    ? `Focused · ${focusedSurface}`
    : COMMAND_WORKSPACE_LABELS[workspaceMode]
}

function CollapsibleSurface({
  title,
  eyebrow,
  status,
  tone = "neutral",
  defaultOpen = true,
  open: controlledOpen,
  isFocused = false,
  isDimmed = false,
  onFocus,
  onClearFocus,
  onOpenChange,
  children,
}: {
  title: string
  eyebrow: string
  status?: string
  tone?: "neutral" | "amber" | "emerald" | "sky" | "violet" | "red"
  defaultOpen?: boolean
  open?: boolean
  isFocused?: boolean
  isDimmed?: boolean
  onFocus?: () => void
  onClearFocus?: () => void
  onOpenChange?: (open: boolean) => void
  children: JSX.Element | JSX.Element[]
}): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = controlledOpen ?? internalOpen

  const toggleOpen = (): void => {
    const nextOpen = !open
    setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  const statusClassName =
    tone === "amber"
      ? "border-amber-300/14 bg-amber-400/8 text-amber-100/54"
      : tone === "emerald"
        ? "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/54"
        : tone === "sky"
          ? "border-sky-300/14 bg-sky-400/8 text-sky-100/54"
          : tone === "violet"
            ? "border-violet-300/14 bg-violet-400/8 text-violet-100/54"
            : tone === "red"
              ? "border-red-300/14 bg-red-400/8 text-red-100/54"
              : "border-white/10 bg-black/24 text-white/34"

  return (
    <div
      className={[
        "relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.024),rgba(255,255,255,0.01))] shadow-[0_18px_52px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-500 ease-out",
        isFocused ? "xl:col-span-full scale-[1.003] border-violet-300/14 ring-1 ring-violet-300/14 shadow-[0_26px_82px_rgba(0,0,0,0.38),0_0_26px_rgba(168,85,247,0.06),inset_0_1px_0_rgba(255,255,255,0.05)]" : "",
        isDimmed ? "scale-[0.992] opacity-45 blur-[1px] grayscale-[0.22]" : "",
      ].join(" ")}
    >
      {isFocused ? (
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(115deg,transparent,rgba(196,181,253,0.10),transparent)] animate-[surfaceFocusSweep_880ms_ease-out_forwards]" />
      ) : null}

      <button
        type="button"
        onClick={toggleOpen}
        className="relative z-10 flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
      >
        <div className="min-w-0">
          <div className="text-[8px] font-black uppercase tracking-[0.24em] text-white/24">
            {eyebrow}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-black uppercase tracking-[0.18em] text-white/72">
              {title}
            </span>
            {status ? (
              <span className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] ${statusClassName}`}>
                {status}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onFocus ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation()
                if (isFocused) {
                  onClearFocus?.()
                } else {
                  onFocus()
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  event.stopPropagation()
                  if (isFocused) {
                    onClearFocus?.()
                  } else {
                    onFocus()
                  }
                }
              }}
              className={[
                "rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] transition",
                isFocused
                  ? "border-violet-300/24 bg-violet-400/12 text-violet-100/76 shadow-[0_0_10px_rgba(168,85,247,0.08)]"
                  : "border-white/12 bg-black/30 text-white/44 hover:border-violet-300/18 hover:bg-violet-400/8 hover:text-violet-100/72",
              ].join(" ")}
            >
              {isFocused ? "Exit Focus" : "Focus"}
            </span>
          ) : null}

          <div className="rounded-full border border-white/12 bg-black/30 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/38">
            {isDimmed ? "Background" : isFocused ? "Focused" : "Ready"}
          </div>

          <div
            className={[
              "rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] transition",
              open
                ? "border-white/12 bg-black/30 text-white/42"
                : "border-sky-300/16 bg-sky-400/[0.065] text-sky-100/62 shadow-[0_0_10px_rgba(56,189,248,0.06)]",
            ].join(" ")}
          >
            {open ? "Expanded" : "Collapsed"}
          </div>

          <div
            className={[
              "flex h-8 w-8 items-center justify-center rounded-2xl border transition",
              open
                ? "rotate-180 border-white/12 bg-black/30 text-white/46"
                : "rotate-0 border-sky-300/18 bg-sky-400/[0.07] text-sky-100/70 shadow-[0_0_12px_rgba(56,189,248,0.06)]",
            ].join(" ")}
          >
            <ChevronDown size={14} />
          </div>
        </div>
      </button>

      {open ? (
        <div className="relative z-10 px-3 pb-3 animate-[surfaceReveal_var(--jupiter-motion-fast)_var(--jupiter-ease-out)_both]">
          {children}
        </div>
      ) : null}
    </div>
  )
}

type TransitionModeControlProps = {
  selectedTransitionType: CinematicTransitionType
  onTransitionTypeChange: (value: CinematicTransitionType) => void
  selectedTransitionDurationMs?: number
  onTransitionDurationChange?: (value: number) => void
}

type LowerCommandGridProps = TakeControlProps & TransitionModeControlProps

type SystemPressureState = "stable" | "watch" | "critical"

type ControlStagePanelProps = TakeControlProps & {
  selectedTransitionType: CinematicTransitionType
  selectedTransitionDurationMs?: number
  systemPressure?: SystemPressureState
  rundownMode?: "rehearsal" | "live"
}

const OPERATOR_SHORTCUTS = [
  { key: "T", label: "Take" },
  { key: "C", label: "Cut" },
  { key: "A", label: "Auto" },
  { key: "Space", label: "Quick Take" },
] as const

const CONFIDENCE_ROUTES = [
  {
    source: "Program Out",
    destination: "Attendee player + record master",
    status: "PGM",
    tone: "live",
    icon: SatelliteDish,
  },
  {
    source: "Program Return",
    destination: "Producer monitor + technical director",
    status: "CONF",
    tone: "safe",
    icon: MonitorSpeaker,
  },
  {
    source: "Presenter Return",
    destination: "Host + guest cue channel",
    status: "IFB",
    tone: "preview",
    icon: Headphones,
  },
  {
    source: "ISO Capture",
    destination: "Host cam, guest cam, media playback",
    status: "REC",
    tone: "warning",
    icon: FileVideo,
  },
] as const

const RUNDOWN_CUES = [
  {
    code: "00",
    label: "Preflight",
    detail: "Confirm return feed, confidence audio, record arm, and presenter IFB.",
    state: "Done",
    tone: "safe",
    type: "Check",
    duration: "02:00",
    target: "Ops",
    systems: ["REC", "IFB", "TX"],
  },
  {
    code: "01",
    label: "Cold Open",
    detail: "Roll slate, music bed, and intro animation into preview.",
    state: "Ready",
    tone: "preview",
    type: "Media",
    duration: "00:45",
    target: "Preview",
    systems: ["MEDIA", "AUTO"],
  },
  {
    code: "02",
    label: "Host Toss",
    detail: "Take host solo. IFB open. Lower-third armed for host intro.",
    state: "Next",
    tone: "warning",
    type: "Scene",
    duration: "03:30",
    target: "Program",
    systems: ["SCENE", "L3", "IFB"],
  },
  {
    code: "03",
    label: "Audience Q&A",
    detail: "Route questions, lower-third support, confidence monitor live.",
    state: "Standby",
    tone: "neutral",
    type: "Audience",
    duration: "08:00",
    target: "Live Route",
    systems: ["QA", "ROUTE", "CONF"],
  },
  {
    code: "04",
    label: "Closing Look",
    detail: "Recall branded closing scene, roll outro music, and prepare off-air route.",
    state: "Later",
    tone: "neutral",
    type: "Scene",
    duration: "01:15",
    target: "Program",
    systems: ["SCENE", "MEDIA", "ROUTE"],
  },
] as const

type AudioMixerTone = "green" | "sky" | "amber" | "violet"

type AudioMixerChannel = {
  id: string
  label: string
  source: string
  meterLevel: number
  tone: AudioMixerTone
  muted?: boolean
  solo?: boolean
  pfl?: boolean
}

const AUDIO_MIXER_CHANNELS: AudioMixerChannel[] = [
  {
    id: "host",
    label: "Host",
    source: "Mic 1",
    meterLevel: 0.78,
    tone: "green",
    pfl: true,
  },
  {
    id: "guest",
    label: "Guest",
    source: "Mic 2",
    meterLevel: 0.58,
    tone: "sky",
    pfl: true,
  },
  {
    id: "media",
    label: "Media",
    source: "Playback",
    meterLevel: 0.64,
    tone: "violet",
  },
  {
    id: "talkback",
    label: "Talkback",
    source: "IFB",
    meterLevel: 0.32,
    tone: "amber",
    muted: true,
  },
]

function getAudioPanelStatus(systemPressure: SystemPressureState): string {
  if (systemPressure === "critical") return "IFB Priority"
  if (systemPressure === "watch") return "Monitor Return"
  return "Bus Safe"
}

function getAudioPanelTone(systemPressure: SystemPressureState): "safe" | "warning" | "preview" {
  if (systemPressure === "critical") return "warning"
  if (systemPressure === "watch") return "preview"
  return "safe"
}

function getMasterActiveBars(channels: AudioMixerChannel[]): number {
  const audibleChannels = channels.filter((channel) => !channel.muted)
  const averageMeterLevel = audibleChannels.length > 0
    ? audibleChannels.reduce((total, channel) => total + channel.meterLevel, 0) / audibleChannels.length
    : 0

  return Math.max(0, Math.min(18, Math.round(averageMeterLevel * 18)))
}

function getCueTypeIcon(type: string): typeof Clapperboard {
  if (type === "Media") return PlayCircle
  if (type === "Audience") return Users
  if (type === "Check") return ShieldCheck
  return Clapperboard
}

function getCueToneClassName(tone: string): string {
  if (tone === "safe") return "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/58"
  if (tone === "preview") return "border-sky-300/14 bg-sky-400/8 text-sky-100/58"
  if (tone === "warning") return "border-amber-300/18 bg-amber-400/10 text-amber-100/72"
  return "border-white/8 bg-black/20 text-white/42"
}

function getConfidenceTone(severity: ConfidenceSeverity): "safe" | "warning" | "danger" {
  if (severity === "critical") return "danger"
  if (severity === "warning" || severity === "watch") return "warning"
  return "safe"
}

function getIfbTone(state: IFBChannelState): "safe" | "preview" | "warning" | "danger" {
  if (state === "priority") return "warning"
  if (state === "muted" || state === "cough") return "danger"
  return "safe"
}

function getRundownStateTone(state: RundownCueState): "safe" | "warning" | "preview" | "danger" | "neutral" {
  if (state === "live") return "safe"
  if (state === "next") return "warning"
  if (state === "standby") return "preview"
  if (state === "blocked") return "danger"
  return "neutral"
}

function ShortcutKey({
  shortcut,
}: {
  shortcut: (typeof OPERATOR_SHORTCUTS)[number]
}): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-black/24 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <kbd className="min-w-7 rounded-lg border border-white/10 bg-white/[0.055] px-1.5 py-1 text-center text-[9px] font-black uppercase tracking-[0.08em] text-white/70 shadow-[0_6px_14px_rgba(0,0,0,0.2)]">
        {shortcut.key}
      </kbd>
      <span className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-white/36">
        {shortcut.label}
      </span>
    </div>
  )
}

function CommandSafetyStrip({
  previewProgramDifferent,
  takeBusy,
  selectedTransitionDurationMs,
}: {
  previewProgramDifferent: boolean
  takeBusy: boolean
  selectedTransitionDurationMs?: number
}): JSX.Element {
  const label = takeBusy
    ? "Transition Active"
    : previewProgramDifferent
      ? "Preview Ready"
      : "Program Stable"

  return (
    <CompactStatusGrid
      className="mb-3"
      columnsClassName="grid-cols-2"
      items={[
        {
          label: "Command State",
          value: label,
          tone: takeBusy ? "danger" : previewProgramDifferent ? "warning" : "safe",
        },
        {
          label: "Transport",
          value: `${selectedTransitionDurationMs ?? 600}ms`,
          tone: "neutral",
        },
      ]}
    />
  )
}

function TransportBayChrome({
  armed,
  locked,
  children,
}: {
  armed: boolean
  locked: boolean
  children: JSX.Element
}): JSX.Element {
  const stateClass = locked
    ? "border-red-300/18 bg-red-400/8 shadow-[0_0_38px_rgba(239,68,68,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]"
    : armed
      ? "border-amber-300/18 bg-amber-400/8 shadow-[0_0_42px_rgba(251,191,36,0.14),inset_0_1px_0_rgba(255,255,255,0.055)]"
      : "border-white/8 bg-black/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"

  return (
    <div className={`relative overflow-hidden rounded-[26px] border p-2.5 transition-all duration-500 ${stateClass}`}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_7px)]" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      {armed && !locked ? (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(251,191,36,0.10),transparent)] animate-[transportBaySweep_2.2s_ease-in-out_infinite]" />
      ) : null}

      {locked ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-200/55 to-transparent" />
      ) : armed ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/55 to-transparent" />
      ) : null}

      {armed || locked ? (
        <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent animate-[transportBayReadyRail_2.4s_ease-in-out_infinite]" />
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.035)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative z-10">{children}</div>
    </div>
  )
}

function AudioChannelStrip({
  label,
  source,
  meterLevel,
  tone = "green",
  muted = false,
  solo = false,
  pfl = false,
}: {
  label: string
  source: string
  meterLevel: number
  tone?: AudioMixerTone
  muted?: boolean
  solo?: boolean
  pfl?: boolean
}): JSX.Element {
  const [channelMuted, setChannelMuted] = useState(muted)
  const [channelSolo, setChannelSolo] = useState(solo)
  const [channelPfl, setChannelPfl] = useState(pfl)
  const meterClass =
    channelMuted
      ? "bg-white/10"
      : tone === "sky"
        ? "bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.55)]"
        : tone === "amber"
          ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.55)]"
          : tone === "violet"
            ? "bg-violet-300 shadow-[0_0_8px_rgba(196,181,253,0.55)]"
            : "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.55)]"

  const meterBars = channelMuted
    ? 0
    : Math.max(0, Math.min(14, Math.round(meterLevel * 14)))
  const faderHeight = channelMuted ? 18 : Math.max(20, meterBars * 6)

  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/46">
            {label}
          </div>
          <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white/24">
            {source}
          </div>
        </div>

        <div
          className={[
            "rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em]",
            channelMuted
              ? "border-red-300/14 bg-red-400/8 text-red-100/52"
              : channelSolo
                ? "border-amber-300/14 bg-amber-400/8 text-amber-100/58"
                : channelPfl
                  ? "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/58"
                  : "border-white/8 bg-black/28 text-white/34",
          ].join(" ")}
        >
          {channelMuted ? "Mute" : channelSolo ? "Solo" : channelPfl ? "PFL" : "On"}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_22px] gap-2">
        <div className="flex h-20 items-end gap-1 rounded-2xl border border-white/8 bg-black/24 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {Array.from({ length: 14 }).map((_, index) => (
            <div
              key={`${label}-${index}`}
              className={`flex-1 rounded-full ${index < meterBars ? meterClass : "bg-white/8"}`}
              style={{ height: `${Math.max(12, (index + 1) * 6)}%` }}
            />
          ))}
        </div>

        <div className="flex flex-col justify-between rounded-full border border-white/8 bg-black/24 p-1">
          <div className="rounded-full bg-white/16" style={{ height: `${faderHeight}%` }} />
        </div>
      </div>

      <CompactStatusGrid
        className="mt-2"
        columnsClassName="grid-cols-1"
        items={[
          {
            label: "Route",
            value: channelMuted ? "Cut" : channelSolo ? "Solo Bus" : "Program",
            tone: channelMuted ? "danger" : channelSolo ? "warning" : "safe",
          },
        ]}
      />

      <div className="mt-2 grid grid-cols-3 gap-1">
        <CommandActionButton
          tone={channelMuted ? "danger" : "muted"}
          onClick={() => setChannelMuted((current) => !current)}
          className="px-1.5 py-1 text-[7px]"
        >
          M
        </CommandActionButton>
        <CommandActionButton
          tone={channelSolo ? "warning" : "muted"}
          onClick={() => setChannelSolo((current) => !current)}
          className="px-1.5 py-1 text-[7px]"
        >
          S
        </CommandActionButton>
        <CommandActionButton
          tone={channelPfl ? "safe" : "muted"}
          onClick={() => setChannelPfl((current) => !current)}
          className="px-1.5 py-1 text-[7px]"
        >
          PFL
        </CommandActionButton>
      </div>
    </div>
  )
}

function MonitorBusStrip({
  systemPressure = "stable",
}: {
  systemPressure?: SystemPressureState
}): JSX.Element {
  const [producerOverrideActive, setProducerOverrideActive] = useState(false)
  const pressureOverrideActive = systemPressure === "critical"
  const effectiveOverrideActive = producerOverrideActive || pressureOverrideActive

  const channels = IFB_CHANNELS.map((channel) =>
    effectiveOverrideActive
      ? {
          ...channel,
          state: channel.type === "producer" ? "priority" : channel.state,
          route: channel.type === "producer" ? "All Talent" : channel.route,
        }
      : channel
  )

  return (
    <div className="mb-3 rounded-[22px] border border-white/8 bg-black/22 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <SurfaceHeader
        eyebrow="Operator Cue"
        title="Returns + Monitoring"
        status={
          pressureOverrideActive
            ? "Pressure Override"
            : producerOverrideActive
            ? "Producer Override"
            : systemPressure === "watch"
            ? "Watch Cue"
            : "Ready"
        }
        tone={
          effectiveOverrideActive
            ? "warning"
            : systemPressure === "watch"
            ? "preview"
            : "preview"
        }
        icon={Headphones}
        className="mb-2"
      />

      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <CommandActionButton
          tone={effectiveOverrideActive ? "warning" : "muted"}
          onClick={() => setProducerOverrideActive((current) => !current)}
          disabled={pressureOverrideActive}
          className="px-2 py-1.5 text-[8px]"
        >
          {pressureOverrideActive ? "Pressure Override" : "Producer Override"}
        </CommandActionButton>
        <CommandActionButton
          tone={pressureOverrideActive ? "muted" : "safe"}
          onClick={() => setProducerOverrideActive(false)}
          disabled={pressureOverrideActive}
          className="px-2 py-1.5 text-[8px]"
        >
          {pressureOverrideActive ? "Locked" : "Clear Returns"}
        </CommandActionButton>
      </div>

      <CompactStatusGrid
        columnsClassName="grid-cols-4"
        items={channels.map((channel) => ({
          label: channel.label,
          value: `${channel.state} · ${channel.route}`,
          tone: getIfbTone(channel.state),
        }))}
      />
    </div>
  )
}

function MeterCard({
  label,
  value,
  bars,
  tone = "sky",
}: {
  label: string
  value: string
  bars: number
  tone?: "sky" | "emerald" | "amber"
}): JSX.Element {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.55)]"
      : tone === "amber"
        ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.55)]"
        : "bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.55)]"

  return (
    <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.016))] p-3 shadow-[0_16px_45px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/34">
          {label}
        </div>
        <div className="text-xs font-semibold text-white/78">{value}</div>
      </div>
      <div className="mt-2">
        <LevelMeter
          length={12}
          activeBars={bars}
          getBarClassName={(index) => (index < bars ? toneClass : "bg-white/8")}
        />
      </div>
    </div>
  )
}

export function CommandSurfaceHeader({
  isLive,
}: {
  isLive: boolean
}): JSX.Element {
  return (
    <PanelCard variant="elevated" className="px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SurfaceHeader
          eyebrow="Control Surface"
          title="Command Deck"
          status="Stable"
          tone="safe"
          icon={Zap}
        />

        <StatusPill
          label={isLive ? "Live Feed" : "Standby"}
          tone={isLive ? "live" : "muted"}
          pulse={isLive}
        />
      </div>
    </PanelCard>
  )
}

export function ActiveSessionCard({
  isLive,
  runtimeLabel,
}: {
  isLive: boolean
  runtimeLabel: string
}): JSX.Element {
  return (
    <PanelCard variant="critical" className="border-amber-200/12 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.08),transparent_36%),rgba(0,0,0,0.26)]">
      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-white/34">
        <Radio size={13} />
        Active Program
      </div>

      <div className="mt-1 text-lg font-semibold tracking-tight text-white">Session A1</div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
            isLive
              ? "border-red-300/25 bg-red-500/15 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.16)]"
              : "border-white/10 bg-black/30 text-white/50"
          }`}
        >
          <Disc3
            size={11}
            className={isLive ? "animate-spin text-red-300" : "text-white/30"}
          />
          {isLive ? "Live" : "Off Air"}
        </span>

        <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-400/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-100/65 shadow-[0_0_14px_rgba(56,189,248,0.08)]">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-300/70 shadow-[0_0_8px_rgba(125,211,252,0.7)]" />
          {runtimeLabel}
        </span>
      </div>
    </PanelCard>
  )
}

export function TakeFlashOverlay({
  mode,
}: {
  mode: TakeMode
}): JSX.Element {
  const commandLabel = mode === "auto" ? "Auto Transition" : "Cut Executed"
  const commandCode = mode === "auto" ? "AUTO" : "CUT"
  return (
    <div className="pointer-events-none absolute inset-x-3 top-0 z-20 overflow-hidden rounded-[30px] border border-amber-200/28 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_38%),rgba(251,191,36,0.10)] px-5 py-4 shadow-[0_0_42px_rgba(251,191,36,0.20),inset_0_1px_0_rgba(255,255,255,0.11)] backdrop-blur-sm animate-[takeFlash_620ms_ease-out_forwards] md:inset-x-4 xl:inset-x-5 2xl:inset-x-6">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)] animate-[takeSweep_520ms_ease-out_forwards]" />

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.32em] text-amber-100/80">
            <CheckCircle2 size={13} />
            Command Acknowledged
          </div>

          <div className="mt-1 text-3xl font-black uppercase tracking-[0.18em] text-white drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]">
            {commandLabel}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-amber-100/22 bg-black/38 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-50/80">
          <kbd className="rounded-md border border-amber-100/18 bg-amber-100/10 px-1.5 py-0.5 text-[9px] text-amber-50/90">
            {commandCode}
          </kbd>
          Sent to Program
        </div>
      </div>
    </div>
  )
}

export function TelemetryStrip({
  isLive,
  audienceCount,
  onStageCount,
  runtimeLabel,
}: {
  isLive: boolean
  audienceCount: number
  onStageCount: number
  runtimeLabel: string
}): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.09),transparent_34%),linear-gradient(180deg,rgba(7,12,28,0.96),rgba(2,5,16,0.985))] p-3 shadow-[0_28px_100px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <TelemetryAccent />

      <div className="relative grid gap-2.5 xl:grid-cols-[230px_minmax(0,1fr)_150px]">
        <ActiveSessionCard isLive={isLive} runtimeLabel={runtimeLabel} />

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)]">
          <CompactStatusGrid
            columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
            items={[
              { label: "Signal", value: "Stable", tone: "safe" },
      { label: "Recording", value: "Ready", tone: "danger" },
              { label: "Audience", value: String(audienceCount), tone: "preview" },
              { label: "On Stage", value: String(onStageCount), tone: "neutral" },
            ]}
          />

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <MeterCard label="GPU" value="74%" bars={9} tone="sky" />
            <MeterCard label="Signal" value="-6 dB" bars={8} tone="emerald" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 rounded-[24px] border border-white/10 bg-black/24 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/36">
            <Keyboard size={13} />
            Shortcuts
          </div>

          <div className="grid gap-1.5">
            {OPERATOR_SHORTCUTS.slice(0, 3).map((shortcut) => (
              <ShortcutKey key={shortcut.key} shortcut={shortcut} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ControlStagePanel({
  previewProgramDifferent,
  takeBusy,
  onTake,
  selectedTransitionType,
  selectedTransitionDurationMs,
  systemPressure = "stable",
  rundownMode = "rehearsal",
}: ControlStagePanelProps): JSX.Element {
  const liveLocked = rundownMode === "live"

  const transportStatus =
    systemPressure === "critical"
      ? "Hold Recommended"
      : previewProgramDifferent
        ? liveLocked
          ? "Live Ready"
          : "Rehearsal Only"
        : "Program Matched"

  const takeDisabled =
    takeBusy ||
    !previewProgramDifferent ||
    systemPressure === "critical" ||
    !liveLocked

  return (
    <PanelCard className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-28 transition-opacity duration-500 ${
          takeBusy || systemPressure === "critical"
            ? "bg-gradient-to-b from-red-300/10 to-transparent"
            : previewProgramDifferent
              ? "bg-gradient-to-b from-amber-300/10 to-transparent"
              : "bg-gradient-to-b from-emerald-300/6 to-transparent"
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.026)_42%,transparent_64%)] animate-[transportPanelSweep_9s_ease-in-out_infinite]" />
      <div className="relative z-10">
        <CommandSafetyStrip
          previewProgramDifferent={previewProgramDifferent}
          takeBusy={takeBusy}
          selectedTransitionDurationMs={selectedTransitionDurationMs}
        />
        <SurfaceHeader
          eyebrow="Director Surface"
          title="Program Control"
          status={transportStatus}
          tone={
            systemPressure !== "stable"
              ? getSystemPressureTone(systemPressure)
              : previewProgramDifferent
                ? "warning"
                : "safe"
          }
          icon={Zap}
          className="mb-3"
        />

        <TransportBayChrome
          armed={previewProgramDifferent && systemPressure !== "critical" && liveLocked}
          locked={takeBusy || systemPressure === "critical" || !liveLocked}
        >
          <div className="grid grid-cols-3 gap-2">
            <div className={previewProgramDifferent && systemPressure !== "critical" && liveLocked ? "rounded-2xl animate-[takeReadyPulse_1.8s_ease-in-out_infinite]" : ""}>
              <PrimaryTakeButton
                onClick={() => onTake("cut", selectedTransitionType, selectedTransitionDurationMs)}
                disabled={takeDisabled}
                isTaking={takeBusy}
              />
            </div>

            <CommandActionButton
              tone={systemPressure === "critical" || !liveLocked ? "muted" : "danger"}
              onClick={() => onTake("cut", selectedTransitionType, selectedTransitionDurationMs)}
              disabled={takeDisabled}
              title="Cut preview to program (C)"
              className="shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              Cut
            </CommandActionButton>

            <CommandActionButton
              tone={systemPressure === "critical" || !liveLocked ? "muted" : "preview"}
              onClick={() => onTake("auto", selectedTransitionType, selectedTransitionDurationMs)}
              disabled={takeDisabled}
              title="Auto take preview to program (A)"
              className="shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              Auto
            </CommandActionButton>
          </div>
        </TransportBayChrome>

        {systemPressure === "critical" ? (
          <div className="mt-3 rounded-2xl border border-red-300/14 bg-red-400/8 px-3 py-2 text-xs font-medium text-red-100/74 shadow-[0_0_18px_rgba(239,68,68,0.10)]">
            Confidence path degraded. Hold TAKE unless the producer explicitly confirms recovery.
          </div>
        ) : previewProgramDifferent ? (
          <div
            className={[
              "mt-3 rounded-2xl border px-3 py-2 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
              liveLocked
                ? "border-amber-300/14 bg-amber-400/8 text-amber-100/80"
                : "border-sky-300/14 bg-sky-400/8 text-sky-100/72",
            ].join(" ")}
          >
            {liveLocked
              ? "Live Locked is enabled. CUT and AUTO will send the armed preview to Program."
              : "Rehearsal mode is active. CUT and AUTO are locked until Live Locked is confirmed in the rundown."}
          </div>
        ) : (
          <div className="mt-3 text-xs text-white/42">
            Preview and Program are matched. Transport remains safe until preview changes.
          </div>
        )}
      </div>
    </PanelCard>
  )
}

export function CommandDeckStyles(): JSX.Element {
  return (
    <style jsx>{`
            :global(:root) {
        --jupiter-motion-fast: 220ms;
        --jupiter-motion-medium: 620ms;
        --jupiter-motion-slow: 900ms;
        --jupiter-motion-drift: 2600ms;
        --jupiter-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
        --jupiter-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
      }
      @keyframes takeFlash {
        0% {
          opacity: 0;
          transform: translateY(-10px) scale(0.985);
        }
        16% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        68% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        100% {
          opacity: 0;
          transform: translateY(-8px) scale(0.992);
        }
      }

      @keyframes takeReadyPulse {
        0%,
        100% {
          box-shadow: 0 0 0 rgba(251, 191, 36, 0);
        }
        50% {
          box-shadow: 0 0 24px rgba(251, 191, 36, 0.18);
        }
      }

      @keyframes takeSweep {
        0% {
          transform: translateX(-120%);
          opacity: 0;
        }
        22% {
          opacity: 1;
        }
        100% {
          transform: translateX(120%);
          opacity: 0;
        }
      }

      @keyframes telemetryScan {
        0% {
          transform: translateX(-100%);
          opacity: 0;
        }
        18% {
          opacity: 1;
        }
        50% {
          opacity: 0.72;
        }
        100% {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      @keyframes surfaceFocusSweep {
        0% {
          transform: translateX(-125%) skewX(-12deg);
          opacity: 0;
        }
        22% {
          opacity: 1;
        }
        100% {
          transform: translateX(125%) skewX(-12deg);
          opacity: 0;
        }
      }

      @keyframes surfaceReveal {
        0% {
          opacity: 0;
          transform: translateY(-6px) scale(0.992);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes missionPressureSweep {
        0%,
        100% {
          transform: translateX(-30%);
          opacity: 0.2;
        }

        50% {
          transform: translateX(30%);
          opacity: 0.9;
        }
      }

      @keyframes criticalSurfacePulse {
        0%,
        100% {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.06);
        }
        50% {
          box-shadow: 0 0 34px rgba(239, 68, 68, 0.14);
        }
      }

      @keyframes telemetryBlink {
        0%,
        100% {
          opacity: 0.28;
          transform: scale(0.86);
        }
        45% {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes transportBaySweep {
        0%,
        100% {
          transform: translateX(-120%);
          opacity: 0;
        }

        32% {
          opacity: 1;
        }

        64% {
          opacity: 0.55;
        }

        100% {
          transform: translateX(120%);
          opacity: 0;
        }
      }

      @keyframes transportBayReadyRail {
        0%,
        100% {
          opacity: 0.2;
          transform: scaleX(0.72);
        }

        50% {
          opacity: 0.86;
          transform: scaleX(1);
        }
      }

      @keyframes transportPanelSweep {
        0%,
        100% {
          opacity: 0;
          transform: translateX(-18%);
        }

        46% {
          opacity: 0.72;
        }

        100% {
          transform: translateX(18%);
        }
      }
    `}</style>
  )
}

export function TransitionPanel({
  selectedTransitionType,
  onTransitionTypeChange,
  selectedTransitionDurationMs,
  onTransitionDurationChange,
}: TransitionModeControlProps): JSX.Element {
  return (
    <PanelCard className="border-violet-300/12 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.11),transparent_38%),rgba(0,0,0,0.24)] shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_34px_rgba(168,85,247,0.055)]">
      <SurfaceHeader
        eyebrow="Motion Control"
        title="Transition Style"
        status="Timed"
        tone="preview"
        icon={Activity}
        className="mb-3"
      />

      <div className="grid grid-cols-3 gap-2">
        {TRANSITION_OPTIONS.map((item) => {
          const isSelected = selectedTransitionType === item.value

          return (
            <CommandActionButton
              key={item.value}
              tone={isSelected ? "preview" : "muted"}
              onClick={() => onTransitionTypeChange(item.value)}
              className={isSelected ? "shadow-[0_0_22px_rgba(168,85,247,0.18)]" : ""}
            >
              {item.label}
            </CommandActionButton>
          )
        })}
      </div>

      <CompactStatusGrid
        className="mt-3"
        columnsClassName="grid-cols-2"
        items={[
          { label: "Selected Transition", value: selectedTransitionType, tone: "preview" },
          { label: "Duration", value: `${selectedTransitionDurationMs ?? 600}ms`, tone: "preview" },
        ]}
      />

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/24 p-1.5">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/32">
            Duration
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/42">
            {selectedTransitionDurationMs ?? 600}ms
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {[250, 400, 600, 900, 1400].map((duration) => {
            const active = (selectedTransitionDurationMs ?? 600) === duration

            return (
              <CommandActionButton
                key={duration}
                tone={active ? "preview" : "muted"}
                onClick={() => onTransitionDurationChange?.(duration)}
                className="px-1 py-1 text-[8px]"
              >
                {duration}
              </CommandActionButton>
            )
          })}
        </div>
      </div>
    </PanelCard>
  )
}

export function AudioMixerPanel({
  systemPressure = "stable",
}: {
  systemPressure?: SystemPressureState
}): JSX.Element {
  const audioStatus = getAudioPanelStatus(systemPressure)
  const audioTone = getAudioPanelTone(systemPressure)
  const masterActiveBars = getMasterActiveBars(AUDIO_MIXER_CHANNELS)

  return (
    <PanelCard className="border-emerald-300/14 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.13),transparent_38%),rgba(52,211,153,0.045)]">
      <SurfaceHeader
        eyebrow="Broadcast Audio"
        title="Audio Mixer"
        status={audioStatus}
        tone={audioTone}
        icon={AudioLines}
        className="mb-3"
      />

      <CompactStatusGrid
        className="mb-3"
        columnsClassName="grid-cols-3"
        items={[
          {
            label: "Master",
            value: systemPressure === "critical" ? "Hold" : "-6 dB",
            tone: systemPressure === "critical" ? "warning" : "safe",
          },
          {
            label: "Limit",
            value: systemPressure === "critical" ? "Protected" : "Safe",
            tone: "safe",
          },
          {
            label: "IFB",
            value: systemPressure === "critical" ? "Priority" : "Open",
            tone: systemPressure === "critical" ? "warning" : "preview",
          },
        ]}
      />

      <CompactStatusGrid
        className="mb-3"
        columnsClassName="grid-cols-2"
        items={[
          { label: "Program Bus", value: "Open", tone: "safe" },
          { label: "Program Return", value: "Ready", tone: "preview" },
        ]}
      />

      {systemPressure !== "stable" ? (
        <div className="mb-3 rounded-[22px] border border-amber-300/14 bg-amber-400/8 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <SurfaceHeader
            eyebrow="Audio Recovery"
            title={systemPressure === "critical" ? "Hold Talent Cue" : "Monitor Cue Path"}
            status={systemPressure === "critical" ? "Priority" : "Watch"}
            tone={systemPressure === "critical" ? "warning" : "preview"}
            icon={Headphones}
            className="mb-2"
          />
          <CompactStatusGrid
            columnsClassName="grid-cols-3"
            items={[
              {
                label: "Talent",
                value: systemPressure === "critical" ? "Hold" : "Standby",
                tone: systemPressure === "critical" ? "warning" : "safe",
              },
              {
                label: "Talkback",
                value: systemPressure === "critical" ? "Priority Ready" : "Muted",
                tone: systemPressure === "critical" ? "warning" : "neutral",
              },
              {
                label: "Program Audio",
                value: "Protected",
                tone: "safe",
              },
            ]}
          />
        </div>
      ) : null}

      <MonitorBusStrip systemPressure={systemPressure} />

      <div className="grid grid-cols-2 gap-2">
        {AUDIO_MIXER_CHANNELS.map((channel) => (
          <AudioChannelStrip
            key={channel.id}
            label={channel.label}
            source={channel.source}
            meterLevel={channel.meterLevel}
            tone={channel.tone}
            muted={channel.muted}
            solo={channel.solo}
            pfl={channel.pfl}
          />
        ))}
      </div>

      <div className="mt-3 rounded-[22px] border border-white/8 bg-black/22 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <SurfaceHeader
          eyebrow="Program Mix"
          title="Master Output"
          status="No Clipping"
          tone="safe"
          icon={Mic2}
          className="mb-2"
        />
        <LevelMeter
          length={18}
          activeBars={masterActiveBars}
          getBarClassName={(index) =>
            index >= masterActiveBars
              ? "bg-white/8"
              : index > 15
                ? "bg-red-300 shadow-[0_0_8px_rgba(252,165,165,0.55)]"
                : index > 12
                  ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.5)]"
                  : "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.5)]"
          }
        />
      </div>
    </PanelCard>
  )
}

export function BroadcastRoutingPanel({
  confidenceScenario = "stable",
  onConfidenceScenarioChange,
}: {
  confidenceScenario?: SystemPressureState
  onConfidenceScenarioChange?: (scenario: SystemPressureState) => void
}): JSX.Element {
  const setConfidenceScenario = onConfidenceScenarioChange ?? (() => undefined)

  const confidenceMetrics = CONFIDENCE_MONITORING_METRICS.map((metric) => {
    if (confidenceScenario === "critical") {
      if (metric.type === "latency") return { ...metric, value: "412ms", severity: "critical" as ConfidenceSeverity }
      if (metric.type === "packet_loss") return { ...metric, value: "4.8%", severity: "critical" as ConfidenceSeverity }
      if (metric.type === "return_feed") return { ...metric, value: "Unstable", severity: "warning" as ConfidenceSeverity }
    }

    if (confidenceScenario === "watch") {
      if (metric.type === "latency") return { ...metric, value: "168ms", severity: "watch" as ConfidenceSeverity }
      if (metric.type === "packet_loss") return { ...metric, value: "1.1%", severity: "watch" as ConfidenceSeverity }
    }

    return metric
  })

  const confidenceStatus =
    confidenceScenario === "critical"
      ? "Route Warning"
      : confidenceScenario === "watch"
        ? "Watch Return"
        : "Matrix Safe"

  const confidenceTone = getSystemPressureTone(confidenceScenario)

  return (
    <PanelCard className="border-sky-300/12 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_38%),rgba(56,189,248,0.035)]">
      <SurfaceHeader
        eyebrow="Transmission"
        title="Routing + Monitoring"
        status={confidenceStatus}
        tone={confidenceTone}
        icon={Route}
        className="mb-3"
      />

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <CommandActionButton
          tone={confidenceScenario === "stable" ? "safe" : "muted"}
          onClick={() => setConfidenceScenario("stable")}
          className="px-2 py-1.5 text-[8px]"
        >
          Stable
        </CommandActionButton>
        <CommandActionButton
          tone={confidenceScenario === "watch" ? "warning" : "muted"}
          onClick={() => setConfidenceScenario("watch")}
          className="px-2 py-1.5 text-[8px]"
        >
          Watch
        </CommandActionButton>
        <CommandActionButton
          tone={confidenceScenario === "critical" ? "danger" : "muted"}
          onClick={() => setConfidenceScenario("critical")}
          className="px-2 py-1.5 text-[8px]"
        >
          Critical
        </CommandActionButton>
      </div>

      <CompactStatusGrid
        className="mb-3"
        items={confidenceMetrics.map((metric) => ({
          label: metric.label,
          value: metric.value,
          tone: getConfidenceTone(metric.severity),
        }))}
      />

      {confidenceScenario !== "stable" ? (
        <div className="mb-3 rounded-[22px] border border-amber-300/14 bg-amber-400/8 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <SurfaceHeader
            eyebrow="Recovery Workflow"
            title="Producer Hold Recommended"
            status={confidenceScenario === "critical" ? "Priority" : "Advisory"}
            tone={confidenceScenario === "critical" ? "warning" : "preview"}
            icon={AlertTriangle}
            className="mb-2"
          />
          <CompactStatusGrid
            columnsClassName="grid-cols-3"
            items={[
              {
                label: "Action",
                value: confidenceScenario === "critical" ? "Hold TAKE" : "Monitor",
                tone: confidenceScenario === "critical" ? "warning" : "preview",
              },
              {
                label: "Returns",
                value: confidenceScenario === "critical" ? "Priority Ready" : "Standby",
                tone: confidenceScenario === "critical" ? "warning" : "safe",
              },
              {
                label: "Recovery",
                value: confidenceScenario === "critical" ? "Confirm Return" : "Watch Path",
                tone: "safe",
              },
            ]}
          />
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <BusBadge label="PGM" active tone="live" />
        <BusBadge label="RETURN" active tone={confidenceScenario === "critical" ? "warning" : "safe"} />
        <BusBadge label="CUE" active tone="preview" />
        <BusBadge label="ISO" active tone="warning" />
        <BusBadge label="AUX" />
        <BusBadge label="DIRTY" />
      </div>

      <div className="grid gap-2">
        {CONFIDENCE_ROUTES.map((route) => (
          <RoutingRow
            key={route.source}
            source={route.source}
            destination={route.destination}
            status={route.source === "Program Return" && confidenceScenario !== "stable" ? "WATCH" : route.status}
            tone={route.source === "Program Return" && confidenceScenario === "critical" ? "warning" : route.tone}
            icon={route.icon}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ConfidenceTile
          label="Return Feed"
          value={confidenceScenario === "critical" ? "Unstable" : confidenceScenario === "watch" ? "Watch" : "Clean"}
          detail={
            confidenceScenario === "critical"
              ? "Return feed is drifting. Hold non-essential transitions until the operator confirms recovery."
              : confidenceScenario === "watch"
                ? "Return feed remains usable, but latency and packet loss are elevated."
                : "Program return is stable with confidence audio present."
          }
          tone={confidenceScenario === "critical" ? "warning" : confidenceScenario === "watch" ? "warning" : "safe"}
          meter={confidenceScenario === "critical" ? 3 : confidenceScenario === "watch" ? 5 : 8}
        />
        <ConfidenceTile
          label="Operator Cue"
          value={confidenceScenario === "critical" ? "Return Priority" : "Return Ready"}
          detail={
            confidenceScenario === "critical"
              ? "Producer override is ready so talent can be held while confidence path recovers."
              : "Talkback remains muted until explicitly armed."
          }
          tone={confidenceScenario === "critical" ? "warning" : "preview"}
          meter={confidenceScenario === "critical" ? 8 : 6}
        />
      </div>
    </PanelCard>
  )
}

export function RundownCuePanel({
  rundownMode: controlledRundownMode,
  onRundownModeChange,
}: {
  rundownMode?: "rehearsal" | "live"
  onRundownModeChange?: (mode: "rehearsal" | "live") => void
}): JSX.Element {
  const [activeCueIndex, setActiveCueIndex] = useState(0)
  const [internalRundownMode, setInternalRundownMode] = useState<"rehearsal" | "live">("rehearsal")
  const [liveLockConfirming, setLiveLockConfirming] = useState(false)
  const rundownMode = controlledRundownMode ?? internalRundownMode
  const currentCue = RUNDOWN_CUES[activeCueIndex] ?? RUNDOWN_CUES[0]
  const nextCue = RUNDOWN_CUES[activeCueIndex + 1] ?? RUNDOWN_CUES[RUNDOWN_CUES.length - 1]
  const standbyCue = RUNDOWN_CUES[activeCueIndex + 2] ?? nextCue
  const canAdvanceCue = activeCueIndex < RUNDOWN_CUES.length - 1
  const completedCueCount = activeCueIndex

  const advanceRundownCue = (): void => {
    setActiveCueIndex((current) => Math.min(current + 1, RUNDOWN_CUES.length - 1))
  }

  const resetRundownCue = (): void => {
    setActiveCueIndex(0)
  }

  const toggleRundownMode = (): void => {
    if (rundownMode === "rehearsal" && !liveLockConfirming) {
      setLiveLockConfirming(true)
      return
    }

    const nextMode = rundownMode === "rehearsal" ? "live" : "rehearsal"

    setLiveLockConfirming(false)
    setInternalRundownMode(nextMode)
    onRundownModeChange?.(nextMode)
  }

  const totalRuntime = RUNDOWN_CUES.reduce((total, cue) => {
    const [minutes = "0", seconds = "0"] = cue.duration.split(":")
    return total + Number(minutes) * 60 + Number(seconds)
  }, 0)
  const totalRuntimeLabel = `${Math.floor(totalRuntime / 60)}:${String(totalRuntime % 60).padStart(2, "0")}`

  const liveCue = DEFAULT_RUNDOWN_CUES.find((cue) => cue.state === "live")
  const typedNextCue = DEFAULT_RUNDOWN_CUES.find((cue) => cue.state === "next")
  const blockedCueCount = DEFAULT_RUNDOWN_CUES.filter((cue) => cue.state === "blocked").length
  const rundownProgressLabel = `${completedCueCount}/${RUNDOWN_CUES.length - 1}`
  const speakerClockLabel = canAdvanceCue ? nextCue.duration : "00:00"
  const activeSystems: string[] = canAdvanceCue ? [...nextCue.systems] : ["HOLD", "CONF", "ROUTE"]
  const rehearsalLabel = rundownMode === "rehearsal" ? "Rehearsal" : "Live Locked"
  const directorNote = canAdvanceCue
    ? `${rundownMode === "rehearsal" ? "Rehearse" : "Stand by"} ${nextCue.label}. Confirm ${activeSystems.join(", ")} before TAKE. Target ${nextCue.target}.`
    : "Final cue reached. Hold program until the producer confirms off-air routing."
  const guardrailCopy = canAdvanceCue
    ? rundownMode === "rehearsal"
      ? "Rehearsal mode allows cue walking and operator practice. TAKE remains simulated until Live Locked is enabled."
      : "Live Locked mode treats rundown actions as production-critical. Scene recall, media rolls, IFB prompts, and attendee routing should remain operator-confirmed."
    : "End Hold is active. Keep the final program route stable until off-air routing is explicitly confirmed."

  return (
    <PanelCard className="border-amber-300/12 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.11),transparent_36%),rgba(0,0,0,0.23)]">
      <SurfaceHeader
        eyebrow="Show Control"
        title="Rundown"
        status={canAdvanceCue ? rehearsalLabel : "End Hold"}
        tone="warning"
        icon={ClipboardList}
        className="mb-3"
      />

      <CompactStatusGrid
        className="mb-3"
        columnsClassName="md:grid-cols-4"
        items={[
          {
            label: "Current",
            value: currentCue.label,
            tone: "safe",
          },
          {
            label: "Next",
            value: canAdvanceCue ? nextCue.label : "End Hold",
            tone: canAdvanceCue ? "warning" : "neutral",
          },
          {
            label: "Mode",
            value: rehearsalLabel,
            tone: rundownMode === "live" ? "danger" : "preview",
          },
          {
            label: "Progress",
            value: blockedCueCount > 0 ? `${rundownProgressLabel} · Blocked ${blockedCueCount}` : rundownProgressLabel,
            tone: blockedCueCount > 0 ? "danger" : "preview",
          },
        ]}
      />

      {liveLockConfirming ? (
        <div className="mb-3 rounded-[22px] border border-red-300/16 bg-red-400/8 p-3 shadow-[0_0_24px_rgba(239,68,68,0.10),inset_0_1px_0_rgba(255,255,255,0.035)]">
          <SurfaceHeader
            eyebrow="Live Lock Confirmation"
            title="Enable Real TAKE Controls"
            status="Confirm Required"
            tone="danger"
            icon={AlertTriangle}
            className="mb-2"
          />

          <div className="text-[11px] leading-relaxed text-red-50/66">
            You are about to unlock production-critical CUT and AUTO actions.
            Use this only when the show is ready for real program output changes.
          </div>
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-3 gap-2">
        <ConfidenceTile
          label="Current"
          value={currentCue.label}
          detail={currentCue.detail}
          tone="safe"
          meter={Math.min(10, 6 + activeCueIndex)}
        />
        <ConfidenceTile
          label="Next Take"
          value={canAdvanceCue ? nextCue.label : "End Hold"}
          detail={canAdvanceCue ? nextCue.detail : "No additional cues remain in the active rundown stack."}
          tone={canAdvanceCue ? "warning" : "muted"}
          meter={canAdvanceCue ? 7 : 2}
        />
        <ConfidenceTile
          label="Runtime"
          value={totalRuntimeLabel}
          detail={`${completedCueCount} completed · ${Math.max(0, RUNDOWN_CUES.length - completedCueCount - 1)} remaining`}
          tone="preview"
          meter={Math.max(2, 8 - completedCueCount)}
        />
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[22px] border border-amber-300/14 bg-amber-400/8 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <SurfaceHeader
            eyebrow="Cue Execution"
            title="Take Next"
            status={canAdvanceCue ? nextCue.state : "End Hold"}
            tone={canAdvanceCue ? nextCue.tone : "muted"}
            icon={Send}
            className="mb-2"
          />
          <div className="text-lg font-black tracking-tight text-white">{canAdvanceCue ? nextCue.label : "End Hold"}</div>
          <div className="mt-1 text-[11px] leading-relaxed text-amber-50/58">
            {canAdvanceCue ? nextCue.detail : "Rundown is complete. Keep program held until final route confirmation."}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeSystems.map((system) => (
              <span
                key={system}
                className="rounded-full border border-amber-200/14 bg-black/22 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/58"
              >
                {system}
              </span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <CommandActionButton
              tone="muted"
              onClick={resetRundownCue}
              className="px-2 py-1.5 text-[8px]"
            >
              Reset
            </CommandActionButton>
            <CommandActionButton
              tone={rundownMode === "live" ? "danger" : liveLockConfirming ? "warning" : "safe"}
              onClick={toggleRundownMode}
              className="px-2 py-1.5 text-[8px]"
            >
              {rundownMode === "live"
                ? "Exit Live"
                : liveLockConfirming
                  ? "Confirm Live"
                  : "Arm Live"}
            </CommandActionButton>
            <CommandActionButton
              tone={canAdvanceCue ? "warning" : "muted"}
              disabled={!canAdvanceCue}
              onClick={advanceRundownCue}
              className="px-2 py-1.5 text-[8px]"
            >
              {rundownMode === "live" ? "Take Live" : "Take Next"}
            </CommandActionButton>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <SurfaceHeader
            eyebrow="Upcoming"
            title="Standby"
            status={canAdvanceCue ? standbyCue.state : "Clear"}
            tone={canAdvanceCue ? standbyCue.tone : "muted"}
            icon={Eye}
            className="mb-2"
          />
          <div className="text-sm font-black tracking-tight text-white/78">{canAdvanceCue ? standbyCue.label : "No Standby Cue"}</div>
          <div className="mt-1 text-[11px] leading-relaxed text-white/42">
            {canAdvanceCue ? standbyCue.detail : "All visible cues have been walked to the end of the active show stack."}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
            <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1">Target · {standbyCue.target}</div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-2 py-1">Duration · {standbyCue.duration}</div>
          </div>
        </div>
      </div>

      <CompactStatusGrid
        className="mb-3"
        columnsClassName="md:grid-cols-4"
        items={[
          {
            label: "Scene Recall",
            value: activeSystems.includes("SCENE") ? `${nextCue.label} Armed` : "No Scene Cue",
            tone: activeSystems.includes("SCENE") ? "warning" : "neutral",
          },
          {
            label: "Lower Third",
            value: activeSystems.includes("L3") ? "Graphic Ready" : "Clear",
            tone: activeSystems.includes("L3") ? "preview" : "neutral",
          },
          {
            label: "IFB Prompt",
            value: activeSystems.includes("IFB") ? "Talent Standby" : "No IFB Prompt",
            tone: activeSystems.includes("IFB") ? "safe" : "neutral",
          },
          {
            label: "Audience Route",
            value: activeSystems.includes("ROUTE") ? "Route Pending" : "Program Hold",
            tone: activeSystems.includes("ROUTE") ? "warning" : "neutral",
          },
        ]}
      />

      <div className="mb-3 grid gap-2 md:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[22px] border border-white/8 bg-black/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <SurfaceHeader
            eyebrow="For Next Cue"
            title="Director Notes"
            status={rundownMode === "live" ? "Live Note" : "Rehearsal Note"}
            tone="warning"
            icon={MessageSquare}
            className="mb-2"
          />
          <div className="rounded-2xl border border-white/8 bg-black/22 px-3 py-2 text-[11px] leading-relaxed text-white/48">
            {directorNote}
          </div>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-black/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <SurfaceHeader
            eyebrow="Host"
            title="Speaker Clock"
            status={canAdvanceCue ? "Safe" : "Hold"}
            tone="safe"
            icon={Timer}
            className="mb-2"
          />
          <CompactStatusGrid
            columnsClassName="grid-cols-2"
            items={[
              { label: "Remaining", value: speakerClockLabel, tone: "neutral" },
              { label: "Overrun", value: canAdvanceCue ? "Safe" : "Hold", tone: canAdvanceCue ? "safe" : "warning" },
            ]}
          />
        </div>
      </div>

      <div className="mb-3 rounded-[22px] border border-white/8 bg-black/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <SurfaceHeader
          eyebrow="Cue Timing"
          title="Show Timeline"
          status="Next Cue Armed"
          tone="warning"
          icon={Timer}
          className="mb-2"
        />

        <div className="grid gap-1.5 md:grid-cols-5">
          {RUNDOWN_CUES.map((cue, index) => {
            const active = index === activeCueIndex
            const next = index === activeCueIndex + 1
            const done = index < activeCueIndex
            const standby = index === activeCueIndex + 2

            return (
              <div
                key={`timeline-${cue.code}`}
                className={[
                  "relative overflow-hidden rounded-2xl border px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
                  active
                    ? "border-emerald-300/18 bg-emerald-400/8 text-emerald-100/72"
                    : next
                      ? "border-amber-300/24 bg-amber-400/10 text-amber-100/82"
                      : done
                        ? "border-white/8 bg-white/[0.035] text-white/32"
                        : standby
                          ? "border-sky-300/12 bg-sky-400/8 text-sky-100/54"
                          : "border-white/8 bg-black/20 text-white/38",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.18em] opacity-70">{cue.code}</span>
                  <span className="text-[8px] font-black uppercase tracking-[0.16em] opacity-60">{cue.duration}</span>
                </div>
                <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.14em]">
                  {cue.label}
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={[
                      "h-full rounded-full",
                      active
                        ? "w-3/4 bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.42)]"
                        : next
                          ? "w-1/2 bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.45)]"
                          : done
                            ? "w-full bg-white/22"
                            : standby
                              ? "w-1/3 bg-sky-300/55"
                              : "w-1/5 bg-white/18",
                    ].join(" ")}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <details className="group rounded-[22px] border border-white/8 bg-black/16 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/36 transition hover:bg-white/[0.035] hover:text-white/62 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <ClipboardList size={12} />
            Full Cue List
          </span>
          <span className="rounded-full border border-white/10 bg-black/24 px-2 py-0.5 text-[8px] tracking-[0.14em] text-white/32 group-open:border-amber-300/14 group-open:bg-amber-400/8 group-open:text-amber-100/54">
            {RUNDOWN_CUES.length} Cues
          </span>
        </summary>

        <div className="mt-2 grid gap-2">
          {RUNDOWN_CUES.map((cue, index) => {
            const Icon = getCueTypeIcon(cue.type)
            const isNext = index === activeCueIndex + 1
            const isCurrent = index === activeCueIndex
            const isDone = index < activeCueIndex

            return (
              <div
                key={cue.code}
                className={[
                  "group rounded-[22px] border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-0.5 hover:border-white/14 hover:bg-white/[0.035]",
                  isCurrent
                    ? "border-emerald-300/18 bg-emerald-400/8 shadow-[0_0_24px_rgba(16,185,129,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
                    : isNext
                      ? "border-amber-300/20 bg-amber-400/8 shadow-[0_0_24px_rgba(251,191,36,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : isDone
                        ? "border-white/8 bg-white/[0.03] opacity-60"
                        : "border-white/8 bg-black/20",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/52">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em]">{cue.code}</span>
                      <Icon size={11} className="mt-0.5 text-white/34" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-white/74">
                          {cue.label}
                        </p>
                        <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] ${getCueToneClassName(cue.tone)}`}>
                          {cue.type}
                        </span>
                        {isNext ? <PlayCircle size={12} className="text-amber-200/70" /> : null}
                        {cue.state === "Standby" ? <MessageSquare size={12} className="text-white/32" /> : null}
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-white/38">{cue.detail}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-white/8 bg-black/22 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                          <Timer size={9} className="mr-1 inline" />
                          {cue.duration}
                        </span>
                        <span className="rounded-full border border-white/8 bg-black/22 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                          <Layers3 size={9} className="mr-1 inline" />
                          {cue.target}
                        </span>
                        {cue.systems.map((system) => (
                          <span
                            key={`${cue.code}-${system}`}
                            className="rounded-full border border-white/8 bg-black/22 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/30"
                          >
                            {system}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <StatusPill
                    label={isCurrent ? "Live" : isNext ? "Next" : isDone ? "Done" : cue.state}
                    tone={isCurrent ? "safe" : isNext ? "warning" : cue.tone}
                    pulse={isNext}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </details>
      <div className="mt-3 rounded-2xl border border-amber-300/12 bg-amber-400/8 p-2 text-[10px] leading-relaxed text-amber-50/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <SurfaceHeader
          eyebrow="Safety"
          title="Director Guardrail"
          tone="warning"
          icon={AlertTriangle}
          className="mb-1"
        />
        {guardrailCopy}
      </div>
    </PanelCard>
  )
}

export function LowerCommandGrid({
  previewProgramDifferent,
  takeBusy,
  onTake,
  selectedTransitionType,
  onTransitionTypeChange,
  selectedTransitionDurationMs,
  onTransitionDurationChange,
}: LowerCommandGridProps): JSX.Element {
  const [workspaceMode, setWorkspaceMode] = useState<CommandWorkspaceMode>("director")
  const [openSurfaces, setOpenSurfaces] = useState<Record<CommandSurfaceKey, boolean>>(
    COMMAND_WORKSPACE_OPEN_STATE.director
  )
  const [focusedSurface, setFocusedSurface] = useState<CommandSurfaceKey | null>(null)
  const [preFocusOpenSurfaces, setPreFocusOpenSurfaces] = useState<Record<CommandSurfaceKey, boolean> | null>(null)
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const raw = window.localStorage.getItem(COMMAND_WORKSPACE_STORAGE_KEY)

      if (!raw) {
        setWorkspaceHydrated(true)
        return
      }

      const parsed = JSON.parse(raw) as {
        workspaceMode?: CommandWorkspaceMode
        openSurfaces?: Record<CommandSurfaceKey, boolean>
      }

      if (parsed.workspaceMode) {
        setWorkspaceMode(parsed.workspaceMode)
      }

      if (parsed.openSurfaces) {
        setOpenSurfaces(parsed.openSurfaces)
      }
    } catch {
      // Ignore corrupted workspace state.
    } finally {
      setWorkspaceHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !workspaceHydrated) return

    window.localStorage.setItem(
      COMMAND_WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        workspaceMode,
        openSurfaces,
      })
    )
  }, [workspaceHydrated, workspaceMode, openSurfaces])

  const applyWorkspaceMode = (mode: CommandWorkspaceMode): void => {
    setWorkspaceMode(mode)
    setFocusedSurface(null)
    setPreFocusOpenSurfaces(null)

    if (mode !== "custom") {
      setOpenSurfaces(COMMAND_WORKSPACE_OPEN_STATE[mode])
    }
  }

  const setSurfaceOpen = (surface: CommandSurfaceKey, open: boolean): void => {
    setWorkspaceMode("custom")
    setFocusedSurface(null)
    setPreFocusOpenSurfaces(null)
    setOpenSurfaces((current) => ({
      ...current,
      [surface]: open,
    }))
  }

  const focusSurface = (surface: CommandSurfaceKey): void => {
    setWorkspaceMode("custom")
    setFocusedSurface(surface)
    setPreFocusOpenSurfaces(openSurfaces)
    setOpenSurfaces({
      transport: surface === "transport",
      transition: surface === "transition",
      audio: surface === "audio",
      routing: surface === "routing",
      rundown: surface === "rundown",
    })
  }

  const clearFocusedSurface = (): void => {
    setFocusedSurface(null)
    setOpenSurfaces(preFocusOpenSurfaces ?? COMMAND_WORKSPACE_OPEN_STATE.director)
    setPreFocusOpenSurfaces(null)
  }

  const shouldShowSurface = (surface: CommandSurfaceKey): boolean => {
    if (workspaceMode === "compact") {
      return openSurfaces[surface]
    }

    if (focusedSurface) {
      return openSurfaces[surface]
    }

    return true
  }

  const openSurfaceCount = Object.values(openSurfaces).filter(Boolean).length
  const surfaceStatusLabel = getSurfaceStatusLabel(openSurfaceCount)
  const transportStatusLabel = getTransportStatusLabel(previewProgramDifferent)
  const surfaceModeLabel = getSurfaceModeLabel({ focusedSurface, workspaceMode })

  const routingStatusLabel = openSurfaces.routing
    ? "Confidence Visible"
    : "Confidence Collapsed"

  const rundownStatusLabel = openSurfaces.rundown
    ? "Cue Stack Visible"
    : "Cue Stack Collapsed"

  const [systemPressure, setSystemPressure] = useState<SystemPressureState>("stable")
  const [globalRundownMode, setGlobalRundownMode] = useState<"rehearsal" | "live">("rehearsal")
  const liveLocked = globalRundownMode === "live"
  const systemPressureTone = getSystemPressureTone(systemPressure)
  const systemPressureSurfaceTone = getSystemPressureSurfaceTone(systemPressure)
  const missionStateLabel =
    systemPressure === "critical"
      ? "Confidence Degraded"
      : systemPressure === "watch"
        ? "Monitor Return"
        : liveLocked
          ? "Live Locked"
          : "Rehearsal Safe"

  const missionStateToneClass =
    systemPressureSurfaceTone === "red"
      ? "border-red-300/18 bg-red-400/10 text-red-100 shadow-[0_0_34px_rgba(239,68,68,0.12)]"
      : systemPressureSurfaceTone === "amber"
        ? "border-amber-300/18 bg-amber-400/10 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.10)]"
        : "border-emerald-300/14 bg-emerald-400/8 text-emerald-100 shadow-[0_0_26px_rgba(16,185,129,0.08)]"

  const deckPressureClass =
    systemPressure === "critical"
      ? "border-red-300/16 shadow-[0_28px_110px_rgba(0,0,0,0.48),0_0_48px_rgba(239,68,68,0.10),inset_0_1px_0_rgba(255,255,255,0.06)]"
      : systemPressure === "watch"
        ? "border-amber-300/14 shadow-[0_28px_105px_rgba(0,0,0,0.46),0_0_40px_rgba(251,191,36,0.08),inset_0_1px_0_rgba(255,255,255,0.055)]"
        : "border-white/10 shadow-[0_28px_100px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.05)]"
  return (
    <div className={`relative overflow-hidden rounded-[30px] border bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.06),transparent_34%),linear-gradient(180deg,rgba(7,12,28,0.965),rgba(2,5,16,0.99))] p-3 transition-all duration-500 ${deckPressureClass}`}>
      <TelemetryAccent />
      {systemPressure !== "stable" ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-[linear-gradient(90deg,transparent,rgba(251,191,36,0.35),transparent)] animate-[missionPressureSweep_2.6s_ease-in-out_infinite]" />
      ) : null}
      <div className="relative mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/8 bg-black/18 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${missionStateToneClass}`}>
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                systemPressure === "critical"
                  ? "animate-pulse bg-red-300 shadow-[0_0_9px_rgba(252,165,165,0.8)]"
                  : systemPressure === "watch"
                    ? "animate-pulse bg-amber-300 shadow-[0_0_9px_rgba(252,211,77,0.72)]"
                    : "bg-emerald-300/80 shadow-[0_0_8px_rgba(110,231,183,0.65)]",
              ].join(" ")}
            />
            {missionStateLabel}
</div>

<div>
            <div className="text-[8px] font-black uppercase tracking-[0.24em] text-white/28">
              Command Workspace
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/66">
                {COMMAND_WORKSPACE_LABELS[workspaceMode]} Mode
              </span>
              <span className="rounded-full border border-white/10 bg-black/24 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/36">
                {surfaceStatusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(["director", "audio", "ops", "compact", "custom"] as const).map((mode) => {
            const active = workspaceMode === mode

            return (
              <button
                key={mode}
                type="button"
                onClick={() => applyWorkspaceMode(mode)}
                className={[
                  "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition-all duration-200",
                  active
                    ? "border-violet-300/24 bg-violet-400/14 text-violet-100 shadow-[0_0_20px_rgba(168,85,247,0.16)]"
                    : mode === "custom"
                      ? "border-amber-300/14 bg-amber-400/8 text-amber-100/52 hover:border-amber-300/24 hover:bg-amber-400/12 hover:text-amber-50"
                      : "border-white/10 bg-black/24 text-white/38 hover:border-white/18 hover:bg-white/[0.05] hover:text-white/72",
                ].join(" ")}
              >
                {COMMAND_WORKSPACE_LABELS[mode]}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-1.5 py-1">
          <button
            type="button"
            onClick={() => setSystemPressure("stable")}
            className={[
              "rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] transition",
              systemPressure === "stable"
                ? "bg-emerald-400/16 text-emerald-50"
                : "text-white/34 hover:text-white/70",
            ].join(" ")}
          >
            Stable
          </button>
          <button
            type="button"
            onClick={() => setSystemPressure("watch")}
            className={[
              "rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] transition",
              systemPressure === "watch"
                ? "bg-amber-400/16 text-amber-50"
                : "text-white/34 hover:text-white/70",
            ].join(" ")}
          >
            Watch
          </button>
          <button
            type="button"
            onClick={() => setSystemPressure("critical")}
            className={[
              "rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] transition",
              systemPressure === "critical"
                ? "bg-red-400/18 text-red-50"
                : "text-white/34 hover:text-white/70",
            ].join(" ")}
          >
            Critical
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setWorkspaceMode("ops")
            setFocusedSurface(null)
            setPreFocusOpenSurfaces(null)
            setOpenSurfaces({
              transport: true,
              transition: true,
              audio: true,
              routing: true,
              rundown: true,
            })
          }}
          className="rounded-full border border-emerald-300/14 bg-emerald-400/8 px-3 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-emerald-100/58 transition hover:border-emerald-300/24 hover:bg-emerald-400/14 hover:text-emerald-50"
        >
          Open All
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          {workspaceMode === "custom" ? (
            <div className="rounded-full border border-amber-300/14 bg-amber-400/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-amber-100/54">
              Manual Surface Selection
            </div>
          ) : null}
          {focusedSurface ? (
            <button
              type="button"
              onClick={clearFocusedSurface}
              className="rounded-full border border-violet-300/18 bg-violet-400/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-violet-100/62 transition hover:border-violet-300/28 hover:bg-violet-400/14 hover:text-violet-50"
            >
              Focus · {focusedSurface} · Exit
            </button>
          ) : null}
{COMMAND_SURFACE_STATUS_CHIPS.map((surface) => {
  const active = openSurfaces[surface.key]

  return (
    <button
      key={surface.key}
      type="button"
      onClick={() => setSurfaceOpen(surface.key, !active)}
      className={[
        "rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] transition-all duration-300",
        active
          ? surface.activeClassName
          : "border-white/8 bg-black/24 text-white/28 hover:border-white/14 hover:text-white/52",
      ].join(" ")}
    >
      {surface.label}
    </button>
  )
})}
        </div>
      </div>
      <CompactStatusGrid
        className="relative mb-2.5"
        items={[
          {
            label: "Transport",
            value: systemPressure === "critical" ? "Hold Recommended" : transportStatusLabel,
            tone:
              systemPressureTone === "danger"
                ? "danger"
                : previewProgramDifferent
                  ? "warning"
                  : "safe",
          },
          {
            label: "Transition",
            value: `${selectedTransitionDurationMs ?? 600}ms ${selectedTransitionType}`,
            tone: "preview",
          },
          {
            label: "Audio",
            value: openSurfaces.audio ? "Mixer Visible" : "Mixer Collapsed",
            tone: openSurfaces.audio ? "safe" : "neutral",
          },
          {
            label: "Routing",
            value: systemPressure === "critical" ? "Confidence Risk" : routingStatusLabel,
            tone: systemPressure === "critical" ? "danger" : openSurfaces.routing ? "safe" : "neutral",
          },
          {
            label: surfaceModeLabel,
            value: rundownStatusLabel,
            tone: openSurfaces.rundown ? "warning" : "neutral",
          },
        ]}
      />
      <div
  className={[
    "relative mb-2.5 overflow-hidden rounded-[24px] border px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-500",
    systemPressure === "critical"
      ? "border-red-300/18 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.16),transparent_42%),rgba(60,0,0,0.34)]"
      : systemPressure === "watch"
        ? "border-amber-300/16 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_42%),rgba(42,28,0,0.30)]"
        : liveLocked
          ? "border-emerald-300/14 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_42%),rgba(0,24,18,0.28)]"
          : "border-sky-300/14 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_42%),rgba(0,16,32,0.28)]",
  ].join(" ")}
>
  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.05),transparent)] animate-[transportPanelSweep_8s_ease-in-out_infinite]" />

  <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
    <div>
      <div className="text-[8px] font-black uppercase tracking-[0.24em] text-white/34">
        Program Safety Rail
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <div
          className={[
            "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
            systemPressure === "critical"
              ? "border-red-300/22 bg-red-400/14 text-red-50 shadow-[0_0_18px_rgba(239,68,68,0.18)]"
              : systemPressure === "watch"
                ? "border-amber-300/22 bg-amber-400/14 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.16)]"
                : liveLocked
                  ? "border-emerald-300/18 bg-emerald-400/12 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.14)]"
                  : "border-sky-300/18 bg-sky-400/12 text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.14)]",
          ].join(" ")}
        >
          {systemPressure === "critical"
            ? "Hold Transitions"
            : systemPressure === "watch"
              ? "Confidence Degraded"
              : liveLocked
                ? "Safe To Take"
                : "Rehearsal Mode"}
        </div>

        <div className="rounded-full border border-white/10 bg-black/28 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
          {previewProgramDifferent
            ? "Preview Armed"
            : "Program Matched"}
        </div>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <div className="rounded-full border border-white/10 bg-black/24 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
        {selectedTransitionType} · {selectedTransitionDurationMs ?? 600}ms
      </div>

      <div
        className={[
          "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em]",
          takeBusy
            ? "border-red-300/18 bg-red-400/12 text-red-50"
            : "border-white/10 bg-black/24 text-white/42",
        ].join(" ")}
      >
        {takeBusy ? "Transition Active" : "Transport Ready"}
      </div>
    </div>
  </div>
</div>
      <div className="relative grid gap-2.5 xl:grid-cols-[0.95fr_0.8fr_1.25fr]">
        {shouldShowSurface("transport") ? (
          <CollapsibleSurface
            title="Program Transport"
            eyebrow="Director Surface"
            status={openSurfaces.transport ? systemPressure === "critical" ? "Hold Recommended" : transportStatusLabel : "Transport Collapsed"}
            tone={
              systemPressure !== "stable"
                ? systemPressureSurfaceTone
                : previewProgramDifferent
                  ? "amber"
                  : "emerald"
            }
            open={openSurfaces.transport}
            isFocused={focusedSurface === "transport"}
            isDimmed={focusedSurface !== null && focusedSurface !== "transport"}
            onFocus={() => focusSurface("transport")}
            onClearFocus={clearFocusedSurface}
            onOpenChange={(open) => setSurfaceOpen("transport", open)}
          >
            <ControlStagePanel
              previewProgramDifferent={previewProgramDifferent}
              takeBusy={takeBusy}
              onTake={onTake}
              selectedTransitionType={selectedTransitionType}
              selectedTransitionDurationMs={selectedTransitionDurationMs}
              systemPressure={systemPressure}
              rundownMode={globalRundownMode}
            />
          </CollapsibleSurface>
        ) : null}

        {shouldShowSurface("transition") ? (
          <CollapsibleSurface
            title="Transition Engine"
            eyebrow="Motion Control"
            status={openSurfaces.transition ? `${selectedTransitionDurationMs ?? 600}ms ${selectedTransitionType}` : "Transition Collapsed"}
            tone="violet"
            open={openSurfaces.transition}
            isFocused={focusedSurface === "transition"}
            isDimmed={focusedSurface !== null && focusedSurface !== "transition"}
            onFocus={() => focusSurface("transition")}
            onClearFocus={clearFocusedSurface}
            onOpenChange={(open) => setSurfaceOpen("transition", open)}
          >
            <TransitionPanel
              selectedTransitionType={selectedTransitionType}
              onTransitionTypeChange={onTransitionTypeChange}
              selectedTransitionDurationMs={selectedTransitionDurationMs}
              onTransitionDurationChange={onTransitionDurationChange}
            />
          </CollapsibleSurface>
        ) : null}

        {shouldShowSurface("audio") ? (
          <CollapsibleSurface
            title="Audio Mixer"
            eyebrow="Broadcast Audio"
            status={systemPressure === "critical" ? "IFB Priority" : openSurfaces.audio ? "Mixer Visible" : "Mixer Collapsed"}
            tone={systemPressure === "critical" ? "amber" : "emerald"}
            open={openSurfaces.audio}
            isFocused={focusedSurface === "audio"}
            isDimmed={focusedSurface !== null && focusedSurface !== "audio"}
            onFocus={() => focusSurface("audio")}
            onClearFocus={clearFocusedSurface}
            onOpenChange={(open) => setSurfaceOpen("audio", open)}
          >
            <AudioMixerPanel systemPressure={systemPressure} />
          </CollapsibleSurface>
        ) : null}
      </div>

      <SurfaceDivider className="my-2 opacity-60" />
      <div className="relative mt-2.5 grid gap-2.5 xl:grid-cols-[0.9fr_1.1fr]">
        {shouldShowSurface("routing") ? (
          <CollapsibleSurface
            title="Routing + Confidence"
            eyebrow="Transmission"
            status={systemPressure === "critical" ? "Confidence Risk" : openSurfaces.routing ? "Confidence Visible" : "Confidence Collapsed"}
            tone={systemPressure === "critical" ? "red" : systemPressure === "watch" ? "amber" : "sky"}
            open={openSurfaces.routing}
            isFocused={focusedSurface === "routing"}
            isDimmed={focusedSurface !== null && focusedSurface !== "routing"}
            onFocus={() => focusSurface("routing")}
            onClearFocus={clearFocusedSurface}
            onOpenChange={(open) => setSurfaceOpen("routing", open)}
          >
            <BroadcastRoutingPanel
              confidenceScenario={systemPressure}
              onConfidenceScenarioChange={setSystemPressure}
            />
          </CollapsibleSurface>
        ) : null}

        {shouldShowSurface("rundown") ? (
          <CollapsibleSurface
            title="Rundown Engine"
            eyebrow="Show Control"
            status={openSurfaces.rundown ? "Cue Stack Visible" : "Cue Stack Collapsed"}
            tone="amber"
            open={openSurfaces.rundown}
            isFocused={focusedSurface === "rundown"}
            isDimmed={focusedSurface !== null && focusedSurface !== "rundown"}
            onFocus={() => focusSurface("rundown")}
            onClearFocus={clearFocusedSurface}
            onOpenChange={(open) => setSurfaceOpen("rundown", open)}
          >
            <div
              className={
                systemPressure === "critical"
                  ? "rounded-[30px] border border-red-300/14 bg-red-400/[0.03] p-1 shadow-[0_0_24px_rgba(239,68,68,0.08)] animate-[criticalSurfacePulse_2.2s_ease-in-out_infinite]"
                  : systemPressure === "watch"
                    ? "rounded-[30px] border border-amber-300/12 bg-amber-400/[0.025] p-1 shadow-[0_0_20px_rgba(251,191,36,0.06)]"
                    : "rounded-[30px] p-1"
              }
            >
              <RundownCuePanel
                rundownMode={globalRundownMode}
                onRundownModeChange={setGlobalRundownMode}
              />
            </div>
          </CollapsibleSurface>
        ) : null}
      </div>
    </div>
  )
}