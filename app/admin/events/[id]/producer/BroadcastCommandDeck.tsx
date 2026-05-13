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

function BroadcastSyncPulseOverlay({ active }: { active: boolean }): JSX.Element | null {
  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[36px]">
      <div className="absolute inset-0 animate-[commandDeckSyncFlash_720ms_ease-out] bg-red-400/10" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-200/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-200/40 to-transparent" />
      <div className="absolute left-0 top-0 h-full w-24 animate-[commandDeckSweep_720ms_ease-out] bg-gradient-to-r from-transparent via-white/14 to-transparent" />
      <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-red-200/20 bg-black/55 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-red-100/80 backdrop-blur-md shadow-[0_0_28px_rgba(248,113,113,0.22)]">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-red-300" />
        Switcher Sync
      </div>
    </div>
  )
}

function CommandDeckAtmosphere({
  isLive,
  armed,
}: {
  isLive: boolean
  armed: boolean
}): JSX.Element {
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-40 transition-opacity duration-700 ${
          isLive
            ? "bg-gradient-to-b from-red-300/12 via-violet-300/6 to-transparent"
            : armed
              ? "bg-gradient-to-b from-amber-300/10 via-sky-300/6 to-transparent"
              : "bg-gradient-to-b from-violet-300/8 via-sky-300/5 to-transparent"
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.028)_42%,transparent_64%)] animate-[commandDeckAtmosphereSweep_10s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_7px)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-sky-300/[0.045] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-red-300/[0.045] to-transparent" />

      {armed ? (
        <div className="pointer-events-none absolute inset-x-14 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-200/32 to-transparent animate-[commandDeckArmedRail_2.6s_ease-in-out_infinite]" />
      ) : null}
    </>
  )
}

