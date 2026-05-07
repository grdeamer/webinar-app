import type { JSX } from "react"
import {
  Activity,
  Radio,
  SlidersHorizontal,
  Mic2,
  Sparkles,
  CircleDot,
  Disc3,
  ShieldCheck,
  Zap,
  Keyboard,
  CheckCircle2,
} from "lucide-react"

import {
  AUDIO_MIXER_ROWS,
  QUICK_ACTIONS,
  TRANSITION_OPTIONS,
  type CinematicTransitionType,
  type TakeControlProps,
  type TakeMode,
} from "./commandDeckTypes"

import {
  CommandButton,
  IconGlassButton,
  LevelMeter,
  PanelCard,
  PrimaryTakeButton,
  TelemetryAccent,
} from "./CommandDeckChrome"

type TransitionModeControlProps = {
  selectedTransitionType: CinematicTransitionType
  onTransitionTypeChange: (value: CinematicTransitionType) => void
  selectedTransitionDurationMs?: number
  onTransitionDurationChange?: (value: number) => void
}

type LowerCommandGridProps = TakeControlProps & TransitionModeControlProps

type ControlStagePanelProps = TakeControlProps & {
  selectedTransitionType: CinematicTransitionType
  selectedTransitionDurationMs?: number
}

const OPERATOR_SHORTCUTS = [
  { key: "T", label: "Take" },
  { key: "C", label: "Cut" },
  { key: "A", label: "Auto" },
  { key: "Space", label: "Quick Take" },
] as const

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

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "neutral" | "green" | "red" | "blue"
}): JSX.Element {
  const toneClass =
    tone === "green"
      ? "border-emerald-300/18 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.14),transparent_38%),rgba(52,211,153,0.06)] text-emerald-100"
      : tone === "red"
        ? "border-red-300/18 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.14),transparent_38%),rgba(239,68,68,0.06)] text-red-100"
        : tone === "blue"
          ? "border-sky-300/18 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_38%),rgba(56,189,248,0.06)] text-sky-100"
          : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.016))] text-white"

  return (
    <div className={`rounded-[22px] border px-3 py-2.5 shadow-[0_16px_45px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:-translate-y-0.5 ${toneClass}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/34">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tracking-tight">{value}</div>
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
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.014))] px-3 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
          <Zap size={14} className="text-violet-100/70" />
          Master Control Surface
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
            <ShieldCheck size={12} className="text-emerald-200/70" /> Stable
          </span>

          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
              isLive
                ? "border-red-300/25 bg-red-500/12 text-red-100"
                : "border-white/10 bg-black/30 text-white/50"
            }`}
          >
            <CircleDot
              size={12}
              className={isLive ? "animate-pulse text-red-300" : "text-white/30"}
            />
            {isLive ? "Live Feed" : "Standby"}
          </span>
        </div>
      </div>
    </div>
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
    <div className="rounded-[24px] border border-amber-200/12 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.08),transparent_36%),rgba(0,0,0,0.26)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_30px_rgba(251,191,36,0.045)]">
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
    </div>
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

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Stream Health" value="Excellent" tone="green" />
          <StatCard label="Recording" value="Active" tone="red" />
          <StatCard label="Audience" value={String(audienceCount)} tone="blue" />
          <StatCard label="On Stage" value={String(onStageCount)} tone="neutral" />
          <MeterCard label="GPU" value="74%" bars={9} tone="sky" />
          <MeterCard label="Signal" value="-6 dB" bars={8} tone="emerald" />
        </div>

        <div className="flex min-w-0 flex-col gap-2 rounded-[24px] border border-white/10 bg-black/24 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/36">
            <Keyboard size={13} />
            Hotkeys
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
}: ControlStagePanelProps): JSX.Element {
  return (
    <PanelCard>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
          Program Controls
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
            previewProgramDifferent
              ? "border-amber-300/35 bg-amber-400/14 text-amber-100/90 shadow-[0_0_16px_rgba(251,191,36,0.16)]"
              : "border-emerald-300/22 bg-emerald-400/10 text-emerald-100/75"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              previewProgramDifferent
                ? "animate-pulse bg-amber-300 shadow-[0_0_9px_rgba(252,211,77,0.9)]"
                : "bg-emerald-300/70 shadow-[0_0_7px_rgba(110,231,183,0.55)]"
            }`}
          />
          {previewProgramDifferent ? "Armed" : "Matched"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <PrimaryTakeButton
          onClick={() => onTake("cut", selectedTransitionType, selectedTransitionDurationMs)}
          disabled={takeBusy || !previewProgramDifferent}
          isTaking={takeBusy}
        />

        <CommandButton
          onClick={() => onTake("cut", selectedTransitionType, selectedTransitionDurationMs)}
          disabled={takeBusy || !previewProgramDifferent}
          className="border-red-300/28 bg-[linear-gradient(180deg,rgba(239,68,68,0.16),rgba(127,29,29,0.18))] text-red-100 hover:border-red-300/40 hover:bg-red-500/18 hover:shadow-[0_0_20px_rgba(248,113,113,0.16)]"
          title="Cut preview to program (C)"
        >
          Cut
        </CommandButton>

        <CommandButton
          onClick={() => onTake("auto", selectedTransitionType, selectedTransitionDurationMs)}
          disabled={takeBusy || !previewProgramDifferent}
          className="border-emerald-300/28 bg-[linear-gradient(180deg,rgba(16,185,129,0.15),rgba(6,78,59,0.18))] text-emerald-100 hover:border-emerald-300/40 hover:bg-emerald-500/18 hover:shadow-[0_0_20px_rgba(52,211,153,0.16)]"
          title="Auto take preview to program (A)"
        >
          Auto
        </CommandButton>
      </div>

      {previewProgramDifferent ? (
        <div className="mt-3 text-xs font-medium text-amber-100/80">
          Preview is armed. Cut or auto to send the look to Program.
        </div>
      ) : (
        <div className="mt-3 text-xs text-white/42">
          Preview and Program are matched. Controls arm when preview changes.
        </div>
      )}
    </PanelCard>
  )
}

export function CommandDeckStyles(): JSX.Element {
  return (
    <style jsx>{`
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
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
        <Activity size={14} />
        Transition Bank
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TRANSITION_OPTIONS.map((item) => {
          const isSelected = selectedTransitionType === item.value

          return (
            <CommandButton
              key={item.value}
              onClick={() => onTransitionTypeChange(item.value)}
              className={
                isSelected
                  ? "border-violet-300/42 bg-violet-400/18 text-[10px] text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_0_22px_rgba(168,85,247,0.18)] active:scale-[0.98]"
                  : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.022))] text-[10px] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_22px_rgba(0,0,0,0.18)] hover:border-violet-200/22 hover:bg-violet-400/10 hover:text-violet-100 active:scale-[0.98]"
              }
            >
              {item.label}
            </CommandButton>
          )
        })}
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/42">
        Armed transition: <span className="text-violet-100/80">{selectedTransitionType}</span>
      </div>

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
              <button
                key={duration}
                type="button"
                onClick={() => onTransitionDurationChange?.(duration)}
                className={[
                  "rounded-lg border px-1 py-1 text-[8px] font-black uppercase tracking-[0.08em] transition",
                  active
                    ? "border-violet-300/30 bg-violet-400/12 text-violet-100/80 shadow-[0_0_12px_rgba(168,85,247,0.12)]"
                    : "border-white/10 bg-white/[0.035] text-white/45 hover:border-violet-200/20 hover:bg-violet-400/8 hover:text-violet-100/65",
                ].join(" ")}
              >
                {duration}
              </button>
            )
          })}
        </div>
      </div>
    </PanelCard>
  )
}

