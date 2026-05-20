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
  "Return Feed Ready",
  "ISO Feeds Ready",
  "Monitoring Stable",
  "Audience Path Ready",
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
      ? "border-red-300/12 bg-red-500/[0.07] text-red-100/58"
      : tone === "violet"
        ? "border-violet-300/12 bg-violet-400/[0.065] text-violet-100/56"
        : tone === "green"
          ? "border-emerald-300/12 bg-emerald-400/[0.06] text-emerald-100/56"
          : "border-white/7 bg-white/[0.028] text-white/34"

  return (
    <div className={`rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] ${toneClass}`}>
      <span className="text-white/18">{label}</span>{" "}
      <span>{value}</span>
    </div>
  )
}

function BroadcastSyncPulseOverlay({ active }: { active: boolean }): JSX.Element | null {
  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[26px]">
      <div className="absolute inset-0 animate-[commandDeckSyncFlash_720ms_ease-out] bg-red-400/[0.045]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-200/44 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-200/24 to-transparent" />
      <div className="absolute left-0 top-0 h-full w-24 animate-[commandDeckSweep_720ms_ease-out] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-red-200/12 bg-black/38 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-red-100/58 backdrop-blur-md shadow-[0_0_10px_rgba(248,113,113,0.07)]">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-red-300" />
        Transition
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
        className={`pointer-events-none absolute inset-x-0 top-0 h-14 transition-opacity duration-700 ${
          isLive
            ? "bg-gradient-to-b from-red-300/[0.020] via-violet-300/[0.010] to-transparent"
            : armed
              ? "bg-gradient-to-b from-amber-300/[0.018] via-sky-300/[0.010] to-transparent"
              : "bg-gradient-to-b from-violet-300/[0.014] via-sky-300/[0.008] to-transparent"
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.003)_42%,transparent_64%)] animate-[commandDeckAtmosphereSweep_42s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.008] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.010)_0px,rgba(255,255,255,0.010)_1px,transparent_1px,transparent_14px)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/7 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-sky-300/[0.018] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-red-300/[0.018] to-transparent" />

      {armed ? (
        <div className="pointer-events-none absolute inset-x-14 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-200/22 to-transparent animate-[commandDeckArmedRail_2.6s_ease-in-out_infinite]" />
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
    ? "Transition Active"
    : previewProgramDifferent
      ? "Preview Ready"
      : isLive
        ? "Broadcast Active"
        : "Standby Ready"

  const signalClassName = takeBusy
    ? "border-red-300/22 bg-red-500/12 text-red-100"
    : previewProgramDifferent
      ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
      : isLive
        ? "border-red-300/22 bg-red-500/12 text-red-100"
        : "border-emerald-300/16 bg-emerald-400/8 text-emerald-100/72"

  const transitionLabel = selectedTransitionType.replace("_", " ")

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/7 bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.032),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.028),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.009))] px-2.5 py-2 shadow-[0_14px_42px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.032)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.008)_42%,transparent_64%)] animate-[commandDeckAtmosphereSweep_24s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.022] [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.55)_0px,rgba(255,255,255,0.55)_1px,transparent_1px,transparent_14px)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

      <div className="relative z-10 grid gap-1.5 md:grid-cols-[1.35fr_0.75fr_0.75fr_0.8fr]">
        <div className="rounded-[18px] border border-white/7 bg-white/[0.03] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/30">
              Program Status
            </div>
            <div className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${signalClassName}`}>
              {signalLabel}
            </div>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <div className="text-base font-black tracking-tight text-white">
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

        <div className="rounded-[18px] border border-white/7 bg-white/[0.026] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/30">
            Audience
          </div>
          <div className="mt-2 text-base font-black tracking-tight text-white">
            {audienceCount}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/36">
            Connected
          </div>
        </div>

        <div className="rounded-[18px] border border-white/7 bg-white/[0.026] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/30">
            On Stage
          </div>
          <div className="mt-2 text-base font-black tracking-tight text-white">
            {onStageCount}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/36">
            Sources
          </div>
        </div>

        <div className="rounded-[18px] border border-violet-300/14 bg-violet-400/8 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-violet-100/38">
            Transition
          </div>
          <div className="mt-2 text-base font-black capitalize tracking-tight text-white">
            {transitionLabel}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-100/42">
            {selectedTransitionDurationMs}ms
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
  const transmissionSummary = takeBusy
    ? "Transition Active"
    : previewProgramDifferent
      ? "Preview Ready"
      : isLive
        ? "Broadcast Stable"
        : "Standby Ready"
  const recordingSummary = isLive ? "Master + ISO REC" : "Record Ready"
  const commsSummary = onStageCount > 0 ? `${onStageCount} Returns Ready` : "Returns Standby"
  void transmissionSummary
  void recordingSummary
  void commsSummary
  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-[14px] border border-white/[0.04] bg-white/[0.010] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="text-[8px] font-black uppercase tracking-[0.09em] text-white/18">
            Operations Stack
          </div>
          <div className="rounded-full border border-white/7 bg-white/[0.026] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/34">
            {stackStateLabel}
          </div>
        </div>
        <div className="mt-0.5 text-[9px] font-semibold text-white/18">
          Advanced controls collapsed until needed.
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
                "rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] transition-all duration-200",
                active
                  ? "border-violet-300/16 bg-violet-400/[0.08] text-violet-100/70 shadow-[0_0_10px_rgba(168,85,247,0.07)]"
                  : "border-white/7 bg-white/[0.026] text-white/30 hover:border-white/11 hover:bg-white/[0.04] hover:text-white/56",
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
          className="rounded-full border border-white/7 bg-white/[0.026] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/30 transition hover:border-white/11 hover:bg-white/[0.04] hover:text-white/56"
        >
          Compact
        </button>
        <button
          type="button"
          onClick={onOpenAll}
          className="rounded-full border border-violet-300/10 bg-violet-400/[0.05] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-violet-100/44 transition hover:border-violet-300/16 hover:bg-violet-400/[0.08] hover:text-violet-100/70"
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
                "rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] transition-all duration-200",
                open
                  ? "border-sky-300/16 bg-sky-400/[0.08] text-sky-100/70 shadow-[0_0_10px_rgba(56,189,248,0.07)]"
                  : "border-white/7 bg-white/[0.026] text-white/30 hover:border-white/11 hover:bg-white/[0.04] hover:text-white/56",
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
    ? "Transition Active"
    : previewProgramDifferent
      ? "Preview Ready"
      : isLive
        ? "Broadcast Stable"
        : "Standby Ready"

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
      value: takeBusy ? "Ready" : previewProgramDifferent ? "0.2%" : "0.1%",
      tone: previewProgramDifferent ? "attention" : "stable",
    },
    {
      label: "Dropped",
      value: takeBusy ? "Ready" : "0 fr",
      tone: takeBusy ? "attention" : "stable",
    },
    {
      label: "Return",
      value: previewProgramDifferent ? "Verify" : "92 ms",
      tone: previewProgramDifferent ? "attention" : "stable",
    },
    {
      label: "ISO",
      value: isLive ? "3 Ready" : "Standby",
      tone: isLive ? "stable" : "muted",
    },
  ] as const

  return (
    <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
          Stream Health
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
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/26">
            Transition Preset
          </div>
          <div className="mt-1 text-[11px] font-semibold text-white/36">
            Select the look. Transport handles the move.
          </div>
        </div>
        <div className="rounded-full border border-violet-300/10 bg-violet-400/[0.055] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.10em] text-violet-100/42">
          {selectedTransitionDurationMs}ms
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
                  ? "border-violet-300/18 bg-violet-400/[0.085] shadow-[0_0_16px_rgba(168,85,247,0.10),inset_0_1px_0_rgba(255,255,255,0.028)]"
                  : "border-white/7 bg-black/14 hover:border-white/12 hover:bg-white/[0.03]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[9px] font-black uppercase tracking-[0.10em] text-white/54">
                  {option.label}
                </div>
                <div
                  className={[
                    "rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.08em]",
                    active
                      ? "border-violet-300/12 bg-violet-400/[0.065] text-violet-100/56"
                      : "border-white/6 bg-black/16 text-white/24",
                  ].join(" ")}
                >
                  {active ? "Selected" : "Ready"}
                </div>
              </div>
              <div className="mt-1.5 text-[10px] font-semibold leading-relaxed text-white/32">
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
                "rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.10em] transition-all duration-200",
                active
                  ? "border-violet-300/18 bg-violet-400/[0.095] text-violet-100/70 shadow-[0_0_12px_rgba(168,85,247,0.10)]"
                  : "border-white/7 bg-black/18 text-white/30 hover:border-white/12 hover:bg-white/[0.035] hover:text-white/60",
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
    ? "Transition Active"
    : isLive
      ? "Recording"
      : "Record Ready"

  const recorderStateClassName = takeBusy
    ? "border-red-300/18 bg-red-500/10 text-red-100/72"
    : isLive
      ? "border-red-300/18 bg-red-500/10 text-red-100/72"
      : "border-amber-300/18 bg-amber-400/10 text-amber-100/72"

  const recordTargets = [
    {
      label: "Master",
      value: isLive ? "REC" : "READY",
      detail: "Program clean feed",
      tone: isLive ? "live" : "armed",
    },
    {
      label: "Host ISO",
      value: isLive ? "REC" : "READY",
      detail: "Camera isolated",
      tone: isLive ? "live" : "armed",
    },
    {
      label: "Guest ISO",
      value: isLive ? "REC" : "READY",
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
    <div className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.06),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.011))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
            Recording
          </div>
          <div className="mt-1 text-[11px] font-semibold text-white/46">
            Program capture, ISO feeds, storage, and failover.
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
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Storage</div>
          <div className="mt-1 text-[12px] font-black text-white/72">Primary Cloud Bucket</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/18 px-2.5 py-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Duration</div>
          <div className="mt-1 text-[12px] font-black text-white/72">{isLive ? "00:12:48" : "00:00:00"}</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/18 px-2.5 py-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Failover</div>
          <div className="mt-1 text-[12px] font-black text-white/72">Local Cache Ready</div>
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
    ? "Transition Active"
    : onStageCount > 0
      ? "Returns Ready"
      : "Returns Standby"

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
      label: "Host Return",
      value: onStageCount > 0 ? "Ready" : "Standby",
      detail: "Host return feed",
      tone: onStageCount > 0 ? "active" : "muted",
    },
    {
      label: "Guest Return",
      value: onStageCount > 1 ? "Ready" : "Standby",
      detail: "Guest return feed",
      tone: onStageCount > 1 ? "active" : "muted",
    },
    {
      label: "Talkback",
      value: takeBusy ? "Hold" : "Ready",
      detail: "Push-to-talk disabled by default",
      tone: takeBusy ? "warning" : "safe",
    },
  ] as const

  return (
    <div className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.065),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.011))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
            Returns + Talkback
          </div>
          <div className="mt-1 text-[11px] font-semibold text-white/46">
            Presenter returns, monitoring, and protected talkback.
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
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Return Bus</div>
          <div className="mt-1 text-[12px] font-black text-white/72">Program Return</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/18 px-2.5 py-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">On Stage</div>
          <div className="mt-1 text-[12px] font-black text-white/72">{onStageCount} Sources</div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/18 px-2.5 py-2">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/28">Show State</div>
          <div className="mt-1 text-[12px] font-black text-white/72">{isLive ? "Live Returns Ready" : "Standby Returns Ready"}</div>
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
    if (takeBusy) return "Transition Active"
    if (!previewProgramDifferent) return "Program Stable"
    return "Preview Ready"
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
  const showCommandTelemetry = deckDensityMode !== "switcher" || takeBusy || showHealthCards
  const showPresenceStrip = deckDensityMode !== "switcher" || takeBusy
  const showTransitionIntent = deckDensityMode !== "switcher"

  return (
    <div className="relative mb-0.5 space-y-0.5 overflow-hidden rounded-[16px] border border-white/[0.035] bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.008),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.008),transparent_28%),linear-gradient(180deg,rgba(8,12,24,0.54),rgba(3,5,12,0.72))] px-1.5 py-1 shadow-[0_5px_16px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.012)] md:px-2 xl:px-2.5 2xl:px-3">
      <CommandDeckAtmosphere
        isLive={isLive}
        armed={previewProgramDifferent}
      />
      <BroadcastSyncPulseOverlay active={Boolean(takeFlash) || takeBusy} />
      {takeFlash ? <TakeFlashOverlay mode={takeFlash} /> : null}

      <div className="hidden relative z-10 opacity-58 saturate-[0.70] transition-opacity duration-300 hover:opacity-82 2xl:block">
        <CommandSurfaceHeader isLive={isLive} />
      </div>

      {showCommandTelemetry ? (
        <div className="relative z-10 opacity-40 saturate-[0.62] transition-opacity duration-300 hover:opacity-76">
          <TelemetryStrip
            isLive={isLive}
            audienceCount={audienceCount}
            onStageCount={onStageCount}
            runtimeLabel={runtimeLabel}
          />
        </div>
      ) : null}
      {showPresenceStrip ? (
        <div className="relative z-10 opacity-68 saturate-[0.82] transition-opacity duration-300 hover:opacity-100">
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
      ) : null}

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-0.5 overflow-hidden rounded-[8px] border border-white/[0.016] bg-white/[0.004] px-1.5 py-px shadow-[inset_0_1px_0_rgba(255,255,255,0.005)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.003)_42%,transparent_64%)] animate-[commandDeckAtmosphereSweep_26s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/7 to-transparent" />
        <div className="relative z-10">
          <div className="text-[6px] font-black uppercase tracking-[0.08em] text-white/12">
            Console
          </div>
          <div className="text-[8px] font-semibold tracking-tight text-white/24">
            {commandState} · {transportRuntimeLabel}
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-0.5">
          <CommandStatusPill
            label="Program"
            value={isLive ? "Live" : "Standby"}
            tone={isLive ? "red" : "neutral"}
          />

          <CommandStatusPill
            label="Preview"
            value={previewProgramDifferent ? "Ready" : "Matched"}
            tone={previewProgramDifferent ? "violet" : "green"}
          />

          <CommandStatusPill
            label="Transition"
            value={takeBusy ? "Active" : "Ready"}
            tone={takeBusy ? "red" : "green"}
          />

          <button
            type="button"
            onClick={() => {
              setShowHealthCards((current) => !current)
              setDeckDensityMode("custom")
            }}
            className={[
              "hidden rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] transition-all duration-200 xl:inline-flex",
              showHealthCards
                ? "border-sky-300/10 bg-sky-400/[0.045] text-sky-100/42 shadow-[0_0_6px_rgba(56,189,248,0.035)]"
                : "border-white/[0.05] bg-white/[0.014] text-white/20 hover:border-white/10 hover:bg-white/[0.026] hover:text-white/42",
            ].join(" ")}
          >
            {showHealthCards ? "Diagnostics On" : "Diagnostics"}
          </button>
        </div>
      </div>

      {showHealthCards ? (
        <div className="relative z-10 grid gap-1.5 opacity-82 saturate-[0.88] xl:grid-cols-4">
          <TransmissionHealthCard
            label="Transmission"
            value={isLive ? "Audience Path Stable" : "Standby Ready"}
            detail="Encoder and audience delivery paths are stable."
            tone={transmissionHealth}
          />

          <TransmissionHealthCard
            label="Recording"
            value={isLive ? "Master + ISO Recording" : "Record Ready"}
            detail="Program and isolated feeds are ready for capture."
            tone={recordingHealth}
          />

          <TransmissionHealthCard
            label="Confidence Return"
            value={previewProgramDifferent ? "Preview Ready" : "Program Verified"}
            detail="Return feed is checked against the live program."
            tone={returnFeedHealth}
          />

          <TransmissionHealthCard
            label="Operator Safety"
            value={takeBusy ? "Transition Active" : "Ready For TAKE"}
            detail="Guardrails help prevent accidental transitions."
            tone={takeBusy ? "critical" : "stable"}
          />
        </div>
      ) : null}

      <div className="hidden relative z-10 opacity-38 saturate-[0.50] transition-opacity duration-300 hover:opacity-70 2xl:block">
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
      {showTransitionIntent ? (
        <div className="relative z-10">
          <TransitionIntentStrip
            selectedTransitionType={selectedTransitionType}
            selectedTransitionDurationMs={selectedTransitionDurationMs}
            onTransitionTypeChange={setSelectedTransitionType}
            onTransitionDurationChange={setSelectedTransitionDurationMs}
          />
        </div>
      ) : null}

      <div className="relative z-10 hidden -mt-0.5 2xl:block">
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
            opacity: 0.30;
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
            opacity: 0.55;
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
            opacity: 0.035;
          }

          100% {
            transform: translateX(18%);
          }
        }

        @keyframes commandDeckArmedRail {
          0%,
          100% {
            opacity: 0.10;
            transform: scaleX(0.72);
          }

          50% {
            opacity: 0.14;
            transform: scaleX(1);
          }
        }
      `}</style>
      <CommandDeckStyles />
    </div>
  )
}