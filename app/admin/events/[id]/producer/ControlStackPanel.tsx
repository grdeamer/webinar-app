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
      ? "border-red-300/36 bg-red-500/16 text-red-50 shadow-[0_0_24px_rgba(248,113,113,0.18)]"
      : tone === "green"
        ? "border-emerald-300/30 bg-emerald-400/12 text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,0.16)]"
        : tone === "sky"
          ? "border-sky-300/30 bg-sky-400/12 text-sky-50 shadow-[0_0_22px_rgba(56,189,248,0.16)]"
          : tone === "violet"
            ? "border-violet-300/30 bg-violet-400/12 text-violet-50 shadow-[0_0_22px_rgba(168,85,247,0.16)]"
            : tone === "amber"
              ? "border-amber-300/30 bg-amber-400/12 text-amber-50 shadow-[0_0_22px_rgba(251,191,36,0.16)]"
              : "border-white/18 bg-white/[0.08] text-white"
    : "border-white/10 bg-black/22 text-white/54 hover:border-white/18 hover:bg-white/[0.06] hover:text-white"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[18px] border px-3 py-2.5 text-left transition hover:-translate-y-0.5 active:translate-y-0 ${toneClass}`}
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
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.07),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4 shadow-[0_24px_74px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.022] [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.75)_0px,rgba(255,255,255,0.75)_1px,transparent_1px,transparent_10px)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-sky-100/42 to-transparent" />

      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/70">
            <Radio size={14} />
            Control Stack
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/34">
            Broadcast controls and layout tools
          </div>
        </div>
        <div
          className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${
            takeBusy
              ? "border-red-300/22 bg-red-500/12 text-red-100"
              : previewProgramDifferent
                ? "border-amber-300/18 bg-amber-400/10 text-amber-100/70"
                : "border-emerald-300/16 bg-emerald-400/8 text-emerald-100/62"
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
          className="rounded-[22px] border border-red-300/28 bg-red-500/12 px-4 py-3 text-left text-red-50 shadow-[0_0_30px_rgba(248,113,113,0.16),inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:-translate-y-0.5 hover:bg-red-500/18 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
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
            Move Preview live to audience.
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

      <div className="relative z-10 mt-4 rounded-[22px] border border-white/10 bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/38">
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

      <div className="relative z-10 mt-4 rounded-[22px] border border-white/10 bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/38">
            <Camera size={12} /> Screen Layout
          </div>
          <button
            type="button"
            onClick={onToggleAutoDirector}
            className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] transition ${
              autoDirectorEnabled
                ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100/70"
                : "border-white/10 bg-black/24 text-white/36 hover:text-white/62"
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

      <div className="relative z-10 mt-4 rounded-[22px] border border-white/10 bg-black/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/38">
            <SlidersHorizontal size={12} /> Monitor Height
          </div>
          <div className="text-[10px] font-black tabular-nums text-white/44">{monitorHeight}px</div>
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
        <div className="rounded-[16px] border border-white/8 bg-black/22 p-2">
          <ShieldCheck size={13} className="mx-auto text-emerald-100/62" />
          <div className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
            Ready
          </div>
        </div>
        <div className="rounded-[16px] border border-white/8 bg-black/22 p-2">
          <SatelliteDish size={13} className="mx-auto text-sky-100/62" />
          <div className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
            Stable
          </div>
        </div>
        <div className="rounded-[16px] border border-white/8 bg-black/22 p-2">
          <Globe2 size={13} className="mx-auto text-violet-100/62" />
          <div className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
            Audience
          </div>
        </div>
      </div>
    </div>
  )
}