export function AudioMixerPanel(): JSX.Element {
  return (
    <PanelCard className="border-emerald-300/14 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.13),transparent_38%),rgba(52,211,153,0.045)]">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
        <Mic2 size={14} />
        Audio Program
      </div>

      <div className="space-y-2">
        {AUDIO_MIXER_ROWS.map((row) => (
          <div key={row} className="grid grid-cols-[74px_1fr] items-center gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">
              {row}
            </div>
            <LevelMeter
              length={14}
              getBarClassName={(index) =>
                index > 10
                  ? "bg-red-300 shadow-[0_0_8px_rgba(252,165,165,0.55)]"
                  : index > 8
                    ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.5)]"
                    : "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.5)]"
              }
            />
          </div>
        ))}
      </div>
    </PanelCard>
  )
}

export function QuickActionsPanel(): JSX.Element {
  return (
    <PanelCard>
      <div className="mb-3 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
        <span className="inline-flex items-center gap-2">
          <Sparkles size={14} />
          Ops Macros
        </span>
        <span className="rounded-full border border-white/10 bg-black/24 px-2 py-1 text-[8px] tracking-[0.12em] text-white/32">
          Armed
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map(({ label, icon }) => (
          <IconGlassButton
            key={label}
            label={label}
            icon={icon}
            showLabel={false}
            className="rounded-2xl bg-white/[0.045] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.03)] hover:bg-white/[0.07]"
          />
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 p-2">
        <div className="mb-1.5 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
          <Keyboard size={11} />
          Operator Keys
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {OPERATOR_SHORTCUTS.map((shortcut) => (
            <ShortcutKey key={shortcut.key} shortcut={shortcut} />
          ))}
        </div>
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
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.09),transparent_34%),linear-gradient(180deg,rgba(7,12,28,0.96),rgba(2,5,16,0.985))] p-3 shadow-[0_28px_100px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <TelemetryAccent />
      <div className="relative grid gap-2.5 xl:grid-cols-[1.2fr_0.95fr_1fr_0.85fr]">
        <ControlStagePanel
          previewProgramDifferent={previewProgramDifferent}
          takeBusy={takeBusy}
          onTake={onTake}
          selectedTransitionType={selectedTransitionType}
          selectedTransitionDurationMs={selectedTransitionDurationMs}
        />
        <TransitionPanel
          selectedTransitionType={selectedTransitionType}
          onTransitionTypeChange={onTransitionTypeChange}
          selectedTransitionDurationMs={selectedTransitionDurationMs}
          onTransitionDurationChange={onTransitionDurationChange}
        />
        <AudioMixerPanel />
        <QuickActionsPanel />
      </div>
    </div>
  )
}