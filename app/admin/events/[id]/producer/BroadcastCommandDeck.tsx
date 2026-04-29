import { useCallback, useEffect, useRef, useState } from "react"
import type { JSX, ReactNode } from "react"
import {
  type LucideIcon,
  Activity,
  Radio,
  SlidersHorizontal,
  Mic2,
  Gauge,
  Sparkles,
} from "lucide-react"

import {
  AUDIO_MIXER_ROWS,
  QUICK_ACTIONS,
  TRANSITION_OPTIONS,
  type BroadcastCommandDeckProps,
  type TakeControlProps,
  type TakeMode,
} from "./commandDeckTypes"



function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  )
}


function useRuntimeLabel(): string {
  const startedAtRef = useRef(Date.now())
  const [runtimeSeconds, setRuntimeSeconds] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setRuntimeSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return `${String(Math.floor(runtimeSeconds / 60)).padStart(2, "0")}:${String(
    runtimeSeconds % 60
  ).padStart(2, "0")}`
}

function useTakeControls({
  previewProgramDifferent,
  takeBusy,
  onTake,
}: TakeControlProps): {
  takeFlash: TakeMode | null
  triggerTake: (mode: TakeMode) => void
} {
  const [takeFlash, setTakeFlash] = useState<TakeMode | null>(null)
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerTake = useCallback(
    (mode: TakeMode) => {
      if (takeBusy || !previewProgramDifferent) return

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }

      setTakeFlash(mode)
      onTake(mode)

      flashTimeoutRef.current = setTimeout(() => {
        setTakeFlash(null)
        flashTimeoutRef.current = null
      }, 520)
    },
    [previewProgramDifferent, takeBusy, onTake]
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (isTypingTarget(event.target)) return

      const key = event.key.toLowerCase()

      if (key === "t" || key === "c") {
        event.preventDefault()
        triggerTake("cut")
        return
      }

      if (key === "a") {
        event.preventDefault()
        triggerTake("auto")
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [triggerTake])

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }
    }
  }, [])

  return { takeFlash, triggerTake }
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
    <div className={`rounded-[24px] border px-4 py-3 shadow-[0_18px_55px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  )
}

function TelemetryAccent(): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
      <div className="absolute left-0 right-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.34),transparent)] animate-[telemetryScan_4.8s_ease-in-out_infinite]" />
      <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-sky-300/70 shadow-[0_0_8px_rgba(125,211,252,0.65)] animate-[telemetryBlink_1.8s_ease-in-out_infinite]" />
        <span className="h-1 w-1 rounded-full bg-violet-300/60 shadow-[0_0_8px_rgba(196,181,253,0.55)] animate-[telemetryBlink_2.4s_ease-in-out_infinite]" />
        <span className="h-1 w-1 rounded-full bg-emerald-300/60 shadow-[0_0_8px_rgba(110,231,183,0.55)] animate-[telemetryBlink_3.1s_ease-in-out_infinite]" />
      </div>
      <div className="absolute left-4 top-4 h-10 w-16 rounded-full border border-sky-200/10 opacity-60" />
      <div className="absolute left-7 top-7 h-px w-10 rotate-[-18deg] bg-sky-200/10" />
    </div>
  )
}



function LevelMeter({
  length,
  activeBars,
  getBarClassName,
}: {
  length: number
  activeBars?: number
  getBarClassName?: (index: number) => string
}): JSX.Element {
  return (
    <div className="flex h-3 gap-1 rounded-full border border-white/8 bg-black/35 px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      {Array.from({ length }).map((_, index) => (
        <div
          key={index}
          className={`flex-1 rounded-full transition ${
            getBarClassName
              ? getBarClassName(index)
              : activeBars !== undefined && index < activeBars
                ? "bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.55)]"
                : "bg-white/8"
          }`}
        />
      ))}
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
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
          {label}
        </div>
        <div className="text-sm font-semibold text-white/82">{value}</div>
      </div>
      <div className="mt-3">
        <LevelMeter
          length={12}
          activeBars={bars}
          getBarClassName={(index) => (index < bars ? toneClass : "bg-white/8")}
        />
      </div>
    </div>
  )
}


function CommandButton({
  children,
  className = "",
  disabled = false,
  onClick,
  title,
  type = "button",
}: {
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  title?: string
  type?: "button" | "submit" | "reset"
}): JSX.Element {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-2xl border px-3 py-3 text-sm font-black uppercase tracking-[0.14em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  )
}

function PrimaryTakeButton({
  disabled,
  isTaking,
  onClick,
}: {
  disabled: boolean
  isTaking: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative group overflow-hidden rounded-2xl border border-amber-100/70 bg-[linear-gradient(180deg,rgba(253,230,138,1),rgba(251,191,36,1))] px-3 py-3 text-sm font-black uppercase tracking-[0.14em] text-black shadow-[0_0_34px_rgba(251,191,36,0.34),inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(251,191,36,0.42),inset_0_1px_0_rgba(255,255,255,0.65)] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
      title="Take preview to program (T)"
    >
      <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)] opacity-0 transition group-hover:opacity-100" />
      <span className="relative z-10">{isTaking ? "Taking" : "Take"}</span>
    </button>
  )
}

function IconGlassButton({
  label,
  icon: Icon,
  className = "",
  showLabel = true,
}: {
  label: string
  icon: LucideIcon
  className?: string
  showLabel?: boolean
}): JSX.Element {
  return (
    <button
      type="button"
      className={`rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 shadow-[0_18px_55px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.055] hover:text-white active:translate-y-0 ${className}`}
      aria-label={label}
    >
      <Icon size={16} className={showLabel ? "mx-auto mb-2" : "mx-auto"} />
      {showLabel ? label : null}
    </button>
  )
}


function PanelCard({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <div
      className={`rounded-[26px] border border-white/10 bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${className}`}
    >
      {children}
    </div>
  )
}

function CommandSurfaceHeader({ isLive }: { isLive: boolean }): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-4 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
          <Sparkles size={14} />
          Jupiter Command Surface
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
            <Gauge size={12} /> Stable
          </span>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${isLive ? "border-red-300/25 bg-red-500/12 text-red-100" : "border-white/10 bg-black/30 text-white/50"}`}>
            <span className={`h-2 w-2 rounded-full ${isLive ? "animate-pulse bg-red-400" : "bg-white/30"}`} />
            {isLive ? "Live Feed" : "Standby"}
          </span>
        </div>
      </div>
    </div>
  )
}