function BroadcastPresenceStrip({
  isLive,
  audienceCount,
  onStageCount,
  previewProgramDifferent,
  takeBusy,
  runtimeLabel,
  selectedTransitionType,
  selectedTransitionDurationMs,
}: {
  isLive: boolean
  audienceCount: number
  onStageCount: number
  previewProgramDifferent: boolean
  takeBusy: boolean
  runtimeLabel: string
  selectedTransitionType: CinematicTransitionType
  selectedTransitionDurationMs: number
}): JSX.Element {
  const signalLabel = takeBusy
    ? "Transport Locked"
    : previewProgramDifferent
      ? "Preview Armed"
      : isLive
        ? "Signal On-Air"
        : "Signal Standby"

  const signalClassName = takeBusy
    ? "border-red-300/22 bg-red-500/12 text-red-100"
    : previewProgramDifferent
      ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
      : isLive
        ? "border-red-300/22 bg-red-500/12 text-red-100"
        : "border-emerald-300/16 bg-emerald-400/8 text-emerald-100/72"

  const transitionLabel = selectedTransitionType.replace("_", " ")

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.10),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.09),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.036),rgba(255,255,255,0.012))] px-3 py-3 shadow-[0_22px_70px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.045)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.035)_42%,transparent_64%)] animate-[commandDeckAtmosphereSweep_9s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.75)_0px,rgba(255,255,255,0.75)_1px,transparent_1px,transparent_9px)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

      <div className="relative z-10 grid gap-2 md:grid-cols-[1.15fr_0.85fr_0.85fr_0.85fr]">
        <div className="rounded-[22px] border border-white/10 bg-black/28 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-white/30">
              Program Presence
            </div>
            <div className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${signalClassName}`}>
              {signalLabel}
            </div>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <div className="text-lg font-black tracking-tight text-white">
                {isLive ? "ON AIR" : "STANDBY"}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/36">
                Runtime · {runtimeLabel}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className={`h-5 w-1.5 rounded-full ${
                    takeBusy
                      ? index < 3
                        ? "bg-red-300 shadow-[0_0_12px_rgba(248,113,113,0.45)]"
                        : "bg-white/10"
                      : isLive
                        ? "bg-red-300 shadow-[0_0_12px_rgba(248,113,113,0.45)]"
                        : index < 4
                          ? "bg-emerald-300/75 shadow-[0_0_10px_rgba(52,211,153,0.28)]"
                          : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/24 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[8px] font-black uppercase tracking-[0.22em] text-white/30">
            Audience Lock
          </div>
          <div className="mt-2 text-lg font-black tracking-tight text-white">
            {audienceCount}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/36">
            Connected viewers
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/24 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[8px] font-black uppercase tracking-[0.22em] text-white/30">
            Talent Route
          </div>
          <div className="mt-2 text-lg font-black tracking-tight text-white">
            {onStageCount}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/36">
            On-stage sources
          </div>
        </div>

        <div className="rounded-[22px] border border-violet-300/14 bg-violet-400/8 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[8px] font-black uppercase tracking-[0.22em] text-violet-100/38">
            Transition Intent
          </div>
          <div className="mt-2 text-lg font-black capitalize tracking-tight text-white">
            {transitionLabel}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-100/42">
            {selectedTransitionDurationMs}ms transport
          </div>
        </div>
      </div>
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

function TransitionIntentStrip({
  selectedTransitionType,
  selectedTransitionDurationMs,
  onTransitionTypeChange,
  onTransitionDurationChange,
}: {
  selectedTransitionType: CinematicTransitionType
  selectedTransitionDurationMs: number
  onTransitionTypeChange: (transitionType: CinematicTransitionType) => void
  onTransitionDurationChange: (durationMs: number) => void
}): JSX.Element {
  const transitionOptions: Array<{
    type: CinematicTransitionType
    label: string
    detail: string
  }> = [
    {
      type: "fade",
      label: "Dissolve",
      detail: "Soft keynote-style blend",
    },
    {
      type: "warp",
      label: "Warp",
      detail: "Energy burst between looks",
    },
    {
      type: "curtain",
      label: "Curtain",
      detail: "Stage-style reveal move",
    },
  ]

  return (
    <div className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
            Transition Package
          </div>
          <div className="mt-1 text-[11px] font-semibold text-white/46">
            Choose the visual language before the next TAKE.
          </div>
        </div>
        <div className="rounded-full border border-violet-300/14 bg-violet-400/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-violet-100/58">
          {selectedTransitionDurationMs}ms selected
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        {transitionOptions.map((option) => {
          const active = selectedTransitionType === option.type

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onTransitionTypeChange(option.type)}
              className={[
                "rounded-[22px] border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
                active
                  ? "border-violet-300/28 bg-violet-400/14 shadow-[0_0_30px_rgba(168,85,247,0.18),inset_0_1px_0_rgba(255,255,255,0.045)]"
                  : "border-white/10 bg-black/20 hover:border-white/18 hover:bg-white/[0.045]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/66">
                  {option.label}
                </div>
                <div
                  className={[
                    "rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em]",
                    active
                      ? "border-violet-300/18 bg-violet-400/10 text-violet-100/74"
                      : "border-white/8 bg-black/22 text-white/34",
                  ].join(" ")}
                >
                  {active ? "Armed" : "Ready"}
                </div>
              </div>
              <div className="mt-2 text-[11px] font-semibold leading-relaxed text-white/42">
                {option.detail}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {[250, 400, 600, 900, 1400].map((duration) => {
          const active = selectedTransitionDurationMs === duration

          return (
            <button
              key={duration}
              type="button"
              onClick={() => onTransitionDurationChange(duration)}
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
    <div className="relative mb-3 space-y-2.5 overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.07),transparent_32%),linear-gradient(180deg,rgba(6,10,24,0.90),rgba(2,4,10,0.98))] px-3 py-3 shadow-[0_30px_120px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.055)] md:px-4 xl:px-5 2xl:px-6">
      <CommandDeckAtmosphere
        isLive={isLive}
        armed={previewProgramDifferent}
      />
      <BroadcastSyncPulseOverlay active={Boolean(takeFlash) || takeBusy} />
      {takeFlash ? <TakeFlashOverlay mode={takeFlash} /> : null}

      <div className="relative z-10">
        <CommandSurfaceHeader isLive={isLive} />
      </div>

      <div className="relative z-10">
        <TelemetryStrip
          isLive={isLive}
          audienceCount={audienceCount}
          onStageCount={onStageCount}
          runtimeLabel={runtimeLabel}
        />
      </div>
      <div className="relative z-10">
        <BroadcastPresenceStrip
          isLive={isLive}
          audienceCount={audienceCount}
          onStageCount={onStageCount}
          previewProgramDifferent={previewProgramDifferent}
          takeBusy={takeBusy}
          runtimeLabel={runtimeLabel}
          selectedTransitionType={selectedTransitionType}
          selectedTransitionDurationMs={selectedTransitionDurationMs}
        />
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.014))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.035)_42%,transparent_64%)] animate-[commandDeckAtmosphereSweep_8s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
        <div className="relative z-10">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
            Broadcast Operations State
          </div>

          <div className="mt-1 text-sm font-semibold tracking-tight text-white">
            {commandState} · {transportRuntimeLabel}
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
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
        <div className="relative z-10 grid gap-2.5 xl:grid-cols-4">
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

      <div className="relative z-10">
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
      </div>

      {openOperationsPanels.transmission ? (
        <div className="relative z-10">
          <TransmissionMetricStrip
            isLive={isLive}
            previewProgramDifferent={previewProgramDifferent}
            takeBusy={takeBusy}
          />
        </div>
      ) : null}

      {openOperationsPanels.recording ? (
        <div className="relative z-10">
          <RecordingOperationsStrip
            isLive={isLive}
            takeBusy={takeBusy}
          />
        </div>
      ) : null}

      {openOperationsPanels.comms ? (
        <div className="relative z-10">
          <CommsOperationsStrip
            isLive={isLive}
            onStageCount={onStageCount}
            takeBusy={takeBusy}
          />
        </div>
      ) : null}

      <div className="relative z-10">
        <TransitionIntentStrip
          selectedTransitionType={selectedTransitionType}
          selectedTransitionDurationMs={selectedTransitionDurationMs}
          onTransitionTypeChange={setSelectedTransitionType}
          onTransitionDurationChange={setSelectedTransitionDurationMs}
        />
      </div>

      <div className="relative z-10">
        <LowerCommandGrid
          previewProgramDifferent={previewProgramDifferent}
          takeBusy={takeBusy}
          onTake={triggerTake}
          selectedTransitionType={selectedTransitionType}
          onTransitionTypeChange={setSelectedTransitionType}
          selectedTransitionDurationMs={selectedTransitionDurationMs}
          onTransitionDurationChange={setSelectedTransitionDurationMs}
        />
      </div>

      <style jsx global>{`
        @keyframes commandDeckSyncFlash {
          0% {
            opacity: 0.45;
            transform: scale(1.01);
          }

          100% {
            opacity: 0;
            transform: scale(1);
          }
        }

        @keyframes commandDeckSweep {
          0% {
            opacity: 0;
            transform: translateX(-120%);
          }

          24% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform: translateX(520%);
          }
        }

        @keyframes commandDeckAtmosphereSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          46% {
            opacity: 0.78;
          }

          100% {
            transform: translateX(18%);
          }
        }

        @keyframes commandDeckArmedRail {
          0%,
          100% {
            opacity: 0.22;
            transform: scaleX(0.72);
          }

          50% {
            opacity: 0.86;
            transform: scaleX(1);
          }
        }
      `}</style>
      <CommandDeckStyles />
    </div>
  )
}