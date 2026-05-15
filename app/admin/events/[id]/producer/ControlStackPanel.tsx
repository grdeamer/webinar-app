"use client"

import type { JSX } from "react"
import {
  Camera,
  Globe2,
  MonitorUp,
  Radio,
  SatelliteDish,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react"
import type { StageState } from "./producerRoomTypes"
import type { ScreenLayoutPreset } from "./assetDockTypes"

type ControlStackPanelProps = {
  takeBusy: boolean
  previewProgramDifferent: boolean
  onTake: () => void
  onGoLive: () => void
  onGoOffAir: () => void
  layout: StageState["layout"] | null | undefined
  onSetLayout: (layout: "solo" | "grid" | "screen_speaker") => void
  autoDirectorEnabled: boolean
  onToggleAutoDirector: () => void
  screenLayoutPreset: ScreenLayoutPreset
  onSetScreenLayoutPreset: (preset: ScreenLayoutPreset) => void
  monitorHeight: number
  onMonitorHeightChange: (height: number) => void
}

function ControlButton({
  label,
  detail,
  active,
  tone = "neutral",
  onClick,
}: {
  label: string
  detail?: string
  active?: boolean
  tone?: "neutral" | "red" | "green" | "sky" | "violet" | "amber"
  onClick: () => void
}): JSX.Element {
  const toneClass = active
    ? tone === "red"
      ? "border-red-300/26 bg-red-500/[0.11] text-red-50 shadow-[0_0_14px_rgba(248,113,113,0.10)]"
      : tone === "green"
        ? "border-emerald-300/22 bg-emerald-400/[0.09] text-emerald-50 shadow-[0_0_12px_rgba(52,211,153,0.09)]"
        : tone === "sky"
          ? "border-sky-300/22 bg-sky-400/[0.09] text-sky-50 shadow-[0_0_12px_rgba(56,189,248,0.09)]"
          : tone === "violet"
            ? "border-violet-300/22 bg-violet-400/[0.09] text-violet-50 shadow-[0_0_12px_rgba(168,85,247,0.09)]"
            : tone === "amber"
              ? "border-amber-300/22 bg-amber-400/[0.09] text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.09)]"
              : "border-white/14 bg-white/[0.055] text-white/86"
    : "border-white/8 bg-black/18 text-white/42 hover:border-white/14 hover:bg-white/[0.04] hover:text-white/78"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[16px] border px-3 py-2.5 text-left transition hover:-translate-y-px active:translate-y-0 ${toneClass}`}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</div>
      {detail ? (
        <div className="mt-1 text-[10px] font-semibold leading-relaxed text-white/38">
          {detail}
        </div>
      ) : null}
    </button>
  )
}

export default function ControlStackPanel({
  takeBusy,
  previewProgramDifferent,
  onTake,
  onGoLive,
  onGoOffAir,
  layout,
  onSetLayout,
  autoDirectorEnabled,
  onToggleAutoDirector,
  screenLayoutPreset,
  onSetScreenLayoutPreset,
  monitorHeight,
  onMonitorHeightChange,
}: ControlStackPanelProps): JSX.Element {
  const selectedPreset = screenLayoutPreset

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.045),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.008))] p-4 shadow-[0_18px_54px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.012] [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.75)_0px,rgba(255,255,255,0.75)_1px,transparent_1px,transparent_14px)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-sky-100/20 to-transparent" />

      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/70">
            <Radio size={14} />
            Controls
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/34">
            Live controls and layout tools
          </div>
        </div>
        <div
          className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
            takeBusy
              ? "border-red-300/16 bg-red-500/[0.08] text-red-100/64"
              : previewProgramDifferent
                ? "border-amber-300/14 bg-amber-400/[0.08] text-amber-100/58"
                : "border-emerald-300/12 bg-emerald-400/[0.07] text-emerald-100/54"
          }`}
        >
          {takeBusy ? "Transition Active" : previewProgramDifferent ? "Preview Ready" : "Stable"}
        </div>
      </div>

      <div className="relative z-10 grid gap-2">
        <button
          type="button"
          disabled={takeBusy}
          onClick={onTake}
          className="rounded-[20px] border border-red-300/20 bg-red-500/[0.09] px-4 py-3 text-left text-red-50 shadow-[0_0_16px_rgba(248,113,113,0.10),inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-px hover:bg-red-500/[0.13] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em]">
              <Zap size={14} /> TAKE
            </div>
            <span className="rounded-full border border-white/12 bg-black/30 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/50">
              Space
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-red-100/52">
            Send Preview to Program.
          </div>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <ControlButton
            label="Go Live"
            detail="Begin broadcast"
            active={false}
            tone="green"
            onClick={onGoLive}
          />
          <ControlButton
            label="Off Air"
            detail="Exit live output"
            active={false}
            tone="red"
            onClick={onGoOffAir}
          />
        </div>
      </div>

      <div className="relative z-10 mt-4 rounded-[20px] border border-white/8 bg-black/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
          <MonitorUp size={12} /> Stage Layout
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ControlButton
            label="Solo"
            active={layout === "solo"}
            tone="sky"
            onClick={() => onSetLayout("solo")}
          />
          <ControlButton
            label="Grid"
            active={layout === "grid"}
            tone="sky"
            onClick={() => onSetLayout("grid")}
          />
          <ControlButton
            label="Screen"
            active={layout === "screen_speaker"}
            tone="sky"
            onClick={() => onSetLayout("screen_speaker")}
          />
        </div>
      </div>

      <div className="relative z-10 mt-4 rounded-[20px] border border-white/8 bg-black/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
            <Camera size={12} /> Screen Layout
          </div>
          <button
            type="button"
            onClick={onToggleAutoDirector}
            className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] transition ${
              autoDirectorEnabled
                ? "border-emerald-300/14 bg-emerald-400/[0.07] text-emerald-100/54"
                : "border-white/8 bg-black/18 text-white/28 hover:text-white/52"
            }`}
          >
            Auto {autoDirectorEnabled ? "On" : "Off"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ControlButton
            label="Classic"
            active={selectedPreset === "classic"}
            tone="violet"
            onClick={() => onSetScreenLayoutPreset("classic")}
          />
          <ControlButton
            label="Brand"
            active={selectedPreset === "brand"}
            tone="violet"
            onClick={() => onSetScreenLayoutPreset("brand")}
          />
          <ControlButton
            label="Speaker"
            active={selectedPreset === "speaker_focus"}
            tone="violet"
            onClick={() => onSetScreenLayoutPreset("speaker_focus")}
          />
        </div>
      </div>

      <div className="relative z-10 mt-4 rounded-[20px] border border-white/8 bg-black/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
            <SlidersHorizontal size={12} /> Monitor Height
          </div>
          <div className="text-[10px] font-black tabular-nums text-white/34">{monitorHeight}px</div>
        </div>
        <input
          type="range"
          min={360}
          max={720}
          step={20}
          value={monitorHeight}
          onChange={(event) => onMonitorHeightChange(Number(event.currentTarget.value))}
          className="w-full accent-sky-300"
        />
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[14px] border border-white/6 bg-black/16 p-2">
          <ShieldCheck size={13} className="mx-auto text-emerald-100/46" />
          <div className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/24">
            Ready
          </div>
        </div>
        <div className="rounded-[14px] border border-white/6 bg-black/16 p-2">
          <SatelliteDish size={13} className="mx-auto text-sky-100/46" />
          <div className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/24">
            Stable
          </div>
        </div>
        <div className="rounded-[14px] border border-white/6 bg-black/16 p-2">
          <Globe2 size={13} className="mx-auto text-violet-100/46" />
          <div className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/24">
            Audience
          </div>
        </div>
      </div>
    </div>
  )
}