function ActiveSessionCard({
  isLive,
  runtimeLabel,
}: {
  isLive: boolean
  runtimeLabel: string
}): JSX.Element {
  return (
    <div className="rounded-[26px] border border-amber-200/12 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.1),transparent_36%),rgba(0,0,0,0.24)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_34px_rgba(251,191,36,0.055)]">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
        <Radio size={14} />
        Active Session
      </div>

      <div className="mt-1 text-xl font-semibold text-white">Session A1</div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
            isLive
              ? "border-red-300/25 bg-red-500/15 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.16)]"
              : "border-white/10 bg-black/30 text-white/50"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isLive
                ? "animate-pulse bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]"
                : "bg-white/30"
            }`}
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

function TakeFlashOverlay({ mode }: { mode: TakeMode }): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-0 z-20 overflow-hidden rounded-[32px] border border-amber-200/30 bg-amber-300/12 px-6 py-5 shadow-[0_0_44px_rgba(251,191,36,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm animate-[takeFlash_520ms_ease-out_forwards] md:inset-x-4 xl:inset-x-5 2xl:inset-x-6">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)] animate-[takeSweep_520ms_ease-out_forwards]" />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-100/80">
            Program Update
          </div>
          <div className="mt-1 text-3xl font-black uppercase tracking-[0.18em] text-white drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]">
            {mode === "auto" ? "Auto Take" : "Take"}
          </div>
        </div>
        <div className="rounded-full border border-amber-100/25 bg-black/35 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-50/80">
          Sent to Program
        </div>
      </div>
    </div>
  )
}

function TelemetryStrip({
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
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,rgba(10,17,35,0.94),rgba(2,6,18,0.98))] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <TelemetryAccent />
      <div className="relative grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)_190px]">
        <ActiveSessionCard isLive={isLive} runtimeLabel={runtimeLabel} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Stream Health" value="Excellent" tone="green" />
          <StatCard label="Recording" value="Active" tone="red" />
          <StatCard label="Audience" value={String(audienceCount)} tone="blue" />
          <StatCard label="On Stage" value={String(onStageCount)} tone="neutral" />
          <MeterCard label="GPU" value="74%" bars={9} tone="sky" />
          <MeterCard label="Signal" value="-6 dB" bars={8} tone="emerald" />
        </div>

        <div className="flex items-stretch">
          <IconGlassButton label="Shortcuts" icon={SlidersHorizontal} className="w-full" />
        </div>
      </div>
    </div>
  )
}

function ControlStagePanel({
  previewProgramDifferent,
  takeBusy,
  onTake,
}: TakeControlProps): JSX.Element {
  return (
    <PanelCard>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
          Control Stage
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
          onClick={() => onTake("cut")}
          disabled={takeBusy || !previewProgramDifferent}
          isTaking={takeBusy}
        />

        <CommandButton
          onClick={() => onTake("cut")}
          disabled={takeBusy || !previewProgramDifferent}
          className="border-red-300/28 bg-[linear-gradient(180deg,rgba(239,68,68,0.16),rgba(127,29,29,0.18))] text-red-100 hover:border-red-300/40 hover:bg-red-500/18 hover:shadow-[0_0_20px_rgba(248,113,113,0.16)]"
          title="Cut preview to program (C)"
        >
          Cut
        </CommandButton>

        <CommandButton
          onClick={() => onTake("auto")}
          disabled={takeBusy || !previewProgramDifferent}
          className="border-emerald-300/28 bg-[linear-gradient(180deg,rgba(16,185,129,0.15),rgba(6,78,59,0.18))] text-emerald-100 hover:border-emerald-300/40 hover:bg-emerald-500/18 hover:shadow-[0_0_20px_rgba(52,211,153,0.16)]"
          title="Auto take preview to program (A)"
        >
          Auto
        </CommandButton>
      </div>

      {previewProgramDifferent ? (
        <div className="mt-3 text-xs font-medium text-amber-100/80">
          Pending preview changes ready to take. Press T/C to cut or A for auto.
        </div>
      ) : (
        <div className="mt-3 text-xs text-white/42">
          Preview matches Program. Shortcuts arm when preview changes.
        </div>
      )}
    </PanelCard>
  )
}

function TransitionPanel(): JSX.Element {
  return (
    <PanelCard className="border-violet-300/12 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.11),transparent_38%),rgba(0,0,0,0.24)] shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_34px_rgba(168,85,247,0.055)]">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
        <Activity size={14} />
        Transition
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TRANSITION_OPTIONS.map((item) => (
          <CommandButton
            key={item}
            className="border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.022))] text-[10px] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_22px_rgba(0,0,0,0.18)] hover:border-violet-200/22 hover:bg-violet-400/10 hover:text-violet-100 active:scale-[0.98]"
          >
            {item}
          </CommandButton>
        ))}
      </div>
    </PanelCard>
  )
}

function AudioMixerPanel(): JSX.Element {
  return (
    <PanelCard className="border-emerald-300/14 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.13),transparent_38%),rgba(52,211,153,0.045)]">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
        <Mic2 size={14} />
        Audio Mixer
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

function QuickActionsPanel(): JSX.Element {
  return (
    <PanelCard>
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
        Quick Actions
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
    </PanelCard>
  )
}

function LowerCommandGrid({
  previewProgramDifferent,
  takeBusy,
  onTake,
}: TakeControlProps): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_34%),linear-gradient(180deg,rgba(8,14,32,0.94),rgba(2,6,18,0.98))] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.055)]">
      <TelemetryAccent />
      <div className="relative grid gap-3 xl:grid-cols-[1.25fr_0.95fr_1fr_0.9fr]">
        <ControlStagePanel
          previewProgramDifferent={previewProgramDifferent}
          takeBusy={takeBusy}
          onTake={onTake}
        />
        <TransitionPanel />
        <AudioMixerPanel />
        <QuickActionsPanel />
      </div>
    </div>
  )
}

function CommandDeckStyles(): JSX.Element {
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
        72% {
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

export default function BroadcastCommandDeck({
  isLive,
  audienceCount,
  onStageCount,
  previewProgramDifferent,
  takeBusy,
  onTake,
}: BroadcastCommandDeckProps): JSX.Element {
  const runtimeLabel = useRuntimeLabel()
  const { takeFlash, triggerTake } = useTakeControls({
    previewProgramDifferent,
    takeBusy,
    onTake,
  })

  return (
    <div className="relative mb-4 space-y-3 px-3 md:px-4 xl:px-5 2xl:px-6">
      {takeFlash ? <TakeFlashOverlay mode={takeFlash} /> : null}
      <CommandSurfaceHeader isLive={isLive} />

      <TelemetryStrip
        isLive={isLive}
        audienceCount={audienceCount}
        onStageCount={onStageCount}
        runtimeLabel={runtimeLabel}
      />

      <LowerCommandGrid
        previewProgramDifferent={previewProgramDifferent}
        takeBusy={takeBusy}
        onTake={triggerTake}
      />
      <CommandDeckStyles />
    </div>
  )
}