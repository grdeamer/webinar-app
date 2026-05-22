
import { useEffect, useState, type JSX } from "react"
type UtilityPanel = "record" | "stream" | "overlays" | "schedule" | "shortcuts" | "settings"
type MixerChannelKey = "Program" | "Stage" | "Music" | "Mics" | "SFX" | "Audience"

import {
  CalendarDays,
  CircleDot,
  Clapperboard,
  Image,
  Keyboard,
  Layers3,
  Mic2,
  MonitorPlay,
  Radio,
  Settings,
  SlidersHorizontal,
  Video,
  Volume2,
  Waves,
} from "lucide-react"

import type { PreviewBlock } from "./useProducerBlocks"

function percentToDb(level: number): number {
  const normalized = Math.max(0, Math.min(1, level / 100))
  if (normalized <= 0.0001) return -60
  return Math.max(-60, Math.min(0, 20 * Math.log10(normalized)))
}

function dbLabelFromPercent(level: number): string {
  const db = percentToDb(level)
  if (db <= -59) return "-∞"
  return `${Math.round(db)}`
}
import {
  FALLBACK_MEDIA_ITEMS,
  type DockAssetRecord,
  type SceneSummary,
} from "./assetDockTypes"

function ConsolePanel({
  title,
  action,
  children,
  className = "",
}: {
  title: string
  action?: JSX.Element
  children: JSX.Element
  className?: string
}): JSX.Element {
  return (
    <section
      className={`relative min-h-0 overflow-hidden rounded-[14px] border border-white/[0.048] bg-[linear-gradient(180deg,rgba(12,18,31,0.76),rgba(5,9,17,0.90))] shadow-[0_8px_20px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.014)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.075] to-transparent" />
      <div className="relative z-10 flex h-7 items-center justify-between border-b border-white/[0.035] px-2.5">
        <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/62">
          {title}
        </div>
        {action}
      </div>
      <div className="relative z-10 min-h-0 overflow-hidden p-2">{children}</div>
    </section>
  )
}

function ScenePreviewTile({
  label,
  imageUrl,
  active,
}: {
  label: string
  imageUrl?: string | null
  active?: boolean
}): JSX.Element {
  return (
    <button
      type="button"
      className={`group relative overflow-hidden rounded-[12px] border p-1 text-left transition hover:-translate-y-px active:translate-y-0 ${
        active
          ? "border-sky-300/34 bg-sky-400/[0.080] shadow-[0_0_18px_rgba(56,189,248,0.12)]"
          : "border-white/[0.055] bg-white/[0.018] hover:border-white/[0.11] hover:bg-white/[0.030]"
      }`}
    >
      <div className="relative aspect-video overflow-hidden rounded-[9px] border border-white/[0.055] bg-[radial-gradient(circle_at_35%_25%,rgba(56,189,248,0.20),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Scene preview"
            className="absolute inset-0 h-full w-full object-cover opacity-85"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_36%,rgba(0,0,0,0.34))]" />
      </div>
      <div className="mt-1 truncate text-[9px] font-semibold tracking-[-0.02em] text-white/68">
        {label}
      </div>
    </button>
  )
}

function MediaRow({
  label,
  meta,
  imageUrl,
}: {
  label: string
  meta: string
  imageUrl?: string | null
}): JSX.Element {
  return (
    <button
      type="button"
      className="group flex min-w-0 items-center gap-1.5 rounded-[10px] border border-white/[0.040] bg-white/[0.014] p-1 text-left transition hover:border-white/[0.08] hover:bg-white/[0.028]"
    >
      <div className="relative h-8 w-12 shrink-0 overflow-hidden rounded-[7px] border border-white/[0.050] bg-[radial-gradient(circle_at_35%_28%,rgba(56,189,248,0.16),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]">
        {imageUrl ? (
          <img src={imageUrl} alt="Media preview" className="absolute inset-0 h-full w-full object-cover opacity-85" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-semibold text-white/72">{label}</div>
        <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/30">
          {meta}
        </div>
      </div>
    </button>
  )
}

function MixerStrip({
  label,
  level,
  soloActive,
  muted,
  onToggleSolo,
  onToggleMute,
}: {
  label: MixerChannelKey
  level: number
  soloActive: boolean
  muted: boolean
  onToggleSolo: () => void
  onToggleMute: () => void
}): JSX.Element {
  const effectiveLevel = muted ? Math.min(level, 3) : level
  const clampedLevel = Math.max(2, Math.min(96, effectiveLevel))
  const meterOpacity = clampedLevel > 6 ? "opacity-100" : "opacity-30"
  const dbLabel = dbLabelFromPercent(clampedLevel)
  const clipHot = clampedLevel > 92

  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 border-r border-white/[0.030] px-1.5 last:border-r-0">
      <div className="text-[8px] font-semibold text-sky-100/52">{label}</div>
      <div className="relative h-[82px] w-6 rounded-full border border-white/[0.060] bg-black/28 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
        <div className="absolute bottom-1 left-1 right-1 overflow-hidden rounded-full bg-white/[0.045]" style={{ height: "70px" }}>
          <div className="absolute inset-x-0 bottom-0 h-[72%] bg-emerald-400/18" />
          <div className="absolute inset-x-0 bottom-[72%] h-[18%] bg-amber-300/18" />
          <div className="absolute inset-x-0 bottom-[90%] h-[10%] bg-red-400/18" />
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-emerald-400 via-emerald-300 via-[66%] via-amber-300 to-red-400 shadow-[0_0_12px_rgba(52,211,153,0.20)] transition-[height,opacity] duration-75 ease-out ${meterOpacity}`}
            style={{ height: `${clampedLevel}%` }}
          />
          <div className="absolute inset-x-0 bottom-[72%] h-px bg-amber-100/24" />
          <div className="absolute inset-x-0 bottom-[90%] h-px bg-red-100/28" />
        </div>
        <div
          className={`absolute left-1/2 h-3 w-6 -translate-x-1/2 rounded-[5px] border shadow-[0_0_10px_rgba(59,130,246,0.22)] transition-[bottom,background,border-color] duration-75 ease-out ${
            clipHot
              ? "border-red-100/34 bg-red-400"
              : "border-sky-100/22 bg-sky-500"
          }`}
          style={{ bottom: `calc(${clampedLevel}% - 4px)` }}
        />
      </div>
      <div className="text-[7px] font-black tabular-nums text-white/32">
        {dbLabel} dB
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={onToggleSolo}
          aria-pressed={soloActive}
          className={`rounded-[6px] border px-1.5 py-1 text-[8px] font-black transition ${
            soloActive
              ? "border-amber-300/24 bg-amber-300/14 text-amber-100/86 shadow-[0_0_12px_rgba(251,191,36,0.12)]"
              : "border-white/[0.05] bg-white/[0.020] text-white/42 hover:bg-white/[0.04] hover:text-white/70"
          }`}
        >
          S
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={muted}
          className={`rounded-[6px] border px-1.5 py-1 text-[8px] font-black transition ${
            muted
              ? "border-red-300/24 bg-red-400/14 text-red-100/86 shadow-[0_0_12px_rgba(248,113,113,0.12)]"
              : "border-white/[0.05] bg-white/[0.020] text-white/42 hover:bg-white/[0.04] hover:text-white/70"
          }`}
        >
          M
        </button>
      </div>
    </div>
  )
}

