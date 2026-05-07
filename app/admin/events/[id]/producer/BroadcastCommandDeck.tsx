import { useEffect, useMemo, useState, type JSX } from "react"
import type {
  BroadcastCommandDeckProps,
  CinematicTransitionType,
} from "./commandDeckTypes"
import { useRuntimeLabel, useTakeControls } from "./useCommandDeckControls"
import {
  CommandDeckStyles,
  CommandSurfaceHeader,
  LowerCommandGrid,
  TakeFlashOverlay,
  TelemetryStrip,
} from "./CommandDeckPanels"

type TransmissionHealthState = "stable" | "attention" | "critical"


const TRANSPORT_RUNTIME_STATES = [
  "Encoder Stable",
  "Return Feed Locked",
  "ISO Matrix Armed",
  "Confidence Monitoring Online",
  "Distribution Path Healthy",
] as const

type OperationsPanelKey = "transmission" | "recording" | "comms"

type CommandDeckDensityMode = "switcher" | "ops" | "deep" | "custom"


const OPERATIONS_PANEL_LABELS: Record<OperationsPanelKey, string> = {
  transmission: "Transmission",
  recording: "Recording",
  comms: "Comms",
}

const COMMAND_DECK_DENSITY_LABELS: Record<CommandDeckDensityMode, string> = {
  switcher: "Switcher",
  ops: "Ops",
  deep: "Deep",
  custom: "Custom",
}


function CommandStatusPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "neutral" | "red" | "violet" | "green"
}): JSX.Element {
  const toneClass =
    tone === "red"
      ? "border-red-300/16 bg-red-500/10 text-red-100/72"
      : tone === "violet"
        ? "border-violet-300/16 bg-violet-400/10 text-violet-100/72"
        : tone === "green"
          ? "border-emerald-300/16 bg-emerald-400/10 text-emerald-100/72"
          : "border-white/10 bg-black/24 text-white/42"

  return (
    <div className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${toneClass}`}>
      <span className="text-white/30">{label}</span>{" "}
      <span>{value}</span>
    </div>
  )
}

function TransmissionHealthCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone: TransmissionHealthState
}): JSX.Element {
  const toneClassName =
    tone === "critical"
      ? "border-red-300/18 bg-red-500/10 text-red-100/78"
      : tone === "attention"
        ? "border-amber-300/18 bg-amber-400/10 text-amber-100/74"
        : "border-emerald-300/18 bg-emerald-400/10 text-emerald-100/74"

  const meterClassName =
    tone === "critical"
      ? "bg-red-300"
      : tone === "attention"
        ? "bg-amber-300"
        : "bg-emerald-300"

  return (
    <div className={`rounded-[24px] border px-3 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.03)] ${toneClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/34">
            {label}
          </div>

          <div className="mt-1 text-sm font-black tracking-tight text-white">
            {value}
          </div>
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className={[
                "h-5 w-1 rounded-full opacity-90",
                index < (tone === "critical" ? 3 : tone === "attention" ? 5 : 8)
                  ? meterClassName
                  : "bg-white/10",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 text-[10px] leading-relaxed text-white/44">
        {detail}
      </div>
    </div>
  )
}

function OperationsStackHeader({
  openPanels,
  onTogglePanel,
  onCollapseAll,
  onOpenAll,
  activeDensityMode,
  onSetDensityMode,
  isLive,
  previewProgramDifferent,
  takeBusy,
  onStageCount,
}: {
  openPanels: Record<OperationsPanelKey, boolean>
  onTogglePanel: (panel: OperationsPanelKey) => void
  onCollapseAll: () => void
  onOpenAll: () => void
  activeDensityMode: CommandDeckDensityMode
  onSetDensityMode: (mode: CommandDeckDensityMode) => void
  isLive: boolean
  previewProgramDifferent: boolean
  takeBusy: boolean
  onStageCount: number
}): JSX.Element {
  const openPanelCount = Object.values(openPanels).filter(Boolean).length
  const stackStateLabel = openPanelCount === 0 ? "Compact" : `${openPanelCount} Open`
  const densityLabel = COMMAND_DECK_DENSITY_LABELS[activeDensityMode]
  const transmissionSummary = takeBusy
    ? "Transport Locked"
    : previewProgramDifferent
      ? "Return Verify"
      : isLive
        ? "Live Nominal"
        : "Standby Nominal"
  const recordingSummary = isLive ? "Master + ISO REC" : "Record Armed"
  const commsSummary = onStageCount > 0 ? `${onStageCount} IFB Routed` : "IFB Standby"
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.034),rgba(255,255,255,0.012))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
            Broadcast Operations Stack
          </div>
          <div className="rounded-full border border-white/10 bg-black/24 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-white/42">
            {stackStateLabel}
          </div>
          <div className="rounded-full border border-violet-300/12 bg-violet-400/8 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-violet-100/48">
            {densityLabel} View
          </div>
        </div>
        <div className="mt-1 text-[11px] font-semibold text-white/46">
          Collapse deep systems when you need a cleaner switcher surface.
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[8px] font-black uppercase tracking-[0.15em]">
          <span className="rounded-full border border-emerald-300/12 bg-emerald-400/8 px-2 py-0.5 text-emerald-100/52">
            TX · {transmissionSummary}
          </span>
          <span className="rounded-full border border-red-300/12 bg-red-400/8 px-2 py-0.5 text-red-100/52">
            REC · {recordingSummary}
          </span>
          <span className="rounded-full border border-sky-300/12 bg-sky-400/8 px-2 py-0.5 text-sky-100/52">
            IFB · {commsSummary}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {(["switcher", "ops", "deep"] as CommandDeckDensityMode[]).map((mode) => {
          const active = activeDensityMode === mode

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSetDensityMode(mode)}
              className={[
                "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition-all duration-200",
                active
                  ? "border-violet-300/24 bg-violet-400/14 text-violet-100 shadow-[0_0_20px_rgba(168,85,247,0.16)]"
                  : "border-white/10 bg-black/24 text-white/38 hover:border-white/18 hover:bg-white/[0.05] hover:text-white/72",
              ].join(" ")}
            >
              {COMMAND_DECK_DENSITY_LABELS[mode]}
            </button>
          )
        })}

        <div className="mx-0.5 hidden h-5 w-px bg-white/10 sm:block" />
        <button
          type="button"
          onClick={onCollapseAll}
          className="rounded-full border border-white/10 bg-black/24 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/38 transition hover:border-white/18 hover:bg-white/[0.05] hover:text-white/72"
        >
          Compact
        </button>
        <button
          type="button"
          onClick={onOpenAll}
          className="rounded-full border border-violet-300/14 bg-violet-400/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/54 transition hover:border-violet-300/24 hover:bg-violet-400/12 hover:text-violet-100/82"
        >
          Open All
        </button>
        {(Object.keys(OPERATIONS_PANEL_LABELS) as OperationsPanelKey[]).map((panel) => {
          const open = openPanels[panel]

          return (
            <button
              key={panel}
              type="button"
              onClick={() => onTogglePanel(panel)}
              className={[
                "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition-all duration-200",
                open
                  ? "border-sky-300/22 bg-sky-400/12 text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.14)]"
                  : "border-white/10 bg-black/24 text-white/38 hover:border-white/18 hover:bg-white/[0.05] hover:text-white/74",
              ].join(" ")}
            >
              {OPERATIONS_PANEL_LABELS[panel]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TransmissionMetricStrip({
  isLive,
  previewProgramDifferent,
  takeBusy,
}: {
  isLive: boolean
  previewProgramDifferent: boolean
  takeBusy: boolean
}): JSX.Element {
  const stateLabel = takeBusy
    ? "Transport Lock"
    : previewProgramDifferent
      ? "Preview Divergence"
      : isLive
        ? "Live Path Nominal"
        : "Standby Path Nominal"

  const stateClassName = takeBusy
    ? "border-red-300/18 bg-red-500/10 text-red-100/72"
    : previewProgramDifferent
      ? "border-amber-300/18 bg-amber-400/10 text-amber-100/72"
      : "border-emerald-300/18 bg-emerald-400/10 text-emerald-100/72"

  const transmissionMetrics = [
    {
      label: "Bitrate",
      value: isLive ? "8.2 Mbps" : "Standby",
      tone: isLive ? "stable" : "muted",
    },
    {
      label: "RTT",
      value: takeBusy ? "--" : previewProgramDifferent ? "44 ms" : "38 ms",
      tone: takeBusy ? "attention" : "stable",
    },
    {
      label: "Loss",
      value: takeBusy ? "Hold" : previewProgramDifferent ? "0.2%" : "0.1%",
      tone: previewProgramDifferent ? "attention" : "stable",
    },
    {
      label: "Dropped",
      value: takeBusy ? "Lock" : "0 fr",
      tone: takeBusy ? "attention" : "stable",
    },
    {
      label: "Return",
      value: previewProgramDifferent ? "Verify" : "92 ms",
      tone: previewProgramDifferent ? "attention" : "stable",
    },
    {
      label: "ISO",
      value: isLive ? "3 Armed" : "Standby",
      tone: isLive ? "stable" : "muted",
    },
  ] as const

  return (
    <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
          Transmission Telemetry
        </div>

        <div className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${stateClassName}`}>
          {stateLabel}
        </div>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
        {transmissionMetrics.map((metric) => (
          <div
            key={metric.label}
            className={[
              "rounded-2xl border px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
              metric.tone === "attention"
                ? "border-amber-300/14 bg-amber-400/8"
                : metric.tone === "muted"
                  ? "border-white/8 bg-black/18"
                  : "border-emerald-300/10 bg-emerald-400/[0.045]",
            ].join(" ")}
          >
            <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">
              {metric.label}
            </div>
            <div
              className={[
                "mt-1 text-[12px] font-black",
                metric.tone === "attention"
                  ? "text-amber-100/82"
                  : metric.tone === "muted"
                    ? "text-white/42"
                    : "text-emerald-100/82",
              ].join(" ")}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecordingOperationsStrip({
  isLive,
  takeBusy,
}: {
  isLive: boolean
  takeBusy: boolean
}): JSX.Element {
  const recorderStateLabel = takeBusy
    ? "Recorder Hold"
    : isLive
      ? "Capture In Progress"
      : "Record Standby"

  const recorderStateClassName = takeBusy
    ? "border-red-300/18 bg-red-500/10 text-red-100/72"
    : isLive
      ? "border-red-300/18 bg-red-500/10 text-red-100/72"
      : "border-amber-300/18 bg-amber-400/10 text-amber-100/72"

  const recordTargets = [
    {
      label: "Master",
      value: isLive ? "REC" : "ARM",
      detail: "Program clean feed",
      tone: isLive ? "live" : "armed",
    },
    {
      label: "Host ISO",
      value: isLive ? "REC" : "ARM",
      detail: "Camera isolated",
      tone: isLive ? "live" : "armed",
    },
    {
      label: "Guest ISO",
      value: isLive ? "REC" : "ARM",
      detail: "Remote source isolated",
      tone: isLive ? "live" : "armed",
    },
    {
      label: "Media ISO",
      value: "READY",
      detail: "Playback reference",
      tone: "ready",
    },
  ] as const

  return (
    <div className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.09),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
            Recording Operations
          </div>
          <div className="mt-1 text-[11px] font-semibold text-white/46">
            Master capture, ISO readiness, storage target, and failover posture.
          </div>
        </div>

        <div className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${recorderStateClassName}`}>
          {recorderStateLabel}
        </div>
      </div>

      <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-4">
        {recordTargets.map((target) => (
          <div
            key={target.label}
            className={[
              "rounded-2xl border px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
              target.tone === "live"
                ? "border-red-300/16 bg-red-500/10"
                : target.tone === "armed"
                  ? "border-amber-300/14 bg-amber-400/8"
                  : "border-emerald-300/10 bg-emerald-400/[0.045]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">
                {target.label}
              </div>
              <div
                className={[
                  "rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em]",
                  target.tone === "live"
                    ? "border-red-300/18 bg-red-400/10 text-red-100/76"
                    : target.tone === "armed"
                      ? "border-amber-300/18 bg-amber-400/10 text-amber-100/74"
                      : "border-emerald-300/16 bg-emerald-400/10 text-emerald-100/72",
                ].join(" ")}
              >
                {target.value}
              </div>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-white/48">
              {target.detail}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 grid gap-1.5 md:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/18 px-2.5 py-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Storage Target</div>
          <div className="mt-1 text-[12px] font-black text-white/72">Primary Cloud Bucket</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/18 px-2.5 py-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Duration</div>
          <div className="mt-1 text-[12px] font-black text-white/72">{isLive ? "00:12:48" : "00:00:00"}</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/18 px-2.5 py-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Failover</div>
          <div className="mt-1 text-[12px] font-black text-white/72">Local Cache Armed</div>
        </div>
      </div>
    </div>
  )
}

function CommsOperationsStrip({
  isLive,
  onStageCount,
  takeBusy,
}: {
  isLive: boolean
  onStageCount: number
  takeBusy: boolean
}): JSX.Element {
  const commsStateLabel = takeBusy
    ? "Comms Hold"
    : onStageCount > 0
      ? "Talent Routed"
      : "IFB Standby"

  const commsStateClassName = takeBusy
    ? "border-red-300/18 bg-red-500/10 text-red-100/72"
    : onStageCount > 0
      ? "border-sky-300/18 bg-sky-400/10 text-sky-100/72"
      : "border-white/10 bg-black/22 text-white/44"

  const commsTargets = [
    {
      label: "Director",
      value: "Listen",
      detail: "Producer monitor bus",
      tone: "safe",
    },
    {
      label: "Host IFB",
      value: onStageCount > 0 ? "Routed" : "Standby",
      detail: "Cue-only talent return",
      tone: onStageCount > 0 ? "active" : "muted",
    },
    {
      label: "Guest IFB",
      value: onStageCount > 1 ? "Routed" : "Standby",
      detail: "Remote presenter return",
      tone: onStageCount > 1 ? "active" : "muted",
    },
    {
      label: "Talkback",
      value: takeBusy ? "Locked" : "Safe",
      detail: "Push-to-talk disabled by default",
      tone: takeBusy ? "warning" : "safe",
    },
  ] as const

  return (
    <div className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
            IFB + Talkback Operations
          </div>
          <div className="mt-1 text-[11px] font-semibold text-white/46">
            Confidence listen buses, cue-only returns, and protected talkback posture.
          </div>
        </div>

        <div className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${commsStateClassName}`}>
          {commsStateLabel}
        </div>
      </div>

      <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-4">
        {commsTargets.map((target) => (
          <div
            key={target.label}
            className={[
              "rounded-2xl border px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
              target.tone === "active"
                ? "border-sky-300/16 bg-sky-400/10"
                : target.tone === "warning"
                  ? "border-amber-300/14 bg-amber-400/8"
                  : target.tone === "muted"
                    ? "border-white/8 bg-black/18"
                    : "border-emerald-300/10 bg-emerald-400/[0.045]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">
                {target.label}
              </div>
              <div
                className={[
                  "rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em]",
                  target.tone === "active"
                    ? "border-sky-300/18 bg-sky-400/10 text-sky-100/74"
                    : target.tone === "warning"
                      ? "border-amber-300/18 bg-amber-400/10 text-amber-100/74"
                      : target.tone === "muted"
                        ? "border-white/8 bg-black/20 text-white/38"
                        : "border-emerald-300/16 bg-emerald-400/10 text-emerald-100/72",
                ].join(" ")}
              >
                {target.value}
              </div>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-white/48">
              {target.detail}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 grid gap-1.5 md:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-black/18 px-2.5 py-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Confidence Bus</div>
          <div className="mt-1 text-[12px] font-black text-white/72">Program Return + IFB</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/18 px-2.5 py-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Talent Count</div>
          <div className="mt-1 text-[12px] font-black text-white/72">{onStageCount} Routed</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/18 px-2.5 py-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Show State</div>
          <div className="mt-1 text-[12px] font-black text-white/72">{isLive ? "Live Comms Protected" : "Standby Comms Safe"}</div>
        </div>
      </div>
    </div>
  )
}

export default function BroadcastCommandDeck({
  isLive,
  audienceCount,
  onStageCount,
  previewProgramDifferent,
  takeBusy,
  onTake,
}: BroadcastCommandDeckProps): JSX.Element {
  const runtimeLabel = useRuntimeLabel()

  const [transportRuntimeIndex, setTransportRuntimeIndex] = useState(0)

  const [openOperationsPanels, setOpenOperationsPanels] = useState<Record<OperationsPanelKey, boolean>>({
    transmission: false,
    recording: false,
    comms: false,
  })

  const [showHealthCards, setShowHealthCards] = useState(false)

  const [deckDensityMode, setDeckDensityMode] = useState<CommandDeckDensityMode>("switcher")

  const [selectedTransitionType, setSelectedTransitionType] =
    useState<CinematicTransitionType>("fade")

  const [selectedTransitionDurationMs, setSelectedTransitionDurationMs] =
    useState(600)

  const { takeFlash, triggerTake } = useTakeControls({
    previewProgramDifferent,
    takeBusy,
    onTake: (mode, transitionType) => {
      onTake(mode, transitionType, selectedTransitionDurationMs)
    },
  })

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTransportRuntimeIndex((current) =>
        current >= TRANSPORT_RUNTIME_STATES.length - 1 ? 0 : current + 1
      )
    }, 4200)

    return () => window.clearInterval(interval)
  }, [])

  const commandState = useMemo(() => {
    if (takeBusy) return "Transition Locked"
    if (!previewProgramDifferent) return "Program Safe"
    return "Preview Armed"
  }, [previewProgramDifferent, takeBusy])

  const toggleOperationsPanel = (panel: OperationsPanelKey): void => {
    setDeckDensityMode("custom")
    setOpenOperationsPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }))
  }

  const collapseAllOperationsPanels = (): void => {
    setDeckDensityMode("switcher")
    setShowHealthCards(false)
    setOpenOperationsPanels({
      transmission: false,
      recording: false,
      comms: false,
    })
  }

  const openAllOperationsPanels = (): void => {
    setDeckDensityMode("deep")
    setShowHealthCards(true)
    setOpenOperationsPanels({
      transmission: true,
      recording: true,
      comms: true,
    })
  }

  const applyDeckDensityMode = (mode: CommandDeckDensityMode): void => {
    setDeckDensityMode(mode)

    if (mode === "switcher") {
      setShowHealthCards(false)
      setOpenOperationsPanels({
        transmission: false,
        recording: false,
        comms: false,
      })
      return
    }

    if (mode === "ops") {
      setShowHealthCards(false)
      setOpenOperationsPanels({
        transmission: true,
        recording: false,
        comms: false,
      })
      return
    }

    setShowHealthCards(true)
    setOpenOperationsPanels({
      transmission: true,
      recording: true,
      comms: true,
    })
  }

  const transmissionHealth: TransmissionHealthState = takeBusy
    ? "attention"
    : previewProgramDifferent
      ? "attention"
      : isLive
        ? "stable"
        : "stable"

  const recordingHealth: TransmissionHealthState = isLive ? "stable" : "attention"

  const returnFeedHealth: TransmissionHealthState = previewProgramDifferent
    ? "attention"
    : "stable"

  const transportRuntimeLabel = TRANSPORT_RUNTIME_STATES[transportRuntimeIndex]

  return (
    <div className="relative mb-3 space-y-2.5 rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.07),transparent_32%),linear-gradient(180deg,rgba(6,10,24,0.90),rgba(2,4,10,0.98))] px-3 py-3 shadow-[0_30px_120px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.055)] md:px-4 xl:px-5 2xl:px-6">
      {takeFlash ? <TakeFlashOverlay mode={takeFlash} /> : null}

      <CommandSurfaceHeader isLive={isLive} />

      <TelemetryStrip
        isLive={isLive}
        audienceCount={audienceCount}
        onStageCount={onStageCount}
        runtimeLabel={runtimeLabel}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.014))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
            Broadcast Operations State
          </div>

          <div className="mt-1 text-sm font-semibold tracking-tight text-white">
            {commandState} · {transportRuntimeLabel}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CommandStatusPill
            label="Program"
            value={isLive ? "Live" : "Standby"}
            tone={isLive ? "red" : "neutral"}
          />

          <CommandStatusPill
            label="Preview"
            value={previewProgramDifferent ? "Armed" : "Matched"}
            tone={previewProgramDifferent ? "violet" : "green"}
          />

          <CommandStatusPill
            label="Transition"
            value={takeBusy ? "Locked" : "Ready"}
            tone={takeBusy ? "red" : "green"}
          />

          <button
            type="button"
            onClick={() => {
              setShowHealthCards((current) => !current)
              setDeckDensityMode("custom")
            }}
            className={[
              "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition-all duration-200",
              showHealthCards
                ? "border-sky-300/22 bg-sky-400/12 text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.14)]"
                : "border-white/10 bg-black/24 text-white/38 hover:border-white/18 hover:bg-white/[0.05] hover:text-white/74",
            ].join(" ")}
          >
            {showHealthCards ? "Hide Diagnostics" : "Show Diagnostics"}
          </button>
        </div>
      </div>

      {showHealthCards ? (
        <div className="grid gap-2.5 xl:grid-cols-4">
          <TransmissionHealthCard
            label="Transmission"
            value={isLive ? "Distribution Stable" : "Standby Transport"}
            detail="Encoder and downstream distribution paths remain synchronized."
            tone={transmissionHealth}
          />

          <TransmissionHealthCard
            label="Recording"
            value={isLive ? "Master + ISO Armed" : "Record Standby"}
            detail="Program and isolated recording paths are prepared for capture."
            tone={recordingHealth}
          />

          <TransmissionHealthCard
            label="Confidence Return"
            value={previewProgramDifferent ? "Preview Diverged" : "Program Verified"}
            detail="Return feed integrity is continuously validated against live program."
            tone={returnFeedHealth}
          />

          <TransmissionHealthCard
            label="Operator Safety"
            value={takeBusy ? "Transport Locked" : "Ready For TAKE"}
            detail="Guardrails prevent accidental transitions during transport operations."
            tone={takeBusy ? "critical" : "stable"}
          />
        </div>
      ) : null}

      <OperationsStackHeader
        openPanels={openOperationsPanels}
        onTogglePanel={toggleOperationsPanel}
        onCollapseAll={collapseAllOperationsPanels}
        onOpenAll={openAllOperationsPanels}
        activeDensityMode={deckDensityMode}
        onSetDensityMode={applyDeckDensityMode}
        isLive={isLive}
        previewProgramDifferent={previewProgramDifferent}
        takeBusy={takeBusy}
        onStageCount={onStageCount}
      />

      {openOperationsPanels.transmission ? (
        <TransmissionMetricStrip
          isLive={isLive}
          previewProgramDifferent={previewProgramDifferent}
          takeBusy={takeBusy}
        />
      ) : null}

      {openOperationsPanels.recording ? (
        <RecordingOperationsStrip
          isLive={isLive}
          takeBusy={takeBusy}
        />
      ) : null}

      {openOperationsPanels.comms ? (
        <CommsOperationsStrip
          isLive={isLive}
          onStageCount={onStageCount}
          takeBusy={takeBusy}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.014))] px-3 py-2 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/32">
            Transition Transport
          </div>
          <div className="mt-1 text-sm font-semibold tracking-tight text-white">
            {selectedTransitionType.replace("_", " ")} · {selectedTransitionDurationMs}ms transport
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[250, 400, 600, 900, 1400].map((duration) => {
            const active = selectedTransitionDurationMs === duration

            return (
              <button
                key={duration}
                type="button"
                onClick={() => setSelectedTransitionDurationMs(duration)}
                className={[
                  "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200",
                  active
                    ? "border-violet-300/28 bg-violet-400/16 text-violet-100 shadow-[0_0_22px_rgba(168,85,247,0.20)]"
                    : "border-white/10 bg-black/28 text-white/42 hover:border-white/18 hover:bg-white/[0.05] hover:text-white",
                ].join(" ")}
              >
                {duration}ms
              </button>
            )
          })}
        </div>
      </div>

      <LowerCommandGrid
        previewProgramDifferent={previewProgramDifferent}
        takeBusy={takeBusy}
        onTake={triggerTake}
        selectedTransitionType={selectedTransitionType}
        onTransitionTypeChange={setSelectedTransitionType}
        selectedTransitionDurationMs={selectedTransitionDurationMs}
        onTransitionDurationChange={setSelectedTransitionDurationMs}
      />

      <CommandDeckStyles />
    </div>
  )
}