function ExpandedAudioMixerOverlay({
  micLevelPercent,
  programLevel,
  stageLevel,
  musicLevel,
  sfxLevel,
  audienceLevel,
  soloChannel,
  mutedChannels,
  onToggleSolo,
  onToggleMute,
  onClose,
}: {
  micLevelPercent: number
  programLevel: number
  stageLevel: number
  musicLevel: number
  sfxLevel: number
  audienceLevel: number
  soloChannel: MixerChannelKey | null
  mutedChannels: Record<MixerChannelKey, boolean>
  onToggleSolo: (channel: MixerChannelKey) => void
  onToggleMute: (channel: MixerChannelKey) => void
  onClose: () => void
}): JSX.Element {
  const channels: Array<[MixerChannelKey, number, string]> = [
    ["Program", programLevel, "PGM"],
    ["Stage", stageLevel, "STG"],
    ["Music", musicLevel, "MSC"],
    ["Mics", micLevelPercent, "MIC"],
    ["SFX", sfxLevel, "SFX"],
    ["Audience", audienceLevel, "AUD"],
  ]

  return (
    <div className="fixed inset-x-6 bottom-6 top-[96px] z-[999] overflow-hidden rounded-[24px] border border-emerald-200/16 bg-[radial-gradient(circle_at_24%_0%,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,rgba(5,13,18,0.985),rgba(2,5,10,0.998))] shadow-[0_34px_110px_rgba(0,0,0,0.72),0_0_42px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.030)_0px,rgba(255,255,255,0.030)_1px,transparent_1px,transparent_32px)]" />
      <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/[0.065] px-5 py-4">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/52">
            Expanded Audio Mixer
          </div>
          <div className="mt-1 text-[22px] font-semibold tracking-[-0.055em] text-white/92">
            Program Audio Control
          </div>
          <div className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/46">
            Detailed dBFS metering, channel confidence, and operator controls for program monitoring.
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/[0.08] bg-white/[0.030] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/58 transition hover:bg-white/[0.055] hover:text-white/82"
        >
          Close
        </button>
      </div>

      <div className="relative z-10 grid h-[calc(100%-112px)] min-h-0 gap-4 overflow-hidden p-5 xl:grid-cols-[1fr_280px]">
        <div className="min-h-0 rounded-[18px] border border-white/[0.065] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
          <div className="grid h-full min-h-0 grid-cols-6 gap-3">
            {channels.map(([label, level, badge]) => {
              const muted = mutedChannels[label]
              const soloActive = soloChannel === label
              const effectiveLevel = muted ? Math.min(level, 3) : level
              const clampedLevel = Math.max(2, Math.min(96, effectiveLevel))
              const dbLabel = dbLabelFromPercent(clampedLevel)
              const clipHot = clampedLevel > 92

              return (
                <div key={label} className="flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-white/[0.055] bg-white/[0.020] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.016)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.13em] text-white/52">
                    {label}
                  </div>
                  <div className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-emerald-100/36">
                    {badge}
                  </div>

                  <div className="mt-3 flex min-h-0 flex-1 items-stretch justify-center gap-2">
                    <div className="flex flex-col justify-between py-1 text-right text-[8px] font-black tabular-nums text-white/28">
                      <span>0</span>
                      <span className="text-red-100/42">-3</span>
                      <span className="text-amber-100/42">-12</span>
                      <span className="text-emerald-100/34">-24</span>
                      <span>-60</span>
                    </div>

                    <div className="relative w-10 overflow-hidden rounded-full border border-white/[0.070] bg-black/42 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
                      <div className="absolute bottom-1 left-1 right-1 top-1 overflow-hidden rounded-full bg-white/[0.040]">
                        <div className="absolute inset-x-0 bottom-0 h-[72%] bg-emerald-400/14" />
                        <div className="absolute inset-x-0 bottom-[72%] h-[18%] bg-amber-300/16" />
                        <div className="absolute inset-x-0 bottom-[90%] h-[10%] bg-red-400/18" />
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-emerald-400 via-emerald-300 via-[66%] via-amber-300 to-red-400 shadow-[0_0_18px_rgba(52,211,153,0.28)] transition-[height] duration-75 ease-out"
                          style={{ height: `${clampedLevel}%` }}
                        />
                        <div className="absolute inset-x-0 bottom-[72%] h-px bg-amber-100/28" />
                        <div className="absolute inset-x-0 bottom-[90%] h-px bg-red-100/32" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[10px] border border-white/[0.055] bg-black/24 px-2 py-1.5 text-[11px] font-black tabular-nums text-white/70">
                    {dbLabel} dBFS
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleSolo(label)}
                      aria-pressed={soloActive}
                      className={`rounded-[9px] border px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] transition ${
                        soloActive
                          ? "border-amber-300/24 bg-amber-300/14 text-amber-100/86 shadow-[0_0_14px_rgba(251,191,36,0.13)]"
                          : "border-white/[0.06] bg-white/[0.024] text-white/42 hover:bg-white/[0.04]"
                      }`}
                    >
                      Solo
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleMute(label)}
                      aria-pressed={muted}
                      className={`rounded-[9px] border px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] transition ${
                        muted
                          ? "border-red-300/24 bg-red-400/14 text-red-100/86 shadow-[0_0_14px_rgba(248,113,113,0.13)]"
                          : "border-white/[0.06] bg-white/[0.024] text-white/42 hover:bg-white/[0.04]"
                      }`}
                    >
                      Mute
                    </button>
                  </div>

                  <div className={`mt-2 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${clipHot ? "border-red-300/20 bg-red-400/10 text-red-100/70" : "border-emerald-300/12 bg-emerald-400/7 text-emerald-100/52"}`}>
                    {clipHot ? "Clip Risk" : "Signal Safe"}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="min-h-0 space-y-3 overflow-hidden rounded-[18px] border border-white/[0.065] bg-white/[0.020] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
              Master Bus
            </div>
            <div className="mt-2 rounded-[16px] border border-emerald-300/12 bg-emerald-400/[0.045] p-3">
              <div className="text-[22px] font-semibold tracking-[-0.04em] text-white/88">
                {dbLabelFromPercent(Math.max(programLevel, stageLevel, micLevelPercent))} dBFS
              </div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/44">
                Program Confidence
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            {[
              ["Target Peak", "-6 dBFS"],
              ["Warning Zone", "-12 to -3"],
              ["Clip Zone", "0 dBFS"],
              ["Monitor", "Control Room"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-[12px] border border-white/[0.050] bg-black/20 px-3 py-2">
                <span className="text-[10px] font-semibold text-white/42">{label}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.10em] text-white/64">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CommRow({
  name,
  role,
  active,
}: {
  name: string
  role: string
  active?: boolean
}): JSX.Element {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-[10px] border px-2 py-1 ${
        active
          ? "border-sky-300/20 bg-sky-500/[0.16]"
          : "border-white/[0.045] bg-white/[0.018]"
      }`}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.050] bg-white/[0.020] text-white/44">
        <Mic2 size={12} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-semibold text-white/72">{name}</div>
        <div className="mt-px text-[8px] font-medium text-white/32">{role}</div>
      </div>
      <div className="flex h-4 w-12 items-end justify-end gap-0.5">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className="w-0.5 rounded-full bg-emerald-300/70"
            style={{ height: `${3 + ((index * 5) % 12)}px` }}
          />
        ))}
      </div>
    </div>
  )
}

function UtilityButton({
  icon,
  label,
  meta,
  danger,
  onClick,
}: {
  icon: JSX.Element
  label: string
  meta: string
  danger?: boolean
  onClick?: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[40px] items-center gap-2.5 rounded-[11px] border px-3 text-left transition hover:-translate-y-px active:translate-y-0 ${
        danger
          ? "border-red-300/22 bg-[linear-gradient(180deg,rgba(185,28,28,0.76),rgba(127,29,29,0.92))] shadow-[0_0_22px_rgba(239,68,68,0.12),inset_0_1px_0_rgba(255,255,255,0.050)]"
          : "border-white/[0.055] bg-white/[0.022] shadow-[inset_0_1px_0_rgba(255,255,255,0.016)] hover:border-white/[0.09] hover:bg-white/[0.035]"
      }`}
    >
      <span className={danger ? "text-white/88" : "text-white/52"}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.10em] text-white/76">
          {label}
        </span>
        <span className="mt-0.5 block text-[9px] font-medium text-white/36">{meta}</span>
      </span>
    </button>
  )
}

function UtilityOverlay({
  activePanel,
  onClose,
}: {
  activePanel: UtilityPanel
  onClose: () => void
}): JSX.Element {
  const panelMeta: Record<UtilityPanel, { title: string; eyebrow: string; description: string }> = {
    record: {
      title: "Record Console",
      eyebrow: "ISO + Program Recording",
      description: "Configure program capture, isolated camera recordings, naming, destination, and safety checks before recording begins.",
    },
    stream: {
      title: "Stream Destinations",
      eyebrow: "Outbound Broadcast",
      description: "Manage destinations, RTMP endpoints, stream keys, platform health, and failover routes.",
    },
    overlays: {
      title: "Overlay Manager",
      eyebrow: "Graphics + Lower Thirds",
      description: "Arm lower thirds, audience prompts, sponsor bugs, emergency slates, and show graphics.",
    },
    schedule: {
      title: "Scheduled Event",
      eyebrow: "Run of Show",
      description: "Review start time, agenda timing, rehearsal status, and operator notes for the scheduled production.",
    },
    shortcuts: {
      title: "Shortcut Mapper",
      eyebrow: "Operator Controls",
      description: "Assign hotkeys for TAKE, scenes, overlays, record, stream, mute, and backstage actions.",
    },
    settings: {
      title: "Workflow Settings",
      eyebrow: "Production Preferences",
      description: "Control workspace behavior, confirmations, transition defaults, monitoring, and operator safety rails.",
    },
  }

  const meta = panelMeta[activePanel]

  return (
    <div className="absolute inset-2 z-30 overflow-hidden rounded-[18px] border border-sky-200/14 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,rgba(8,13,24,0.98),rgba(2,5,11,0.995))] shadow-[0_24px_70px_rgba(0,0,0,0.48),0_0_28px_rgba(56,189,248,0.08),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.032)_0px,rgba(255,255,255,0.032)_1px,transparent_1px,transparent_28px)]" />
      <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-100/58">
            {meta.eyebrow}
          </div>
          <div className="mt-1 text-[20px] font-semibold tracking-[-0.055em] text-white/92">
            {meta.title}
          </div>
          <div className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/46">
            {meta.description}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/[0.08] bg-white/[0.030] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/58 hover:bg-white/[0.055] hover:text-white/82"
        >
          Close
        </button>
      </div>

      <div className="relative z-10 grid gap-3 p-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[16px] border border-white/[0.055] bg-white/[0.025] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
            Primary Controls
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {[
              "Enable confirmation before live actions",
              "Use event naming template",
              "Notify operator on state changes",
              "Show safety countdown",
            ].map((label, index) => (
              <button
                key={label}
                type="button"
                className={`rounded-[12px] border px-3 py-2.5 text-left text-[11px] font-semibold transition ${
                  index === 0
                    ? "border-sky-300/16 bg-sky-400/[0.10] text-sky-100/78"
                    : "border-white/[0.05] bg-white/[0.020] text-white/60 hover:bg-white/[0.035]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-white/[0.055] bg-white/[0.020] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.016)]">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/42">
            Status
          </div>
          <div className="mt-3 space-y-2">
            {[
              ["System", "Ready"],
              ["Route", "Program"],
              ["Health", "Nominal"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-[11px] border border-white/[0.045] bg-white/[0.018] px-3 py-2">
                <span className="text-[10px] font-semibold text-white/42">{label}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.10em] text-emerald-100/62">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function blockToMediaItem(item: DockAssetRecord, fallbackLabel: string): {
  label: string
  meta: string
  imageUrl?: string | null
} {
  return {
    label: item.label || fallbackLabel,
    meta: item.category ?? "Media",
    imageUrl: "src" in item && typeof item.src === "string" ? item.src : null,
  }
}

export default function BottomAssetDock({
  scenes,
  selectedSceneId,
  programSceneId,
  hotkeySceneId,
  previewBlocks,
  localMicLevel,
  onAddScene,
}: {
  scenes: SceneSummary[]
  selectedSceneId: string | null
  programSceneId: string | null
  programSlideLabel: string | null
  hotkeySceneId: string | null
  previewBlocks: PreviewBlock[]
  localMicLevel?: number
  slideDeckName?: string | null
  slideCount?: number
  onAddScene?: () => void
  onUploadPdf?: () => void
  onSendSlideToPreview?: (slideIndex: number) => void
  onTakeSlide?: (slideIndex: number) => void
  onApplyScene?: (sceneId: string) => void
  onDoubleClickScene?: (sceneId: string) => void
  onDeleteScene?: (sceneId: string) => void
}): JSX.Element {
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<UtilityPanel | null>(null)
  const [expandedMixerOpen, setExpandedMixerOpen] = useState(false)
  const [soloChannel, setSoloChannel] = useState<MixerChannelKey | null>(null)
  const [mutedChannels, setMutedChannels] = useState<Record<MixerChannelKey, boolean>>({
    Program: false,
    Stage: false,
    Music: false,
    Mics: false,
    SFX: false,
    Audience: false,
  })

  function toggleSoloChannel(channel: MixerChannelKey): void {
    setSoloChannel((current) => (current === channel ? null : channel))
  }

  function toggleMutedChannel(channel: MixerChannelKey): void {
    setMutedChannels((current) => ({
      ...current,
      [channel]: !current[channel],
    }))
  }
  const [smoothedMicLevel, setSmoothedMicLevel] = useState(0)
  const rawMicLevel = localMicLevel ?? 0
  const normalizedMicLevel = rawMicLevel <= 1 ? rawMicLevel * 100 : rawMicLevel
  const incomingMicLevel = Math.max(0, Math.min(100, normalizedMicLevel))

  useEffect(() => {
    setSmoothedMicLevel((current) => {
      const next = incomingMicLevel > current
        ? current + (incomingMicLevel - current) * 0.72
        : current + (incomingMicLevel - current) * 0.28

      return Math.abs(next - current) < 0.4 ? incomingMicLevel : next
    })
  }, [incomingMicLevel])

  const micLevelPercent = Math.round(smoothedMicLevel)
  const programLevel = Math.max(2, Math.min(96, Math.round(micLevelPercent * 0.92 + 4)))
  const stageLevel = Math.max(2, Math.min(92, Math.round(micLevelPercent * 0.78 + 3)))
  const musicLevel = Math.max(2, Math.min(84, Math.round(micLevelPercent * 0.46)))
  const sfxLevel = Math.max(2, Math.min(72, Math.round(micLevelPercent * 0.34)))
  const audienceLevel = Math.max(2, Math.min(62, Math.round(micLevelPercent * 0.24)))
  const media = previewBlocks.filter(
    (block) => block.type === "video" || block.type === "image" || block.type === "pdf"
  )

  const mediaItems: DockAssetRecord[] = media.length
    ? media.map((block) => ({ ...block, category: "media" }))
    : FALLBACK_MEDIA_ITEMS

  const activeSceneIds = new Set([selectedSceneId, programSceneId, hotkeySceneId].filter(Boolean))
  const sceneList = scenes.length
    ? scenes.slice(0, 5)
    : [
        { id: "fallback-1", name: "Worship Set" },
        { id: "fallback-2", name: "Message" },
        { id: "fallback-3", name: "Announcement" },
        { id: "fallback-4", name: "Offering" },
        { id: "fallback-5", name: "Closing" },
      ]

  const sceneTiles = scenes.length
    ? scenes.slice(0, 4)
    : [
        { id: "tile-1", name: "Wide Shot", thumbnailUrl: null },
        { id: "tile-2", name: "Band Close", thumbnailUrl: null },
        { id: "tile-3", name: "Vocals", thumbnailUrl: null },
        { id: "tile-4", name: "Drums", thumbnailUrl: null },
      ]

  const mediaRows = [
    ...mediaItems.slice(0, 5).map((item, index) => blockToMediaItem(item, index === 0 ? "Announcement" : "Media")),
    { label: "Welcome Slide", meta: "Graphics", imageUrl: null },
  ].slice(0, 6)

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(7,12,22,0.96),rgba(3,6,12,1))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.010] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.020)_0px,rgba(255,255,255,0.020)_1px,transparent_1px,transparent_28px)]" />
      {activeUtilityPanel ? (
        <UtilityOverlay
          activePanel={activeUtilityPanel}
          onClose={() => setActiveUtilityPanel(null)}
        />
      ) : null}
      {expandedMixerOpen ? (
        <ExpandedAudioMixerOverlay
          micLevelPercent={micLevelPercent}
          programLevel={programLevel}
          stageLevel={stageLevel}
          musicLevel={musicLevel}
          sfxLevel={sfxLevel}
          audienceLevel={audienceLevel}
          soloChannel={soloChannel}
          mutedChannels={mutedChannels}
          onToggleSolo={toggleSoloChannel}
          onToggleMute={toggleMutedChannel}
          onClose={() => setExpandedMixerOpen(false)}
        />
      ) : null}

      <div className="relative z-10 grid min-h-0 flex-1 gap-2 overflow-hidden xl:grid-cols-[1.15fr_0.9fr_0.95fr_0.9fr]">
        <ConsolePanel
          title="Scenes"
          action={
            <button
              type="button"
              onClick={onAddScene}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.055] bg-white/[0.020] text-white/52 hover:bg-white/[0.04]"
              aria-label="Add scene"
            >
              +
            </button>
          }
        >
          <div className="grid min-h-0 gap-2 md:grid-cols-[0.72fr_1fr]">
            <div className="space-y-1">
              {sceneList.map((scene, index) => {
                const active = index === 0 || activeSceneIds.has(scene.id)

                return (
                  <button
                    key={scene.id}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-[9px] px-2 py-1 text-left text-[9px] font-semibold transition ${
                      active
                        ? "bg-sky-500/[0.22] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]"
                        : "text-white/58 hover:bg-white/[0.026] hover:text-white/78"
                    }`}
                  >
                    <span className="w-4 text-white/46">{index + 1}</span>
                    <span className="truncate">{scene.name}</span>
                  </button>
                )
              })}
              <button type="button" onClick={onAddScene} className="mt-1 px-2 text-[10px] font-semibold text-sky-200/70 hover:text-sky-100">
                Add Scene
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {sceneTiles.slice(0, 4).map((scene, index) => (
                <ScenePreviewTile
                  key={scene.id}
                  label={index === 0 && scene.name === "Worship Set" ? "Wide Shot" : scene.name}
                  imageUrl={"thumbnailUrl" in scene ? scene.thumbnailUrl : null}
                  active={index === 0 || activeSceneIds.has(scene.id)}
                />
              ))}
            </div>
          </div>
        </ConsolePanel>

        <ConsolePanel title="Media">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              {["All", "Graphics", "Videos", "Audio"].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={`rounded-[9px] px-2 py-1 text-[9px] font-semibold transition ${
                    index === 0
                      ? "bg-sky-400/[0.12] text-sky-100"
                      : "text-sky-100/52 hover:bg-white/[0.030] hover:text-white/76"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mediaRows.map((item) => (
                <MediaRow key={`${item.label}-${item.meta}`} label={item.label} meta={item.meta} imageUrl={item.imageUrl} />
              ))}
            </div>
            <button type="button" className="mt-2 text-[10px] font-semibold text-sky-200/70 hover:text-sky-100">
              Show All →
            </button>
          </div>
        </ConsolePanel>

        <ConsolePanel
          title="Audio Mixer"
          action={
            <button
              type="button"
              onClick={() => setExpandedMixerOpen(true)}
              className="rounded-full border border-sky-300/12 bg-sky-400/[0.060] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.10em] text-sky-100/62 transition hover:border-sky-300/22 hover:bg-sky-400/[0.10] hover:text-sky-50"
            >
              Expand Mixer
            </button>
          }
        >
          <>
            <div className="grid grid-cols-6 gap-0 overflow-hidden rounded-[13px] border border-white/[0.05] bg-black/16 py-2">
              {([
                ["Program", programLevel],
                ["Stage", stageLevel],
                ["Music", musicLevel],
                ["Mics", micLevelPercent],
                ["SFX", sfxLevel],
                ["Audience", audienceLevel],
              ] as Array<[MixerChannelKey, number]>).map(([label, level]) => (
                <MixerStrip
                  key={label}
                  label={label}
                  level={level}
                  soloActive={soloChannel === label}
                  muted={mutedChannels[label]}
                  onToggleSolo={() => toggleSoloChannel(label)}
                  onToggleMute={() => toggleMutedChannel(label)}
                />
              ))}
            </div>
            <div className="mt-1 grid grid-cols-4 px-2 text-[7px] font-black tabular-nums text-white/26">
              <span>-60</span>
              <span className="text-center text-emerald-100/34">-24</span>
              <span className="text-center text-amber-100/42">-12</span>
              <span className="text-right text-red-100/42">0 dBFS</span>
            </div>
          </>
        </ConsolePanel>

        <ConsolePanel title="Communication">
          <div className="space-y-1.5">
            <CommRow name="Stage Manager" role="Ben" />
            <CommRow name="Camera Ops" role="Trinity" />
            <CommRow name="Lighting Director" role="Jace" />
            <CommRow name="Producer" role="You" active />
            <button
              type="button"
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/[0.050] bg-white/[0.024] px-3 py-2 text-[10px] font-semibold text-white/72 hover:bg-white/[0.040]"
            >
              <Mic2 size={14} />
              Push to Talk (All)
            </button>
          </div>
        </ConsolePanel>
      </div>

      <div className="relative z-20 mt-1.5 grid shrink-0 gap-1.5 border-t border-white/[0.045] pt-1.5 xl:grid-cols-[1fr_1fr_1fr_1.4fr_1.15fr_1fr_1fr]">
        <UtilityButton icon={<CircleDot size={18} />} label="Record" meta="ISO + Main" onClick={() => setActiveUtilityPanel("record")} />
        <UtilityButton icon={<Radio size={18} />} label="Stream" meta="YouTube + FB" onClick={() => setActiveUtilityPanel("stream")} />
        <UtilityButton icon={<Layers3 size={18} />} label="Overlays" meta="2 Active" onClick={() => setActiveUtilityPanel("overlays")} />
        <UtilityButton icon={<MonitorPlay size={18} />} label="End Stream" meta="Live control" danger onClick={() => setActiveUtilityPanel("stream")} />
        <UtilityButton icon={<CalendarDays size={18} />} label="Scheduled Event" meta="Sunday 9:00 AM" onClick={() => setActiveUtilityPanel("schedule")} />
        <UtilityButton icon={<Keyboard size={18} />} label="Shortcuts" meta="⌘ K" onClick={() => setActiveUtilityPanel("shortcuts")} />
        <UtilityButton icon={<Settings size={18} />} label="Settings" meta="Workflow" onClick={() => setActiveUtilityPanel("settings")} />
      </div>
    </div>
  )
}