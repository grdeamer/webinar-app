import { useEffect, useMemo, useRef, useState, type ChangeEvent, type JSX } from "react"
type UtilityPanel = "stream" | "overlays" | "schedule" | "shortcuts" | "settings"
type MediaOrchestratorTab = "overview" | "assets" | "routing" | "take"
type MixerChannelKey = "Program" | "Stage" | "Music" | "Mics" | "SFX" | "Audience"
type BroadcastAssetType = "video" | "graphic" | "audio" | "live"
type BroadcastAssetState = "READY" | "LIVE" | "LOOPING" | "STANDBY" | "CUED" | "SAFE" | "PRELOADED" | "FAILED"
import {
  type DockAssetRecord,
  type SceneSummary,
} from "./assetDockTypes"

type BroadcastAssetTelemetry = {
  label: string
  type: BroadcastAssetType
  state: BroadcastAssetState
  duration: string
  meta: string
  route: string
  lastPlayed: string
  linkedScene: string
  imageUrl?: string | null
  audioEmbedded?: boolean
  programSafe?: boolean
  destination?: "PREVIEW" | "PROGRAM" | "STANDBY"
  takeSafe?: boolean
  cueOrder?: number
  progress?: number
  scheduledIn?: string
  resetBehavior?: string
  cacheState?: "HOT" | "WARM" | "COLD"
  codecState?: "OK" | "CHECK" | "LIVE"
  routeLock?: boolean
  hoverHint?: string
  takeCompatibility?: "Clean" | "Needs Check" | "Live Only"
  segment?: string
  trigger?: string
}
type MediaAssetEditDraft = {
  label: string
  linkedScene: string
  segment: string
  trigger: string
}
type MediaAssetRuntimeState = {
  isPlaying: boolean
  startedAtMs: number | null
  elapsedSeconds: number
}
function AssetRundownStrip({ asset }: { asset: BroadcastAssetTelemetry }): JSX.Element {
  return (
    <div className="mt-1 grid grid-cols-2 gap-0.5 border-t border-white/[0.030] pt-1">
      <div className="min-w-0 rounded-[7px] border border-white/[0.035] bg-black/16 px-1.5 py-1">
        <div className="text-[5.5px] font-black uppercase tracking-[0.12em] text-white/18">Segment</div>
        <div className="mt-0.5 truncate text-[6.5px] font-black uppercase tracking-[0.08em] text-white/38">
          {asset.segment ?? "Manual"}
        </div>
      </div>
      <div className="min-w-0 rounded-[7px] border border-white/[0.035] bg-black/16 px-1.5 py-1">
        <div className="text-[5.5px] font-black uppercase tracking-[0.12em] text-white/18">Trigger</div>
        <div className="mt-0.5 truncate text-[6.5px] font-black uppercase tracking-[0.08em] text-white/38">
          {asset.trigger ?? "Operator"}
        </div>
      </div>
    </div>
  )
}

type RecordingStatus = "idle" | "armed" | "starting" | "recording" | "stopped"

type RecordingSession = {
  id: string
  label: string
  startedAt: string
  endedAt: string | null
  durationSeconds: number
  source: string
  destination: string
  quality: string
  egressId?: string | null
  file?: string | null
  location?: string | null
  size?: string | null
  status: "processing" | "ready" | "recording" | "failed"
}

type RecordingSourceOption = {
  id: string
  label: string
  type: "program" | "preview" | "iso" | "clean" | "return"
  status: "live" | "ready" | "standby"
  description: string
}

import {
  CalendarDays,
  CircleDot,
  Clapperboard,
  Image,
  FileImage,
  Keyboard,
  Layers3,
  Mic2,
  MonitorPlay,
  Music2,
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

function channelIsAudible({
  label,
  muted,
  soloChannel,
}: {
  label: MixerChannelKey
  muted: boolean
  soloChannel: MixerChannelKey | null
}): boolean {
  if (muted) return false
  if (!soloChannel) return true
  return soloChannel === label
}

function formatRecordingDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}
function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 KB"

  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )

  const value = bytes / 1024 ** index

  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

function parseRuntimeDurationSeconds(duration: string): number | null {
  if (!duration || duration === "—" || duration === "LIVE" || duration === "PDF") return null

  const parts = duration.split(":").map((part) => Number(part))

  if (parts.some((part) => Number.isNaN(part))) return null

  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]

  return null
}

function formatRuntimeClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}


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
      className={`group relative overflow-hidden rounded-[12px] border p-1 text-left transition-all duration-300 ease-out hover:-translate-y-px active:translate-y-0 ${
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

function AssetStatePill({ state }: { state: BroadcastAssetState }): JSX.Element {
  const stateClass =
    state === "LIVE"
      ? "border-red-300/24 bg-red-400/[0.115] text-red-100/82 shadow-[0_0_14px_rgba(248,113,113,0.10)]"
      : state === "READY" || state === "SAFE" || state === "PRELOADED"
        ? "border-emerald-300/16 bg-emerald-400/[0.075] text-emerald-100/68"
        : state === "CUED" || state === "LOOPING"
          ? "border-sky-300/18 bg-sky-400/[0.085] text-sky-100/70"
          : state === "FAILED"
            ? "border-red-300/18 bg-red-400/[0.080] text-red-100/68"
            : "border-white/[0.055] bg-white/[0.020] text-white/36"

  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.12em] ${stateClass}`}>
      {state}
    </span>
  )
}

function AssetTypeGlyph({ type }: { type: BroadcastAssetType }): JSX.Element {
  const icon =
    type === "video" ? <Video size={12} /> :
    type === "graphic" ? <FileImage size={12} /> :
    type === "audio" ? <Waves size={12} /> :
    <Radio size={12} />

  const tone =
    type === "video"
      ? "border-sky-300/13 bg-sky-400/[0.050] text-sky-100/58"
      : type === "graphic"
        ? "border-violet-300/13 bg-violet-400/[0.050] text-violet-100/58"
        : type === "audio"
          ? "border-emerald-300/13 bg-emerald-400/[0.050] text-emerald-100/58"
          : "border-red-300/14 bg-red-400/[0.060] text-red-100/62"

  return (
    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border ${tone}`}>
      {icon}
    </div>
  )
}

function AssetConfidenceRail({ asset }: { asset: BroadcastAssetTelemetry }): JSX.Element {
  const checks = [
    ["Cache", asset.cacheState ?? "WARM"],
    ["Codec", asset.codecState ?? "OK"],
    ["Route", asset.routeLock ? "Lock" : "Open"],
  ]

  return (
    <div className="mt-1 grid grid-cols-3 gap-0.5">
      {checks.map(([label, value]) => {
        const good = value === "HOT" || value === "OK" || value === "LIVE" || value === "Lock"
        const caution = value === "CHECK" || value === "COLD" || value === "Open"

        return (
          <span
            key={`${label}-${value}`}
            className={`rounded-full border px-1.5 py-0.5 text-center text-[6.5px] font-black uppercase tracking-[0.08em] ${
              good
                ? "border-emerald-300/12 bg-emerald-400/[0.050] text-emerald-100/46"
                : caution
                  ? "border-amber-300/12 bg-amber-300/[0.045] text-amber-100/44"
                  : "border-white/[0.045] bg-white/[0.016] text-white/28"
            }`}
          >
            {label} {value}
          </span>
        )
      })}
    </div>
  )
}

function AssetHoverIntelligence({ asset }: { asset: BroadcastAssetTelemetry }): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-1 bottom-1 translate-y-1 rounded-[8px] border border-white/[0.050] bg-black/62 px-1.5 py-1 opacity-0 shadow-[0_8px_22px_rgba(0,0,0,0.34)] backdrop-blur-md transition duration-150 group-hover:translate-y-0 group-hover:opacity-100">
      <div className="flex items-center justify-between gap-1 text-[6.5px] font-black uppercase tracking-[0.08em] text-white/42">
        <span className="truncate">{asset.hoverHint ?? "Preview confidence available"}</span>
        <span className="shrink-0 text-sky-100/50">{asset.takeCompatibility ?? "Clean"}</span>
      </div>
    </div>
  )
}

function CueStackRow({ asset }: { asset: BroadcastAssetTelemetry }): JSX.Element {
  const destination = asset.destination ?? "STANDBY"
  const destinationClass =
    destination === "PROGRAM"
      ? "border-red-300/18 bg-red-400/[0.075] text-red-100/66"
      : destination === "PREVIEW"
        ? "border-sky-300/18 bg-sky-400/[0.075] text-sky-100/66"
        : "border-white/[0.050] bg-white/[0.018] text-white/34"

  return (
    <div className="relative overflow-hidden rounded-[10px] border border-white/[0.045] bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.010))] px-2 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.010)]">
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-[2px] ${
          destination === "PROGRAM"
            ? "bg-red-300/58"
            : destination === "PREVIEW"
              ? "bg-sky-300/54"
              : "bg-white/12"
        }`}
      />
      <div className="grid grid-cols-[24px_1fr_auto] items-start gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.055] bg-black/28 text-[8px] font-black tabular-nums text-white/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.030)]">
          {asset.cueOrder ?? "—"}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <AssetTypeGlyph type={asset.type} />
            <div className="min-w-0">
              <div className="truncate text-[9px] font-semibold tracking-[-0.025em] text-white/84">{asset.label}</div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[6.5px] font-black uppercase tracking-[0.11em] text-white/24">
                <span className="truncate">{asset.route}</span>
                <span>·</span>
                <span className="truncate">{asset.linkedScene}</span>
                {asset.scheduledIn ? (
                  <>
                    <span>·</span>
                    <span className="truncate text-sky-100/42">{asset.scheduledIn}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={`rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] ${destinationClass}`}>
            {destination}
          </span>
          <span className={`rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] ${asset.takeSafe ? "border-emerald-300/14 bg-emerald-400/[0.060] text-emerald-100/58" : "border-amber-300/14 bg-amber-300/[0.055] text-amber-100/54"}`}>
            {asset.takeSafe ? "Take Safe" : "Check"}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2 border-t border-white/[0.035] pt-1.5">
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.045]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-300/38 via-sky-200/52 to-white/42 transition-[width,opacity] duration-500 ease-linear"
            style={{ width: `${Math.max(0, Math.min(100, asset.progress ?? 0))}%` }}
          />
        </div>
        <div className="shrink-0 text-[6.5px] font-black uppercase tracking-[0.12em] text-white/26">
          {asset.resetBehavior ?? "Manual"}
        </div>
      </div>
      <AssetConfidenceRail asset={asset} />
    </div>
  )
}

function OrchestrationCommandStrip({
  onPreload,
  onLockRoute,
  onRehearse,
  onReset,
}: {
  onPreload?: () => void
  onLockRoute?: () => void
  onRehearse?: () => void
  onReset?: () => void
}): JSX.Element {
  const commands: Array<{
    label: string
    meta: string
    action?: () => void
  }> = [
    { label: "Preload", meta: "Next asset", action: onPreload },
    { label: "Lock Route", meta: "PVW → PGM", action: onLockRoute },
    { label: "Rehearse", meta: "Safe take", action: onRehearse },
    { label: "Reset", meta: "After TAKE", action: onReset },
  ]

  return (
    <div className="mt-2 grid grid-cols-4 gap-1">
      {commands.map(({ label, meta, action }, index) => (
        <button
          key={label}
          type="button"
          onClick={action}
          className={`group rounded-[9px] border px-1.5 py-1.5 text-left transition-all duration-300 ease-out hover:-translate-y-px active:translate-y-0 ${
            index === 0
              ? "border-sky-300/14 bg-sky-400/[0.060] text-sky-100/64 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]"
              : "border-white/[0.045] bg-white/[0.014] text-white/44 hover:border-white/[0.075] hover:bg-white/[0.025]"
          }`}
        >
          <div className="text-[7px] font-black uppercase tracking-[0.10em]">{label}</div>
          <div className="mt-0.5 truncate text-[6.5px] font-black uppercase tracking-[0.08em] opacity-45">
            {meta}
          </div>
        </button>
      ))}
    </div>
  )
}

function AssetIntelligenceHeader({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
  const liveCount = mediaRows.filter((asset) => asset.state === "LIVE").length
  const safeCount = mediaRows.filter((asset) => asset.takeSafe || asset.programSafe).length
  const lockedCount = mediaRows.filter((asset) => asset.routeLock).length

  return (
    <div className="mb-2 rounded-[12px] border border-white/[0.045] bg-[linear-gradient(180deg,rgba(255,255,255,0.020),rgba(255,255,255,0.010))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/36">
            Asset Intelligence
          </div>
          <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-white/20">
            Cue-aware media · route confidence · take readiness
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[
            ["Live", liveCount],
            ["Safe", safeCount],
            ["Lock", lockedCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-full border border-white/[0.050] bg-black/20 px-2 py-1 text-center">
              <div className="text-[7px] font-black tabular-nums text-white/58">{value}</div>
              <div className="text-[6px] font-black uppercase tracking-[0.10em] text-white/24">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SourceConfidenceStrip({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
  const liveCount = mediaRows.filter((asset) => asset.state === "LIVE").length
  const hotCount = mediaRows.filter((asset) => asset.cacheState === "HOT").length
  const checkCount = mediaRows.filter((asset) => asset.codecState === "CHECK" || asset.takeCompatibility === "Needs Check").length

  const metrics = [
    ["Sources", `${mediaRows.length} Loaded`],
    ["Live", `${liveCount} Active`],
    ["Cache", `${hotCount} Hot`],
    ["Checks", checkCount > 0 ? `${checkCount} Watch` : "Clear"],
  ]

  return (
    <div className="mb-2 flex items-center gap-1.5 border-b border-white/[0.035] pb-2">
      {metrics.map(([label, value], index) => (
        <div
          key={label}
          className={`flex min-w-0 flex-1 items-center justify-between rounded-full border px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.010)] ${
            index === 3 && checkCount > 0
              ? "border-amber-300/13 bg-amber-300/[0.045]"
              : "border-white/[0.040] bg-white/[0.014]"
          }`}
        >
          <span className="text-[6.5px] font-black uppercase tracking-[0.11em] text-white/22">
            {label}
          </span>
          <span className="truncate text-[7px] font-black uppercase tracking-[0.08em] text-white/52">
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}


function TakeSafetyMatrix({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
  const checks = [
    ["Route", mediaRows.some((asset) => asset.routeLock) ? "Locked" : "Open"],
    ["Codec", mediaRows.some((asset) => asset.codecState === "CHECK") ? "Review" : "Clear"],
    ["Audio", mediaRows.some((asset) => asset.audioEmbedded) ? "Embedded" : "Clean"],
    ["Preview", mediaRows.some((asset) => asset.destination === "PREVIEW") ? "Armed" : "Idle"],
  ]

  return (
    <div className="border-b border-white/[0.045] pb-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
            TAKE Safety Matrix
          </div>
          <div className="mt-1 text-[10px] font-semibold tracking-[-0.01em] text-white/40">
            Preflight checks before program execution
          </div>
        </div>
        <div className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.050] px-2 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/50">
          Safe Bias
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        {checks.map(([label, value]) => {
          const caution = value === "Review" || value === "Open" || value === "Idle"

          return (
            <div
              key={label}
              className={`rounded-[9px] border px-2 py-1.5 ${
                caution
                  ? "border-amber-300/12 bg-amber-300/[0.040]"
                  : "border-emerald-300/10 bg-emerald-400/[0.035]"
              }`}
            >
              <div className="text-[7px] font-black uppercase tracking-[0.12em] text-white/24">{label}</div>
              <div className={`mt-1 text-[10px] font-black uppercase tracking-[0.09em] ${caution ? "text-amber-100/54" : "text-emerald-100/54"}`}>
                {value}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RouteMappingPanel({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
  const routes = [
    ["PVW", "Preview", mediaRows.some((asset) => asset.destination === "PREVIEW") ? "Armed" : "Idle"],
    ["PGM", "Program", mediaRows.some((asset) => asset.destination === "PROGRAM") ? "Live" : "Ready"],
    ["STBY", "Standby", mediaRows.some((asset) => asset.destination === "STANDBY") ? "Loaded" : "Clear"],
    ["MSC", "Music Bus", "Routed"],
  ]

  return (
    <div className="border-b border-white/[0.045] pb-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
            Route Map
          </div>
          <div className="mt-1 text-[10px] font-semibold tracking-[-0.01em] text-white/40">
            Preview, program, standby, and bus destinations
          </div>
        </div>
        <div className="rounded-full border border-sky-300/12 bg-sky-400/[0.050] px-2 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-sky-100/50">
          Signal Path
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1">
        {routes.map(([code, label, status]) => (
          <div key={code} className="grid grid-cols-[36px_1fr_auto] items-center gap-1 rounded-[9px] border border-white/[0.040] bg-white/[0.014] px-2 py-1.5">
            <span className="rounded-full border border-sky-300/12 bg-sky-400/[0.045] px-2 py-0.5 text-center text-[8px] font-black uppercase tracking-[0.08em] text-sky-100/54">
              {code}
            </span>
            <span className="text-[10px] font-semibold tracking-[-0.01em] text-white/48">{label}</span>
            <span className="text-[8px] font-black uppercase tracking-[0.10em] text-emerald-100/52">{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TransitionCompatibilityPanel({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
  const nextAsset = mediaRows.find((asset) => asset.destination === "PREVIEW") ?? mediaRows[0]
  const compatibility = nextAsset?.takeCompatibility ?? "Clean"
  const caution = compatibility === "Needs Check"

  return (
    <div className="border-b border-white/[0.045] pb-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
            Transition Compatibility
          </div>
          <div className="mt-1 text-[10px] font-semibold tracking-[-0.01em] text-white/40">
            Next asset against current program context
          </div>
        </div>
        <div className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.10em] ${caution ? "border-amber-300/14 bg-amber-300/[0.050] text-amber-100/52" : "border-emerald-300/12 bg-emerald-400/[0.050] text-emerald-100/50"}`}>
          {compatibility}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1">
        {[
          ["Motion", nextAsset?.type === "video" ? "Timed" : "Static"],
          ["Audio", nextAsset?.audioEmbedded ? "Embedded" : "Clear"],
          ["Reset", nextAsset?.resetBehavior ?? "Manual"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[9px] border border-white/[0.040] bg-white/[0.014] px-2 py-1 text-center">
            <div className="text-[6.5px] font-black uppercase tracking-[0.10em] text-white/22">{label}</div>
            <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.08em] text-white/48">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
function TimelineStatePill({ state }: { state: string }): JSX.Element {
  const tone =
    state === "LIVE"
      ? "border-red-300/18 bg-red-400/[0.070] text-red-100/62"
      : state === "NEXT"
        ? "border-sky-300/18 bg-sky-400/[0.070] text-sky-100/62"
        : state === "SAFE" || state === "LINKED"
          ? "border-emerald-300/14 bg-emerald-400/[0.055] text-emerald-100/54"
          : state === "USED"
            ? "border-white/[0.050] bg-white/[0.018] text-white/34"
            : "border-white/[0.050] bg-black/18 text-white/36"

  return (
    <div className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] ${tone}`}>
      {state}
    </div>
  )
}
function ActiveTakeQueuePanel({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
  const programAsset = mediaRows.find((asset) => asset.destination === "PROGRAM") ?? mediaRows[0]
  const previewAsset = mediaRows.find((asset) => asset.destination === "PREVIEW") ?? mediaRows[1] ?? mediaRows[0]
  const standbyAsset = mediaRows.find((asset) => asset.destination === "STANDBY") ?? mediaRows[2] ?? mediaRows[0]
  return (
    <div className="border-b border-white/[0.045] pb-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/40">
            Active TAKE Queue
          </div>

          <div className="mt-1 text-[10px] font-medium tracking-[-0.01em] text-white/42">
            Ordered narrative execution
          </div>
        </div>

        <div className="rounded-full border border-red-300/14 bg-red-400/[0.055] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-red-100/56">
          TAKE Armed
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <div className="mb-2 grid grid-cols-5 gap-0.5">
  {[
    ["Primary", "Live"],
    ["Backup", "Ready"],
    ["Fallback", "Safe"],
    ["Reset", "Auto"],
    ["Rehearsal", "Safe"],
  ].map(([label, value], index) => (
    <div
      key={label}
      className={`rounded-[10px] border px-1.5 py-1 text-center ${
        index === 0
          ? "border-red-300/14 bg-red-400/[0.055]"
          : index === 1
            ? "border-sky-300/14 bg-sky-400/[0.050]"
            : "border-white/[0.045] bg-black/18"
      }`}
    >
      <div className="text-[6px] font-black uppercase tracking-[0.10em] text-white/22">
        {label}
      </div>

      <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-white/52">
        {value}
      </div>
    </div>
  ))}
</div>
        {[
          ["ON AIR", programAsset?.label ?? "Program Asset", programAsset?.type === "live" ? "Cut · Live" : "Program · Active"],
          ["NEXT", previewAsset?.label ?? "Preview Asset", previewAsset?.type === "graphic" ? "Hold · Static" : "Dissolve · 1.5s"],
          ["THEN", standbyAsset?.label ?? "Standby Asset", standbyAsset?.type === "live" ? "Cut · Live" : "Cue · Standby"],
        ].map(([position, asset, transition], index) => (
          <div
            key={asset}
            className={`grid grid-cols-[50px_1fr_auto] items-center gap-2 rounded-[12px] border px-2.5 py-1.5 ${
              index === 0
                ? "border-red-300/16 bg-red-400/[0.055]"
                : index === 1
                  ? "border-sky-300/16 bg-sky-400/[0.055]"
                  : "border-white/[0.045] bg-white/[0.018]"
            }`}
          >
            <div
              className={`rounded-full px-2 py-1 text-center text-[7px] font-black uppercase tracking-[0.10em] ${
                index === 0
                  ? "border border-red-300/16 bg-red-400/[0.070] text-red-100/64"
                  : index === 1
                    ? "border border-sky-300/16 bg-sky-400/[0.070] text-sky-100/64"
                    : "border border-white/[0.045] bg-black/18 text-white/38"
              }`}
            >
              {position}
            </div>

            <div className="min-w-0">
              <div className="truncate text-[10px] font-semibold tracking-[-0.025em] text-white/80">
                {asset}
              </div>

              <div className="mt-0.5 truncate text-[7px] font-black uppercase tracking-[0.10em] text-white/28">
                Transition choreography prepared
              </div>
            </div>

            <div className="rounded-full border border-emerald-300/10 bg-emerald-400/[0.045] px-2 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-emerald-100/48">
              {transition}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1">
        {[
          ["Preload", "Ready"],
          ["Transition", "Prepared"],
          ["Reset", "Auto"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[10px] border border-white/[0.045] bg-black/20 px-2 py-1.5 text-center"
          >
            <div className="text-[6.5px] font-black uppercase tracking-[0.10em] text-white/22">
              {label}
            </div>

            <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/50">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-[12px] border border-emerald-300/10 bg-emerald-400/[0.030] p-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[7px] font-black uppercase tracking-[0.13em] text-emerald-100/42">
              Fallback Chain
            </div>
            <div className="mt-0.5 text-[8px] font-semibold tracking-[-0.01em] text-white/36">
              Recovery route prepared if primary asset fails
            </div>
          </div>

          <div className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.055] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.09em] text-emerald-100/52">
            Armed
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1">
          {[
            ["Primary", programAsset?.label ?? "Program"],
            ["Backup", previewAsset?.label ?? "Preview"],
            ["Fallback", standbyAsset?.label ?? "Hold Frame"],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={`rounded-[9px] border px-2 py-1.5 text-center ${
                index === 0
                  ? "border-sky-300/12 bg-sky-400/[0.045]"
                  : "border-white/[0.040] bg-black/18"
              }`}
            >
              <div className="text-[6px] font-black uppercase tracking-[0.10em] text-white/22">
                {label}
              </div>
              <div className="mt-0.5 truncate text-[7px] font-black uppercase tracking-[0.08em] text-white/48">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
function ProductionIntentPanel(): JSX.Element {
  return (
    <div className="border-b border-white/[0.045] pb-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
            Production Intent
          </div>
          <div className="mt-1 text-[10px] font-medium tracking-[-0.01em] text-white/42">
            Narrative purpose behind the next media action
          </div>
        </div>

        <div className="rounded-full border border-sky-300/12 bg-sky-400/[0.050] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-sky-100/54">
          Director View
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1">
        {[
          ["Moment", "Open with motion"],
          ["Audience Effect", "Orient attention"],
          ["Operator Goal", "Clean handoff"],
          ["Narrative Risk", "Low"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-[9px] border border-white/[0.040] bg-white/[0.014] px-2 py-1"
          >
            <span className="text-[8px] font-black uppercase tracking-[0.11em] text-white/28">{label}</span>
            <span className="text-[9px] font-semibold tracking-[-0.01em] text-white/58">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
function OperatorConfidencePanel(): JSX.Element {
  const confidenceRows = [
    ["TAKE Confidence", "High", "green"],
    ["Presenter Sync", "Stable", "green"],
    ["Audience Pacing", "Nominal", "green"],
    ["Transition Risk", "Low", "green"],
    ["Live Source", "Watched", "amber"],
  ]

  return (
    <div className="border-b border-white/[0.045] pb-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
            Operator Confidence
          </div>
          <div className="mt-1 text-[10px] font-medium tracking-[-0.01em] text-white/42">
            Human-readable confidence for the live moment
          </div>
        </div>

        <div className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.050] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/54">
          Confidence High
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1">
        {confidenceRows.map(([label, value, tone]) => {
          const isAmber = tone === "amber"

          return (
            <div
              key={label}
              className={`flex items-center justify-between rounded-[9px] border px-2 py-1 ${
                isAmber
                  ? "border-amber-300/12 bg-amber-300/[0.040]"
                  : "border-emerald-300/10 bg-emerald-400/[0.032]"
              }`}
            >
              <span className="text-[8px] font-black uppercase tracking-[0.11em] text-white/28">
                {label}
              </span>
              <span className={`text-[9px] font-black uppercase tracking-[0.09em] ${isAmber ? "text-amber-100/54" : "text-emerald-100/54"}`}>
                {value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
function MediaRow({
  asset,
  selected = false,
  onSelect,
}: {
  asset: BroadcastAssetTelemetry
  selected?: boolean
  onSelect?: () => void
}): JSX.Element {
  const typeFrame =
    asset.type === "video"
      ? "border-sky-300/10 bg-[radial-gradient(circle_at_35%_28%,rgba(56,189,248,0.16),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]"
      : asset.type === "graphic"
        ? "border-violet-300/10 bg-[linear-gradient(135deg,rgba(30,27,75,0.82),rgba(8,10,20,0.98))]"
        : asset.type === "audio"
          ? "border-emerald-300/10 bg-[linear-gradient(135deg,rgba(6,78,59,0.40),rgba(2,6,23,0.98))]"
          : "border-red-300/12 bg-[radial-gradient(circle_at_35%_28%,rgba(248,113,113,0.18),transparent_38%),linear-gradient(135deg,rgba(24,8,12,0.95),rgba(2,6,23,0.98))]"

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex min-w-0 items-stretch gap-1 overflow-hidden rounded-[9px] border p-[3px] text-left transition hover:-translate-y-px hover:border-white/[0.085] hover:bg-white/[0.030] active:translate-y-0 ${
selected
  ? "border-sky-300/22 bg-sky-400/[0.060] shadow-[0_0_18px_rgba(56,189,248,0.10),inset_0_1px_0_rgba(255,255,255,0.018)]"
  : asset.state === "PRELOADED"
    ? "border-emerald-300/16 bg-emerald-400/[0.045] shadow-[0_0_20px_rgba(16,185,129,0.12)]"
    : "border-white/[0.045] bg-white/[0.016]"
      }`}
    >
      <div className={`relative h-[46px] w-[64px] shrink-0 overflow-hidden rounded-[7px] border ${typeFrame}`}>
        {asset.imageUrl ? (
          <img src={asset.imageUrl} alt="Media preview" className="absolute inset-0 h-full w-full object-cover opacity-85" />
        ) : null}
        {asset.type === "audio" ? (
          <div className="absolute inset-x-2 bottom-2 flex h-6 items-end justify-between gap-0.5">
            {Array.from({ length: 14 }).map((_, index) => (
              <span
                key={index}
                className="w-0.5 rounded-full bg-emerald-200/44"
                style={{ height: `${5 + ((index * 7) % 18)}px` }}
              />
            ))}
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent_34%,rgba(0,0,0,0.38))]" />
        <div className="absolute bottom-1 left-1 rounded bg-black/45 px-1 py-0.5 text-[7px] font-black tabular-nums text-white/68">
          {asset.duration}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            <div className="truncate text-[9px] font-semibold tracking-[-0.02em] text-white/80">{asset.label}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <AssetTypeGlyph type={asset.type} />
              <div className="min-w-0 text-[6.5px] font-black uppercase tracking-[0.12em] text-white/28">
                {asset.meta}
              </div>
            </div>
          </div>
          <AssetStatePill state={asset.state} />
        </div>

<div className="mt-0.5 grid grid-cols-3 gap-0.5 text-[6px] font-black uppercase tracking-[0.10em] text-white/24">
  <span className="truncate">{asset.route}</span>

  <span className="truncate text-center">
    {asset.lastPlayed}
  </span>

  <span className="truncate text-right">
    {asset.linkedScene}
  </span>
</div>

<div className="mt-0.5 flex flex-wrap items-center gap-0.5">
  <span
    className={`rounded-full border px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] ${
      asset.routeLock
        ? "border-sky-300/14 bg-sky-400/[0.055] text-sky-100/54"
        : "border-white/[0.050] bg-white/[0.018] text-white/32"
    }`}
  >
    {asset.routeLock ? "Route Locked" : "Route Open"}
  </span>

  <span
    className={`rounded-full border px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] ${
      asset.takeSafe
        ? "border-emerald-300/12 bg-emerald-400/[0.050] text-emerald-100/52"
        : "border-amber-300/12 bg-amber-300/[0.050] text-amber-100/48"
    }`}
  >
    {asset.takeSafe ? "Take Ready" : "Needs Check"}
  </span>

  {asset.state === "LIVE" ? (
    <span className="rounded-full border border-red-300/16 bg-red-400/[0.070] px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] text-red-100/58">
      Live Signal
    </span>
  ) : null}
</div>

<div className="mt-0.5 overflow-hidden rounded-full bg-white/[0.035]">
  <div
    className={`h-[3px] rounded-full transition-[width,opacity] duration-500 ease-linear ${
      asset.state === "LIVE"
        ? "bg-gradient-to-r from-red-400/70 via-red-300/70 to-white/70"
        : asset.takeSafe
          ? "bg-gradient-to-r from-emerald-400/60 via-sky-300/60 to-white/60"
          : "bg-gradient-to-r from-amber-300/60 via-amber-200/60 to-white/50"
    }`}
    style={{
      width: `${Math.max(8, Math.min(100, asset.progress ?? 0))}%`,
    }}
  />
</div>

        <AssetConfidenceRail asset={asset} />
        <AssetRundownStrip asset={asset} />
      </div>
      <AssetHoverIntelligence asset={asset} />
    </button>
  )
}

function AudioAssetRow({
  label,
  meta,
  active,
  state = "STANDBY",
  route = "Music Bus",
  trigger = "Manual",
  bus = "MSC",
}: {
  label: string
  meta: string
  active?: boolean
  state?: BroadcastAssetState
  route?: string
  trigger?: string
  bus?: string
}): JSX.Element {
  return (
    <button
      type="button"
      className={`group relative flex min-w-0 items-center gap-2 overflow-hidden rounded-[10px] border p-1.5 text-left transition hover:-translate-y-px hover:border-emerald-300/14 hover:bg-emerald-400/[0.035] active:translate-y-0 ${
        active
          ? "border-emerald-300/18 bg-emerald-400/[0.070]"
          : "border-white/[0.040] bg-white/[0.014]"
      }`}
    >
      <div className="pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-full bg-emerald-300/44" />
      <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-[9px] border border-emerald-300/12 bg-emerald-400/[0.045] px-1.5 py-1 text-emerald-100/54">
        <div className="absolute inset-x-1.5 bottom-1 flex h-5 items-end justify-between gap-0.5">
          {Array.from({ length: 9 }).map((_, index) => (
            <span
              key={index}
              className="w-0.5 rounded-full bg-emerald-200/48"
              style={{ height: `${4 + ((index * 5) % 15)}px` }}
            />
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="truncate text-[10px] font-semibold text-white/76">{label}</div>
          <span className="shrink-0 rounded-full border border-emerald-300/12 bg-emerald-400/[0.050] px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] text-emerald-100/48">
            {bus}
          </span>
        </div>
        <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/30">
          {meta} · {route}
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1 border-t border-white/[0.030] pt-1">
          <span className="rounded-[7px] border border-white/[0.035] bg-black/16 px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] text-white/34">
            Trigger {trigger}
          </span>
          <span className="rounded-[7px] border border-white/[0.035] bg-black/16 px-1.5 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] text-white/34">
            Fade 1.2s
          </span>
        </div>
      </div>
      <AssetStatePill state={state} />
    </button>
  )
}

function MixerStrip({
  label,
  level,
  soloActive,
  muted,
  audible,
  peakLevel,
  onToggleSolo,
  onToggleMute,
}: {
  label: MixerChannelKey
  level: number
  soloActive: boolean
  muted: boolean
  audible: boolean
  peakLevel: number
  onToggleSolo: () => void
  onToggleMute: () => void
}): JSX.Element {
  const effectiveLevel = audible ? level : Math.min(level, 3)
  const clampedLevel = Math.max(2, Math.min(96, effectiveLevel))
  const clampedPeakLevel = Math.max(2, Math.min(96, audible ? peakLevel : 3))
  const meterOpacity = clampedLevel > 6 ? "opacity-100" : "opacity-30"
  const dbLabel = dbLabelFromPercent(clampedLevel)
  const clipHot = clampedLevel > 92

  return (
    <div className={`flex min-w-0 flex-col items-center gap-1.5 border-r border-white/[0.030] px-1.5 transition-opacity last:border-r-0 ${audible ? "opacity-100" : "opacity-48"}`}>
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
          <div
            className="absolute left-0 right-0 h-0.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.55)] transition-[bottom] duration-150 ease-out"
            style={{ bottom: `${clampedPeakLevel}%` }}
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
  peakLevels,
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
  peakLevels: Record<MixerChannelKey, number>
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
  const [signalMapOpen, setSignalMapOpen] = useState(false)

  return (
    <div className="fixed inset-x-6 bottom-6 top-[96px] z-[999] overflow-hidden rounded-[24px] border border-emerald-200/16 bg-[radial-gradient(circle_at_24%_0%,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,rgba(5,13,18,0.985),rgba(2,5,10,0.998))] shadow-[0_34px_110px_rgba(0,0,0,0.72),0_0_42px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.030)_0px,rgba(255,255,255,0.030)_1px,transparent_1px,transparent_32px)]" />
      <div className="relative z-[2500] flex items-start justify-between gap-3 border-b border-white/[0.065] px-4 py-3">
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

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSignalMapOpen((current) => !current)}
            className="rounded-full border border-emerald-300/14 bg-emerald-400/[0.055] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-emerald-100/62 transition hover:border-emerald-300/24 hover:bg-emerald-400/[0.095] hover:text-emerald-50"
          >
            Signal Map
          </button>

          <button
            type="button"
            onClick={() => {
              setSignalMapOpen(false)
              onClose()
            }}
            className="rounded-full border border-white/[0.08] bg-white/[0.030] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/58 transition hover:bg-white/[0.055] hover:text-white/82"
          >
            Close
          </button>

          {signalMapOpen ? (
            <div className="fixed right-10 top-[154px] z-[3000] w-[430px] overflow-hidden rounded-[20px] border border-emerald-200/24 bg-[#02060a] p-3 text-left shadow-[0_40px_110px_rgba(0,0,0,0.96),0_0_34px_rgba(16,185,129,0.14),inset_0_1px_0_rgba(255,255,255,0.060)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#061416_0%,#02060a_100%)] opacity-100" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_18px)]" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-100/52">
                      Jupiter Signal Buses
                    </div>
                    <div className="mt-1 text-[12px] font-semibold tracking-[-0.02em] text-white/80">
                      Routing shorthand for the expanded mixer.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSignalMapOpen(false)}
                    className="shrink-0 rounded-full border border-white/[0.09] bg-white/[0.035] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.10em] text-white/58 transition hover:bg-white/[0.065] hover:text-white/84"
                  >
                    Close Map
                  </button>
                </div>

                <div className="mt-3 grid gap-1.5">
                  {[
                    ["PGM", "Program", "Final audience / recording output."],
                    ["STG", "Stage", "Live presenters, hosts, and guests."],
                    ["MSC", "Music", "Playback beds, countdowns, and ambient loops."],
                    ["MIC", "Mics", "Operator or presenter microphone inputs."],
                    ["SFX", "SFX", "Stingers, alerts, and transition effects."],
                    ["AUD", "Audience", "Audience return, Q&A, or moderated participation."],
                  ].map(([code, label, description]) => (
                    <div key={code} className="grid grid-cols-[46px_70px_1fr] items-start gap-2 rounded-[12px] border border-white/[0.085] bg-[#071115] px-2.5 py-2">
                      <span className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.050] px-2 py-0.5 text-center text-[8px] font-black text-emerald-100/62">
                        {code}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.10em] text-white/56">
                        {label}
                      </span>
                      <span className="text-[10px] leading-4 text-white/42">
                        {description}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-[12px] border border-sky-200/18 bg-[#07131a] px-3 py-2 text-[10px] leading-4 text-sky-50/72">
                  Some buses are currently confidence/simulation layers while routing is being wired to LiveKit tracks, media playback, and future audience participation.
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative z-10 grid max-h-[calc(52vh-92px)] min-h-0 gap-3 overflow-y-auto p-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="min-h-0 rounded-[18px] border border-white/[0.065] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
          <div className="grid h-full min-h-0 grid-cols-6 gap-3">
            {channels.map(([label, level, badge]) => {
              const muted = mutedChannels[label]
              const soloActive = soloChannel === label
              const audible = channelIsAudible({ label, muted, soloChannel })
              const peakLevel = Math.max(2, Math.min(96, audible ? peakLevels[label] : 3))
              const effectiveLevel = audible ? level : Math.min(level, 3)
              const clampedLevel = Math.max(2, Math.min(96, effectiveLevel))
              const dbLabel = dbLabelFromPercent(clampedLevel)
              const clipHot = clampedLevel > 92

              return (
                <div key={label} className={`flex min-h-0 flex-col overflow-hidden rounded-[16px] border p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.016)] transition ${audible ? "border-white/[0.055] bg-white/[0.020] opacity-100" : "border-white/[0.035] bg-black/20 opacity-52"}`}>
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
                        <div
                          className="absolute left-0 right-0 h-0.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.62)] transition-[bottom] duration-150 ease-out"
                          style={{ bottom: `${peakLevel}%` }}
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
                    {muted ? "Muted" : soloActive ? "Solo Active" : clipHot ? "Clip Risk" : audible ? "Signal Safe" : "Dimmed"}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="min-h-0 space-y-3 overflow-hidden rounded-[18px] border border-white/[0.065] bg-white/[0.020] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
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
      className={`group flex min-h-[40px] items-center gap-2.5 rounded-[11px] border px-3 text-left transition-all duration-300 ease-out hover:-translate-y-px active:translate-y-0 ${
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
  recordingStatus,
  recordingElapsedSeconds,
  recordings,
  onArmRecording,
  onStartRecording,
  onStopRecording,
  onClose,
}: {
  activePanel: UtilityPanel
  recordingStatus: RecordingStatus
  recordingElapsedSeconds: number
  recordings: RecordingSession[]
  onArmRecording: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onClose: () => void
}): JSX.Element {
  const panelMeta: Record<UtilityPanel, { title: string; eyebrow: string; description: string }> = {
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
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-sky-100/58">
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

function blockToBroadcastAsset(item: DockAssetRecord, fallbackLabel: string, index: number): BroadcastAssetTelemetry {
  const sourceType = "type" in item && typeof item.type === "string" ? item.type : "video"
  const type: BroadcastAssetType =
    sourceType === "image" || sourceType === "pdf"
      ? "graphic"
      : sourceType === "audio"
        ? "audio"
        : "video"

  const state: BroadcastAssetState = index === 0 ? "CUED" : index === 1 ? "READY" : index === 2 ? "SAFE" : "STANDBY"

  return {
    label: item.label || fallbackLabel,
    type,
    state,
    duration: type === "graphic" ? "16:9" : index === 0 ? "00:45" : index === 1 ? "01:12" : "—",
    meta: type === "graphic" ? "Graphic · 1920×1080" : type === "audio" ? "Audio · Stereo" : "Video · 1080p",
    route: index === 0 ? "PVW" : index === 1 ? "PGM Safe" : "Standby",
    lastPlayed: index === 0 ? "Not played" : index === 1 ? "12m ago" : "—",
    linkedScene: index === 0 ? "Linked Scene" : index === 1 ? "Keynote" : "No link",
    imageUrl: "src" in item && typeof item.src === "string" ? item.src : null,
    audioEmbedded: type === "video",
    programSafe: index <= 2,
    destination: index === 0 ? "PREVIEW" : index === 1 ? "PROGRAM" : "STANDBY",
    takeSafe: index <= 2,
    cueOrder: index + 1,
    progress: index === 1 ? 72 : index === 0 ? 24 : 0,
    scheduledIn: index === 0 ? "Next" : index === 1 ? "On air" : index === 2 ? "In 12m" : "Unscheduled",
    resetBehavior: index === 1 ? "Auto Reset" : "Manual",
    cacheState: index === 0 ? "HOT" : index === 1 ? "WARM" : "COLD",
    codecState: sourceType === "live" ? "LIVE" : index === 2 ? "CHECK" : "OK",
    routeLock: index <= 1,
    hoverHint: index === 0 ? "Ready for preview scrub" : index === 1 ? "Route locked to program" : "Manual verification advised",
    takeCompatibility: index === 2 ? "Needs Check" : "Clean",
    segment: index === 0 ? "Open" : index === 1 ? "Keynote" : index === 2 ? "Break" : "Manual",
    trigger: index === 0 ? "Next TAKE" : index === 1 ? "Scene Link" : "Operator",
  }
}



function MediaOverviewWorkspace({
  mediaRows,
}: {
  mediaRows: BroadcastAssetTelemetry[]
}): JSX.Element {
  return (
    <div className="grid gap-2 xl:grid-cols-[1fr_1fr]">
      <div>
        <ProductionIntentPanel />
      </div>

      <div className="space-y-2">
        <OperatorConfidencePanel />

        <div className="border-b border-white/[0.045] pb-2">
          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
            Operational Status
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1">
            {[
              ["Preview Confidence", "Stable"],
              ["Route Validation", mediaRows.some((asset) => asset.routeLock) ? "Mapped" : "Open"],
              ["TAKE Preflight", mediaRows.some((asset) => asset.takeSafe === false) ? "Review" : "Green"],
              ["Timeline Sync", "Linked"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-[9px] border border-white/[0.040] bg-white/[0.014] px-2 py-1"
              >
                <span className="text-[10px] font-semibold text-white/42">{label}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.10em] text-emerald-100/58">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MediaAssetsWorkspace({
  mediaRows,
  assetTabStats,
  selectedMediaAsset,
  previewMediaAsset,
  onSelectAsset,
  onEditImportedAsset,
  onDeleteImportedAsset,
  isImportedAsset,
  onRenameImportedAsset,
  onArmPreviewAsset,
  takeFlashAssetLabel,
  takeFlashProgramLabel,
}: {
  mediaRows: BroadcastAssetTelemetry[]
  assetTabStats: ReadonlyArray<readonly [string, number]>
  selectedMediaAsset: BroadcastAssetTelemetry | null
  previewMediaAsset: BroadcastAssetTelemetry | null
  takeFlashAssetLabel: string | null
  takeFlashProgramLabel: string | null
  onSelectAsset: (label: string) => void
  onArmPreviewAsset: (label: string) => void
  onEditImportedAsset: (label: string) => void
  onDeleteImportedAsset: (label: string) => void
  isImportedAsset: (label: string) => boolean
  onRenameImportedAsset: (oldLabel: string, nextLabel: string) => void
}): JSX.Element {
  const inspectedAsset = selectedMediaAsset ?? mediaRows[0] ?? null
  const armedPreviewAsset = previewMediaAsset
  const inspectedIsImported = inspectedAsset ? isImportedAsset(inspectedAsset.label) : false
  const [renamingAssetLabel, setRenamingAssetLabel] = useState<string | null>(null)
const [renameDraft, setRenameDraft] = useState("")
const [hoverPreviewAssetLabel, setHoverPreviewAssetLabel] = useState<string | null>(null)
const [transitioningAssetLabel, setTransitioningAssetLabel] = useState<string | null>(null)
const [programPulseLabel, setProgramPulseLabel] = useState<string | null>(null)

  function beginRenameAsset(asset: BroadcastAssetTelemetry): void {
    if (!isImportedAsset(asset.label)) return

    setRenamingAssetLabel(asset.label)
    setRenameDraft(asset.label)
  }

  function cancelRenameAsset(): void {
    setRenamingAssetLabel(null)
    setRenameDraft("")
  }

  function commitRenameAsset(): void {
    if (!renamingAssetLabel) return

    const nextLabel = renameDraft.trim()

    if (!nextLabel || nextLabel === renamingAssetLabel) {
      cancelRenameAsset()
      return
    }

    onRenameImportedAsset(renamingAssetLabel, nextLabel)
    cancelRenameAsset()
  }

  return (
    <div className="grid min-h-0 h-[clamp(218px,25dvh,272px)] gap-2.5 xl:grid-cols-[340px_1.45fr_190px_190px]">
      <div className="min-h-0 overflow-hidden rounded-[16px] border border-white/[0.045] bg-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
        <div className="flex h-[34px] items-center justify-between gap-2 border-b border-white/[0.035] px-2">
          <div className="min-w-0">
            <div className="text-[7px] font-black uppercase tracking-[0.16em] text-sky-100/38">
              Asset Library
            </div>
            <div className="truncate text-[7px] font-semibold tracking-[-0.01em] text-white/30">
              {assetTabStats.length} sets · {mediaRows.length} loaded
            </div>
          </div>

          <div className="rounded-full border border-sky-300/12 bg-sky-400/[0.055] px-2 py-0.5 text-[6.5px] font-black uppercase tracking-[0.10em] text-sky-100/54">
            Preview Select
          </div>
        </div>

        <div className="h-[calc(100%-34px)] min-h-0 overflow-y-auto p-2 pr-1.5">
          <div className="grid gap-1">
            {mediaRows.map((asset) => {
              const active = inspectedAsset?.label === asset.label
              const destination = asset.destination ?? "STANDBY"
              const assetIsImported = isImportedAsset(asset.label)
              const isRenamingAsset = renamingAssetLabel === asset.label
              const takeFlashing = takeFlashAssetLabel === asset.label
              const programFlashing = takeFlashProgramLabel === asset.label
              const hoverPreviewing = hoverPreviewAssetLabel === asset.label

              return (
<button
  key={`${asset.label}-${asset.destination}-${asset.state}`}
  type="button"
  onClick={() => onSelectAsset(asset.label)}
  onMouseEnter={() => setHoverPreviewAssetLabel(asset.label)}
  onMouseLeave={() =>
    setHoverPreviewAssetLabel((current) =>
      current === asset.label ? null : current
    )
  }
                  className={`relative grid grid-cols-[28px_minmax(0,1fr)_72px] items-center gap-1.5 rounded-[9px] border px-2 py-1.5 text-left transition-all duration-300 ease-out hover:-translate-y-px active:translate-y-0 ${
                    takeFlashing
  ? "border-sky-200/50 bg-sky-300/[0.22] scale-[1.01] shadow-[0_0_42px_rgba(56,189,248,0.34)]"
: programFlashing
  ? "border-red-300/34 bg-red-400/[0.15] shadow-[0_0_38px_rgba(248,113,113,0.26)]"
: hoverPreviewing
  ? "border-sky-300/24 bg-sky-400/[0.08] shadow-[0_0_28px_rgba(56,189,248,0.16)]"
: programPulseLabel === asset.label
  ? "border-red-300/38 bg-red-400/[0.14] shadow-[0_0_52px_rgba(248,113,113,0.34),0_0_100px_rgba(248,113,113,0.12)] animate-pulse"
: active
      ? "border-sky-300/34 bg-sky-400/[0.12] shadow-[0_0_26px_rgba(56,189,248,0.22),0_0_60px_rgba(56,189,248,0.10),inset_0_1px_0_rgba(255,255,255,0.024)] ring-1 ring-sky-300/16"
      : asset.state === "PRELOADED"
        ? "border-emerald-300/14 bg-emerald-400/[0.040]"
        : "border-white/[0.045] bg-white/[0.014] hover:border-white/[0.080] hover:bg-white/[0.026]"
                  }`}
                >
                  <div className="relative h-7 w-7 overflow-hidden rounded-[7px] border border-white/[0.05] bg-black/30">
  {asset.imageUrl ? (
    <img
      src={asset.imageUrl}
      alt=""
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center">
      <AssetTypeGlyph type={asset.type} />
    </div>
  )}

  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_40%,rgba(0,0,0,0.34))]" />
  {hoverPreviewing ? (
  <div className="pointer-events-none absolute inset-0 border border-sky-300/28 shadow-[inset_0_0_22px_rgba(56,189,248,0.24)]" />
) : null}
</div>
<div
  className={`absolute inset-y-1 left-0 w-[2px] rounded-full transition-all duration-300 ease-out ${
    programPulseLabel === asset.label
      ? "bg-red-300 shadow-[0_0_18px_rgba(248,113,113,0.95)]"
      : active
        ? "bg-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
        : "bg-transparent"
  }`}
/>

<div className="flex-1 pr-1">
  <div className="flex items-center gap-1">
                      <div className="min-w-0 flex-1">
                        {isRenamingAsset ? (
                          <input
                            autoFocus
                            value={renameDraft}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setRenameDraft(event.target.value)}
                            onBlur={commitRenameAsset}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault()
                                commitRenameAsset()
                              }

                              if (event.key === "Escape") {
                                event.preventDefault()
                                cancelRenameAsset()
                              }
                            }}
                            className="w-full rounded-[7px] border border-sky-300/24 bg-black/42 px-2 py-1 text-[10px] font-semibold tracking-[-0.02em] text-white/88 outline-none"
                          />
                        ) : (
<button
  type="button"
  onClick={(event) => event.stopPropagation()}
  onDoubleClick={(event) => {
    event.stopPropagation()
    beginRenameAsset(asset)
  }}
  className={`block w-full min-w-0 overflow-hidden rounded-[7px] px-1.5 py-[2px] text-left transition-all duration-200 ${
    assetIsImported
      ? "cursor-text hover:bg-sky-300/[0.075]"
      : ""
  }`}
>
  <span className="block truncate text-[10px] font-semibold tracking-[-0.02em] text-white/84">
    {asset.label}
  </span>
  {transitioningAssetLabel === asset.label ? (
  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[9px]">
    <div className="absolute inset-y-0 left-[-30%] w-[42%] bg-gradient-to-r from-transparent via-sky-300/40 to-transparent blur-[12px] animate-[takeSweep_650ms_ease-out_forwards]" />

    <div className="absolute inset-0 border border-sky-200/42 shadow-[0_0_40px_rgba(56,189,248,0.42)]" />

    <div className="absolute inset-0 bg-sky-300/[0.08] animate-pulse" />
  </div>
) : null}
{transitioningAssetLabel === asset.label ? (
  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[9px]">
    <div className="absolute inset-y-0 left-[-30%] w-[42%] bg-gradient-to-r from-transparent via-sky-300/40 to-transparent blur-[12px] animate-[takeSweep_650ms_ease-out_forwards]" />

    <div className="absolute inset-0 border border-sky-200/42 shadow-[0_0_40px_rgba(56,189,248,0.42)]" />

    <div className="absolute inset-0 bg-sky-300/[0.08] animate-pulse" />
  </div>
) : null}
  {hoverPreviewing && asset.imageUrl ? (
  <div className="pointer-events-none absolute left-[72px] top-1 z-20 overflow-hidden rounded-[12px] border border-sky-300/22 bg-black/88 shadow-[0_18px_48px_rgba(0,0,0,0.48),0_0_30px_rgba(56,189,248,0.16)] backdrop-blur-xl">
    <img
      src={asset.imageUrl}
      alt=""
      className="h-[140px] w-[240px] object-cover"
    />

    <div className="border-t border-white/[0.05] px-3 py-2">
      <div className="truncate text-[10px] font-semibold tracking-[-0.02em] text-white/84">
        {asset.label}
      </div>

      <div className="mt-1 flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.08em] text-white/34">
        <span>{asset.meta}</span>
        <span>•</span>
        <span>{asset.route}</span>
      </div>
    </div>
  </div>
) : null}
</button>
                        )}
                      </div>

                      <div className="shrink-0">
                        <AssetStatePill state={asset.state} />
                      </div>
                    </div>

                    <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[6px] font-black uppercase tracking-[0.09em] text-white/24">
                      <span className="truncate">{asset.meta}</span>
                      <span>·</span>
                      <span className="truncate">{asset.route}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity duration-200 group-hover:opacity-100">
                    <div
                      className={`rounded-full border px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.08em] ${
                        destination === "PROGRAM"
                          ? "border-red-300/16 bg-red-400/[0.070] text-red-100/62"
                          : destination === "PREVIEW"
                            ? "border-sky-300/16 bg-sky-400/[0.080] text-sky-100/68"
                            : "border-white/[0.050] bg-black/20 text-white/36"
                      }`}
                    >
                      {destination === "PROGRAM"
                        ? "PGM"
                        : destination === "PREVIEW"
                          ? "PVW"
                          : "STBY"}
                    </div>

                    <button
                      type="button"
                      disabled={!assetIsImported}
                      onClick={(event) => {
                        event.stopPropagation()
                        onDeleteImportedAsset(asset.label)
                      }}
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-red-300/14 bg-red-400/[0.050] text-[10px] font-black leading-none text-red-100/58 transition hover:border-red-300/26 hover:bg-red-400/[0.11] hover:text-red-50 disabled:cursor-not-allowed disabled:opacity-20"
                    >
                      ×
                    </button>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden rounded-[18px] border border-white/[0.040] bg-[linear-gradient(180deg,rgba(8,12,22,0.96),rgba(2,5,11,0.995))] p-2 shadow-[0_0_32px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.020)]">
        <div className="flex h-[36px] items-center justify-between gap-2 border-b border-white/[0.040] pb-1.5">
          <div className="min-w-0">
            <div className="text-[7px] font-black uppercase tracking-[0.16em] text-sky-100/42">
              Preview Workstation
            </div>
            <div className="truncate text-[9px] font-semibold tracking-[-0.02em] text-white/72">
              {armedPreviewAsset?.label ?? "No asset armed"}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="rounded-full border border-sky-300/14 bg-sky-400/[0.060] px-2 py-0.5 text-[6px] font-black uppercase tracking-[0.10em] text-sky-100/56">
              1080p
            </div>
            <div className="rounded-full border border-white/[0.060] bg-black/24 px-2 py-0.5 text-[6px] font-black uppercase tracking-[0.10em] text-white/40">
              16:9
            </div>
          </div>
        </div>

        <div className="mt-1 overflow-hidden rounded-[10px] border border-sky-300/12 bg-black/30 p-0.5 shadow-[0_0_22px_rgba(56,189,248,0.08),inset_0_1px_0_rgba(255,255,255,0.012)]">
          <div className="relative h-[118px] overflow-hidden rounded-[8px] border border-white/[0.055] bg-[radial-gradient(circle_at_35%_25%,rgba(56,189,248,0.18),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))]">
            {armedPreviewAsset?.imageUrl ? (
  <img
    src={armedPreviewAsset.imageUrl}
                alt="Preview route asset"
                className="absolute inset-0 h-full w-full object-cover opacity-88"
              />
            ) : null}

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),transparent_32%,rgba(0,0,0,0.48))]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.10] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.14)_0px,rgba(255,255,255,0.14)_1px,transparent_1px,transparent_5px)]" />
            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full border border-sky-300/20 bg-sky-400/[0.095] px-2 py-0.5 text-[6px] font-black uppercase tracking-[0.10em] text-sky-100/72 shadow-[0_0_16px_rgba(56,189,248,0.13)]">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300 animate-pulse" />
              Armed Preview
            </div>
            <div className="absolute bottom-2 left-2 rounded-full border border-white/[0.070] bg-black/46 px-2 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] text-white/62">
              {armedPreviewAsset?.duration ?? "--:--"}
            </div>
            <div className="absolute bottom-2 right-2 rounded-full border border-sky-300/12 bg-sky-400/[0.055] px-2 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] text-sky-100/54">
              Ready
            </div>
          </div>
        </div>

        <div className="mt-1 grid grid-cols-3 gap-1 border-t border-white/[0.030] pt-1">
{[
  ["Duration", armedPreviewAsset?.duration ?? "--:--"],
  ["Route", armedPreviewAsset?.route ?? "PVW"],
  ["Take", armedPreviewAsset ? (armedPreviewAsset.takeSafe ? "Ready" : "Check") : "Idle"],
].map(([label, value]) => (
            <div key={label} className="rounded-[8px] border border-white/[0.040] bg-white/[0.014] px-2 py-1">
              <div className="text-[5.5px] font-black uppercase tracking-[0.11em] text-white/20">
                {label}
              </div>
              <div className="mt-0.5 truncate text-[7px] font-black uppercase tracking-[0.08em] text-white/50">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 grid-rows-[1fr_1fr_auto] gap-1">
<button
  type="button"
  disabled={!inspectedAsset}
  onClick={() => {
    if (!inspectedAsset) return

    setTransitioningAssetLabel(inspectedAsset.label)

    window.setTimeout(() => {
      setTransitioningAssetLabel(null)
      setProgramPulseLabel(inspectedAsset.label)
    }, 650)

    window.setTimeout(() => {
      setProgramPulseLabel((current) =>
        current === inspectedAsset.label ? null : current
      )
    }, 2400)

    onArmPreviewAsset(inspectedAsset.label)
  }}
  className="rounded-[11px] border border-sky-300/18 bg-sky-400/[0.095] px-2 py-2 text-center text-sky-100/78 shadow-[0_0_18px_rgba(56,189,248,0.10)] transition hover:border-sky-300/30 hover:bg-sky-400/[0.14] disabled:cursor-not-allowed disabled:opacity-30"
>
  <div className="text-[9px] font-black uppercase tracking-[0.10em]">Arm Preview</div>
  <div className="mt-0.5 text-[7px] font-semibold text-sky-100/42">Stage to preview</div>
</button>

        <button
          type="button"
          disabled
          className="rounded-[11px] border border-red-300/18 bg-red-400/[0.075] px-2 py-2 text-center text-red-100/54 opacity-80"
        >
          <div className="text-[9px] font-black uppercase tracking-[0.10em]">Take Live</div>
          <div className="mt-0.5 text-[7px] font-semibold text-red-100/34">Use TAKE strip</div>
        </button>

        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            disabled={!inspectedIsImported}
            onClick={() => inspectedAsset ? onEditImportedAsset(inspectedAsset.label) : undefined}
            className="rounded-[9px] border border-white/[0.050] bg-white/[0.016] px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.10em] text-white/48 transition hover:bg-white/[0.030] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Edit
          </button>

          <button
            type="button"
            disabled={!inspectedIsImported}
            onClick={() => inspectedAsset ? onDeleteImportedAsset(inspectedAsset.label) : undefined}
            className="rounded-[9px] border border-red-300/14 bg-red-400/[0.055] px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.10em] text-red-100/56 transition hover:bg-red-400/[0.095] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden rounded-[16px] border border-white/[0.045] bg-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
        <div className="flex h-[36px] items-center justify-between gap-2 border-b border-white/[0.040] px-2.5">
          <div className="text-[7px] font-black uppercase tracking-[0.16em] text-white/30">
            Inspector
          </div>
          <AssetStatePill state={inspectedAsset?.state ?? "STANDBY"} />
        </div>

        <div className="grid gap-0.5 p-2">
          {[
            ["Title", inspectedAsset?.label ?? "No Asset"],
            ["Type", inspectedAsset?.type ?? "—"],
            ["Meta", inspectedAsset?.meta ?? "—"],
            ["Scene", inspectedAsset?.linkedScene ?? "—"],
            ["Cache", inspectedAsset?.cacheState ?? "—"],
            ["Codec", inspectedAsset?.codecState ?? "—"],
            ["Played", inspectedAsset?.lastPlayed ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[48px_1fr] gap-2 border-b border-white/[0.025] pb-0.5 last:border-b-0">
              <div className="text-[6px] font-black uppercase tracking-[0.11em] text-white/20">
                {label}
              </div>
              <div className="truncate text-[8px] font-semibold tracking-[-0.01em] text-white/58">
                {value}
              </div>
            </div>
          ))}

          <div className="mt-1 h-[34px] overflow-hidden rounded-[8px] border border-white/[0.040] bg-black/22">
            {inspectedAsset?.imageUrl ? (
              <img
                src={inspectedAsset.imageUrl}
                alt="Inspector preview"
                className="h-full w-full object-cover opacity-76"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[7px] font-black uppercase tracking-[0.10em] text-white/24">
                No Thumbnail
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MediaTakeWorkspace({
  mediaRows,
  onPreload,
  onLockRoute,
  onRehearse,
  onReset,
}: {
  mediaRows: BroadcastAssetTelemetry[] 
  onPreload?: () => void
  onLockRoute?: () => void
  onRehearse?: () => void
  onReset?: () => void
}): JSX.Element {
  return (
    <div className="grid gap-2.5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-2.5">
        <ActiveTakeQueuePanel mediaRows={mediaRows} />
      </div>

      <div className="space-y-2.5">
        <div className="rounded-[16px] border border-white/[0.055] bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
                TAKE Controls
              </div>
              <div className="mt-1 text-[10px] font-medium tracking-[-0.01em] text-white/42">
                Preload, route lock, rehearsal, and reset actions
              </div>
            </div>

            <div className="rounded-full border border-red-300/14 bg-red-400/[0.055] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-red-100/56">
              Execution
            </div>
          </div>

          <OrchestrationCommandStrip
            onPreload={onPreload}
            onLockRoute={onLockRoute}
            onRehearse={onRehearse}
            onReset={onReset}
          />
        </div>

        <div className="rounded-[16px] border border-emerald-300/10 bg-emerald-400/[0.030] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100/42">
                Fallback Chain
              </div>
              <div className="mt-1 text-[10px] font-semibold tracking-[-0.01em] text-white/42">
                Recovery order if the current TAKE cannot complete.
              </div>
            </div>

            <div className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.050] px-2 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/52">
              Armed
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1">
            {[
              ["Primary", mediaRows.find((asset) => asset.destination === "PROGRAM")?.label ?? "Program"],
              ["Backup", mediaRows.find((asset) => asset.destination === "PREVIEW")?.label ?? "Preview"],
              ["Fallback", mediaRows.find((asset) => asset.destination === "STANDBY")?.label ?? "Standby"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[10px] border border-white/[0.045] bg-black/18 px-2 py-1.5 text-center"
              >
                <div className="text-[6px] font-black uppercase tracking-[0.10em] text-white/22">
                  {label}
                </div>
                <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.08em] text-white/48">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <OperatorConfidencePanel />
      </div>
    </div>
  )
}
function MediaRoutingWorkspace({
  mediaRows,
}: {
  mediaRows: BroadcastAssetTelemetry[]
}): JSX.Element {
  return (
    <div className="grid gap-2.5 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="space-y-2.5">
        <RouteMappingPanel mediaRows={mediaRows} />

        <div className="rounded-[16px] border border-white/[0.055] bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">
                Signal Path Summary
              </div>
              <div className="mt-1 text-[10px] font-medium tracking-[-0.01em] text-white/42">
                Current routing relationship between preview, program, standby, and music bus.
              </div>
            </div>

            <div className="rounded-full border border-sky-300/12 bg-sky-400/[0.050] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-sky-100/54">
              Engineering View
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[
              ["PVW", mediaRows.find((asset) => asset.destination === "PREVIEW")?.label ?? "Idle"],
              ["PGM", mediaRows.find((asset) => asset.destination === "PROGRAM")?.label ?? "Ready"],
              ["STBY", mediaRows.find((asset) => asset.destination === "STANDBY")?.label ?? "Clear"],
              ["MSC", mediaRows.find((asset) => asset.type === "audio")?.label ?? "Music Bus"],
            ].map(([code, value]) => (
              <div key={code} className="rounded-[9px] border border-white/[0.045] bg-white/[0.018] px-2 py-2 text-center">
                <div className="text-[7px] font-black uppercase tracking-[0.12em] text-sky-100/44">
                  {code}
                </div>
                <div className="mt-1 truncate text-[9px] font-semibold tracking-[-0.01em] text-white/56">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <TakeSafetyMatrix mediaRows={mediaRows} />
        <TransitionCompatibilityPanel mediaRows={mediaRows} />
      </div>
    </div>
  )
}
export default function BottomAssetDock({
  scenes,
  selectedSceneId,
  programSceneId,
  hotkeySceneId,
  previewBlocks,
  localMicLevel,
  recordingRoomName,
  onAddScene,
  onSaveScene,
  onAddMediaAssetToPreview,
  onUploadPdf,
  onSendSlideToPreview,
  onTakeSlide,
  onApplyScene,
  onDoubleClickScene,
  onDeleteScene,
  onRenameScene,
}: {
  scenes: SceneSummary[]
  selectedSceneId: string | null
  programSceneId: string | null
  programSlideLabel: string | null
  hotkeySceneId: string | null
  previewBlocks: PreviewBlock[]
  localMicLevel?: number
  recordingRoomName: string
  slideDeckName?: string | null
  slideCount?: number
  onAddScene?: () => void
  onSaveScene?: () => void
  onAddMediaAssetToPreview?: (block: PreviewBlock) => void
  onUploadPdf?: () => void
  onSendSlideToPreview?: (slideIndex: number) => void
  onTakeSlide?: (slideIndex: number) => void
  onApplyScene?: (sceneId: string) => void
  onDoubleClickScene?: (sceneId: string) => void
  onDeleteScene?: (sceneId: string) => void
  onRenameScene?: (sceneId: string, nextName: string) => void
}): JSX.Element {
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<UtilityPanel | null>(null)
  const [expandedMixerOpen, setExpandedMixerOpen] = useState(false)
  const [expandedRecordingOpen, setExpandedRecordingOpen] = useState(false)
  const [expandedMediaOpen, setExpandedMediaOpen] = useState(false)
  const mediaImportInputRef = useRef<HTMLInputElement | null>(null)
  const [importedMediaAssets, setImportedMediaAssets] = useState<BroadcastAssetTelemetry[]>([])
  const [activeMediaOrchestratorTab, setActiveMediaOrchestratorTab] = useState<MediaOrchestratorTab>("overview")
  const [selectedMediaAssetLabel, setSelectedMediaAssetLabel] = useState<string | null>(null)
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null)
  const [sceneNameDraft, setSceneNameDraft] = useState("")
  const [previewMediaAssetLabel, setPreviewMediaAssetLabel] = useState<string | null>(null)
  const [programMediaAssetLabel, setProgramMediaAssetLabel] = useState<string | null>(null)
  const [takeFlashAssetLabel, setTakeFlashAssetLabel] = useState<string | null>(null)
  const [takeFlashProgramLabel, setTakeFlashProgramLabel] = useState<string | null>(null)
  const [mediaRuntimeByLabel, setMediaRuntimeByLabel] = useState<Record<string, MediaAssetRuntimeState>>({})
  const [runtimePaused, setRuntimePaused] = useState(false)
  const [mediaRuntimeNowMs, setMediaRuntimeNowMs] = useState(Date.now())
useEffect(() => {
  if (!programMediaAssetLabel) return

  const interval = window.setInterval(() => {
    setMediaRuntimeNowMs(Date.now())
  }, 500)

  return () => window.clearInterval(interval)
}, [programMediaAssetLabel])
  const [editingMediaAssetLabel, setEditingMediaAssetLabel] = useState<string | null>(null)
const [mediaAssetEditDraft, setMediaAssetEditDraft] = useState<MediaAssetEditDraft>({
  label: "",
  linkedScene: "",
  segment: "",
  trigger: "",
})
  const [takeFlashActive, setTakeFlashActive] = useState(false)
function handleSendSelectedMediaAssetToPreview(): void {
  const targetLabel =
    selectedMediaAsset?.label ??
    selectedMediaAssetLabel ??
    orchestratedMediaRows[0]?.label ??
    mediaRows[0]?.label ??
    null

  if (!targetLabel) return

  setSelectedMediaAssetLabel(targetLabel)
  handleSelectMediaAssetForPreview(targetLabel)
}
function handleTakeAsset(): void {
  if (!previewMediaAssetLabel) return
setTakeFlashAssetLabel(previewMediaAssetLabel)
setTakeFlashProgramLabel(previewMediaAssetLabel)

window.setTimeout(() => {
  setTakeFlashAssetLabel(null)
}, 320)

window.setTimeout(() => {
  setTakeFlashProgramLabel(null)
}, 650)
  setProgramMediaAssetLabel(previewMediaAssetLabel)
  setPreviewMediaAssetLabel(null)
  setRuntimePaused(false)
  setMediaRuntimeByLabel((current) => ({
    ...current,
    [previewMediaAssetLabel]: {
      isPlaying: true,
      startedAtMs: Date.now(),
      elapsedSeconds: current[previewMediaAssetLabel]?.elapsedSeconds ?? 0,
    },
  }))
}
function handleResetProgramRuntime(): void {
  if (!programMediaAssetLabel) return

  const targetLabel = programMediaAssetLabel

  setRuntimePaused(false)
  setMediaRuntimeByLabel((current) => ({
    ...current,
    [targetLabel]: {
      isPlaying: false,
      startedAtMs: null,
      elapsedSeconds: 0,
    },
  }))
}
function handleSelectMediaAssetForPreview(label: string): void {
  const targetAsset =
    orchestratedMediaRows.find((asset) => asset.label === label) ??
    mediaRows.find((asset) => asset.label === label) ??
    null

  setPreviewMediaAssetLabel(label)

  if (programMediaAssetLabel === label) {
    setProgramMediaAssetLabel(null)
  }

  if (targetAsset && onAddMediaAssetToPreview) {
    const nextZIndex =
      previewBlocks.reduce((highest, block) => Math.max(highest, block.zIndex ?? 0), 0) + 1

    const blockType: PreviewBlock["type"] =
      targetAsset.type === "video" ? "video" : "image"

    onAddMediaAssetToPreview({
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: blockType,
      label: targetAsset.label,
      src: targetAsset.imageUrl ?? "",
      x: 12,
      y: 12,
      width: 76,
      height: 42.75,
      opacity: 1,
      zIndex: nextZIndex,
    })
  }

  setRuntimePaused(false)
}
  const [preloadedAssetLabels, setPreloadedAssetLabels] = useState<string[]>([])
  function handlePreloadAsset(): void {
    if (!selectedMediaAssetLabel) return

    setPreloadedAssetLabels((current) => {
      if (current.includes(selectedMediaAssetLabel)) {
        return current
      }

      return [...current, selectedMediaAssetLabel]
    })
  }

  function handleLockRoute(): void {
    if (!selectedMediaAssetLabel) return

    setPreviewMediaAssetLabel(selectedMediaAssetLabel)
  }
  function handleRehearseAsset(): void {
  if (!selectedMediaAssetLabel) return

  setPreviewMediaAssetLabel(selectedMediaAssetLabel)
  setPreloadedAssetLabels((current) => {
    if (current.includes(selectedMediaAssetLabel)) {
      return current
    }

    return [...current, selectedMediaAssetLabel]
  })
}

function handleResetMediaOrchestration(): void {
  setSelectedMediaAssetLabel(null)
  setPreviewMediaAssetLabel(null)
  setProgramMediaAssetLabel(null)
  setPreloadedAssetLabels([])
  setTakeFlashActive(false)
  setMediaRuntimeByLabel({})
  setMediaRuntimeByLabel({})
setRuntimePaused(false)
}
function createImportedMediaAsset(
  file: File,
  index: number,
): BroadcastAssetTelemetry {
  const importedAt = new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })

  const isImage = file.type.startsWith("image/")
  const isAudio = file.type.startsWith("audio/")
  const isVideo = file.type.startsWith("video/")
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")

  const type: BroadcastAssetType = isAudio
    ? "audio"
    : isImage || isPdf
      ? "graphic"
      : isVideo
        ? "video"
        : "graphic"

  return {
    label:
      file.name.replace(/\.[^/.]+$/, "") ||
      `Imported Asset ${index + 1}`,
    type,
    state: "PRELOADED",
    duration: type === "graphic" ? (isPdf ? "PDF" : "16:9") : "—",
    meta: `${formatFileSize(file.size)}`,
    route: "Imported",
    lastPlayed: "Not Played",
    linkedScene: "Unassigned",
    imageUrl: isImage ? URL.createObjectURL(file) : null,
    audioEmbedded: type === "video",
    destination: "STANDBY",
    takeSafe: true,
    cueOrder: index + 1,
    progress: 0,
    scheduledIn: "Imported",
    resetBehavior: "Manual",
    cacheState: "HOT",
    codecState: "OK",
    routeLock: false,
    hoverHint: `Imported at ${importedAt}`,
    takeCompatibility: "Clean",
    segment: "Imported",
    trigger: "Manual",
  }
}

function handleImportMediaFiles(
  event: ChangeEvent<HTMLInputElement>,
): void {
  const files = Array.from(event.target.files ?? [])

  if (!files.length) return

  setImportedMediaAssets((current) => [
    ...files.map((file, index) =>
      createImportedMediaAsset(
        file,
        current.length + index,
      ),
    ),
    ...current,
  ])

  event.target.value = ""
  setActiveMediaOrchestratorTab("assets")
  setExpandedMediaOpen(true)
}

function handleDeleteImportedAsset(label: string): void {
  setImportedMediaAssets((current) => {
    const removedAsset = current.find((asset) => asset.label === label)

    if (removedAsset?.imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(removedAsset.imageUrl)
    }

    return current.filter((asset) => asset.label !== label)
  })

  setPreloadedAssetLabels((current) =>
    current.filter((assetLabel) => assetLabel !== label)
  )

  if (selectedMediaAssetLabel === label) setSelectedMediaAssetLabel(null)
  if (previewMediaAssetLabel === label) setPreviewMediaAssetLabel(null)
  if (programMediaAssetLabel === label) setProgramMediaAssetLabel(null)
}
function handleRenameImportedAsset(oldLabel: string, requestedLabel: string): void {
  const baseLabel = requestedLabel.trim()

  if (!baseLabel || baseLabel === oldLabel) return

  let nextLabel = baseLabel
  let copyIndex = 2

  while (
    mediaRows.some(
      (asset) => asset.label === nextLabel && asset.label !== oldLabel,
    )
  ) {
    nextLabel = `${baseLabel} ${copyIndex}`
    copyIndex += 1
  }

  setImportedMediaAssets((current) =>
    current.map((asset) =>
      asset.label === oldLabel
        ? {
            ...asset,
            label: nextLabel,
            hoverHint: `Imported asset renamed from ${oldLabel}`,
          }
        : asset,
    ),
  )

  setPreloadedAssetLabels((current) =>
    current.map((label) => (label === oldLabel ? nextLabel : label)),
  )

  if (selectedMediaAssetLabel === oldLabel) setSelectedMediaAssetLabel(nextLabel)
  if (previewMediaAssetLabel === oldLabel) setPreviewMediaAssetLabel(nextLabel)
  if (programMediaAssetLabel === oldLabel) setProgramMediaAssetLabel(nextLabel)
}
function handleClearImportedAssets(): void {
  importedMediaAssets.forEach((asset) => {
    if (asset.imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(asset.imageUrl)
    }
  })

  const importedLabels = new Set(importedMediaAssets.map((asset) => asset.label))

  setImportedMediaAssets([])
  setPreloadedAssetLabels((current) =>
    current.filter((assetLabel) => !importedLabels.has(assetLabel))
  )

  if (selectedMediaAssetLabel && importedLabels.has(selectedMediaAssetLabel)) {
    setSelectedMediaAssetLabel(null)
  }

  if (previewMediaAssetLabel && importedLabels.has(previewMediaAssetLabel)) {
    setPreviewMediaAssetLabel(null)
  }

  if (programMediaAssetLabel && importedLabels.has(programMediaAssetLabel)) {
    setProgramMediaAssetLabel(null)
  }
}
  const [soloChannel, setSoloChannel] = useState<MixerChannelKey | null>(null)
  const [mutedChannels, setMutedChannels] = useState<Record<MixerChannelKey, boolean>>({
    Program: false,
    Stage: false,
    Music: false,
    Mics: false,
    SFX: false,
    Audience: false,
  })

  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle")
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null)
  const [recordingNow, setRecordingNow] = useState(Date.now())
  const [recordings, setRecordings] = useState<RecordingSession[]>([])
  const [recordingSource, setRecordingSource] = useState("Program Feed")
  const [recordingDestination, setRecordingDestination] = useState("Jupiter Cloud")
  const [recordingQuality, setRecordingQuality] = useState("1080p Standard")
  const [activeEgressId, setActiveEgressId] = useState<string | null>(null)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  function isImportedMediaAsset(label: string): boolean {
  return importedMediaAssets.some((asset) => asset.label === label)
}

function handleOpenMediaAssetEdit(label: string): void {
  const asset = importedMediaAssets.find((item) => item.label === label)

  if (!asset) return

  setEditingMediaAssetLabel(label)
  setMediaAssetEditDraft({
    label: asset.label,
    linkedScene: asset.linkedScene,
    segment: asset.segment ?? "Imported",
    trigger: asset.trigger ?? "Manual",
  })
}

function handleCloseMediaAssetEdit(): void {
  setEditingMediaAssetLabel(null)
  setMediaAssetEditDraft({
    label: "",
    linkedScene: "",
    segment: "",
    trigger: "",
  })
}

function handleSaveMediaAssetEdit(): void {
  if (!editingMediaAssetLabel) return

  const baseLabel = mediaAssetEditDraft.label.trim() || editingMediaAssetLabel
  let nextLabel = baseLabel
  let copyIndex = 2

  while (
    mediaRows.some(
      (asset) =>
        asset.label === nextLabel &&
        asset.label !== editingMediaAssetLabel
    )
  ) {
    nextLabel = `${baseLabel} ${copyIndex}`
    copyIndex += 1
  }

  setImportedMediaAssets((current) =>
    current.map((asset) =>
      asset.label === editingMediaAssetLabel
        ? {
            ...asset,
            label: nextLabel,
            linkedScene: mediaAssetEditDraft.linkedScene.trim() || "Unassigned",
            segment: mediaAssetEditDraft.segment.trim() || "Imported",
            trigger: mediaAssetEditDraft.trigger.trim() || "Manual",
            hoverHint: `Imported asset updated for ${mediaAssetEditDraft.trigger.trim() || "manual"} playback`,
          }
        : asset
    )
  )

  setPreloadedAssetLabels((current) =>
    current.map((label) => (label === editingMediaAssetLabel ? nextLabel : label))
  )

  if (selectedMediaAssetLabel === editingMediaAssetLabel) setSelectedMediaAssetLabel(nextLabel)
  if (previewMediaAssetLabel === editingMediaAssetLabel) setPreviewMediaAssetLabel(nextLabel)
  if (programMediaAssetLabel === editingMediaAssetLabel) setProgramMediaAssetLabel(nextLabel)

  handleCloseMediaAssetEdit()
}

function handleDeleteMediaAssetFromEdit(): void {
  if (!editingMediaAssetLabel) return

  handleDeleteImportedAsset(editingMediaAssetLabel)
  handleCloseMediaAssetEdit()
}

  function toggleSoloChannel(channel: MixerChannelKey): void {
    setSoloChannel((current) => (current === channel ? null : channel))
  }

  function toggleMutedChannel(channel: MixerChannelKey): void {
    setMutedChannels((current) => ({
      ...current,
      [channel]: !current[channel],
    }))
  }

  useEffect(() => {
    if (recordingStatus !== "recording") return

    const id = window.setInterval(() => {
      setRecordingNow(Date.now())
    }, 1000)

    return () => window.clearInterval(id)
  }, [recordingStatus])

  const recordingElapsedSeconds = recordingStartedAt
    ? Math.floor((recordingNow - recordingStartedAt) / 1000)
    : 0

  function armRecording(): void {
    if (recordingStatus === "recording" || recordingStatus === "starting") return
    setRecordingStatus("armed")
    setRecordingStartedAt(null)
  }

  async function startRecording(): Promise<void> {
    if (recordingStatus !== "armed") return

    setRecordingError(null)
    setRecordingStatus("starting")

    try {
      const response = await fetch("/api/livekit/recording/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: recordingRoomName,
          source: recordingSource,
          destination: recordingDestination,
          quality: recordingQuality,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to start recording")
      }

      const startedAt = Date.now()

      setActiveEgressId(data.egressId ?? null)
      setRecordingStartedAt(startedAt)
      setRecordingNow(startedAt)
      setRecordingStatus("recording")

      setRecordings((current) => [
        {
          id: `active-${startedAt}`,
          label: `Program Recording ${current.length + 1}`,
          startedAt: new Date(startedAt).toISOString(),
          endedAt: null,
          durationSeconds: 0,
          source: recordingSource,
          destination: recordingDestination,
          quality: recordingQuality,
          egressId: data.egressId ?? null,
          file: data.file ?? null,
          location: null,
          size: null,
          status: "recording",
        },
        ...current,
      ])
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : "Unknown recording start error")
      setRecordingStatus("idle")
    }
  }

  async function pollRecordingStatus(egressId: string): Promise<void> {
    const maxAttempts = 20

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000))

      const response = await fetch("/api/livekit/recording/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ egressId }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to check recording status")
      }

      if (!data.terminal) continue

      const finalStatus = Number(data.status)
      const ready = finalStatus === 3 && data.size !== "0"

      setRecordings((current) =>
        current.map((recording) => {
          if (recording.egressId !== egressId) return recording

          return {
            ...recording,
            file: data.file ?? recording.file ?? null,
            location: data.location ?? null,
            size: data.size ?? null,
            status: ready ? "ready" : "failed",
          }
        })
      )

      if (!ready) {
        setRecordingError(data.error ?? "Recording finalized without a usable file")
      }

      return
    }

    setRecordingError("Recording is still finalizing. Check S3 or LiveKit egress status again shortly.")
  }

  async function stopRecording(): Promise<void> {
    if (recordingStatus !== "recording" || !recordingStartedAt) return

    setRecordingError(null)

    try {
      const stoppedEgressId = activeEgressId

      if (stoppedEgressId) {
        const response = await fetch("/api/livekit/recording/stop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            egressId: stoppedEgressId,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Failed to stop recording")
        }
      }

      const endedAt = Date.now()
      const durationSeconds = Math.max(1, Math.floor((endedAt - recordingStartedAt) / 1000))

      setRecordings((current) =>
        current.map((recording) => {
          if (recording.status !== "recording") return recording

          return {
            ...recording,
            endedAt: new Date(endedAt).toISOString(),
            durationSeconds,
            status: "processing",
          }
        })
      )

      setRecordingStatus("stopped")
      setRecordingStartedAt(null)
      setActiveEgressId(null)
      if (stoppedEgressId) {
        void pollRecordingStatus(stoppedEgressId).catch((error) => {
          setRecordingError(error instanceof Error ? error.message : "Unknown recording finalization error")
        })
      }
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : "Unknown recording stop error")
    }
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

const mediaItems: DockAssetRecord[] = media.map((block) => ({ ...block, category: "media" }))

  const activeSceneIds = new Set([selectedSceneId, programSceneId, hotkeySceneId].filter(Boolean))
const sceneList = scenes.slice(0, 8)

  const mediaRows: BroadcastAssetTelemetry[] = importedMediaAssets.length
  ? importedMediaAssets
  : mediaItems.map((item, index) =>
      blockToBroadcastAsset(item, item.label || `Media Asset ${index + 1}`, index),
    )


  const selectedMediaAsset =
  mediaRows.find((asset) => asset.label === selectedMediaAssetLabel) ?? mediaRows[0] ?? null


const orchestratedMediaRows: BroadcastAssetTelemetry[] = mediaRows.map((asset) => {
  const isPreloaded = preloadedAssetLabels.includes(asset.label)
  const isProgram = asset.label === programMediaAssetLabel
  const isPreview = asset.label === previewMediaAssetLabel
  const runtime = mediaRuntimeByLabel[asset.label]

const runtimeElapsedSeconds =
  runtime?.isPlaying && runtime.startedAtMs
    ? runtime.elapsedSeconds +
      (runtimePaused
        ? 0
        : Math.floor((mediaRuntimeNowMs - runtime.startedAtMs) / 1000))
    : runtime?.elapsedSeconds ?? 0
    ? runtime.elapsedSeconds +
      Math.floor((mediaRuntimeNowMs - runtime.startedAtMs) / 1000)
    : runtime?.elapsedSeconds ?? 0

const runtimeDurationSeconds = parseRuntimeDurationSeconds(asset.duration)

const runtimeProgress = runtimeDurationSeconds
  ? Math.min(
      100,
      Math.round((runtimeElapsedSeconds / runtimeDurationSeconds) * 100),
    )
  : asset.type === "live"
    ? 100
    : asset.progress ?? 0

  if (isProgram) {
    return {
      ...asset,
      destination: "PROGRAM" as const,
      state: "LIVE" as BroadcastAssetState,
      route: "PGM",
    progress: runtimeProgress,
scheduledIn:
  asset.type === "live"
    ? "Live now"
    : `${formatRuntimeClock(runtimeElapsedSeconds)} elapsed`,
    lastPlayed:
  runtimeElapsedSeconds > 0
    ? formatRuntimeClock(runtimeElapsedSeconds)
    : "Starting",
      routeLock: true,
      cueOrder: 1,
    }
  }

  if (isPreview) {
    return {
      ...asset,
      destination: "PREVIEW" as const,
      state: "CUED" as BroadcastAssetState,
      route: "PVW",
      scheduledIn: "Next TAKE",
      progress: 0,
      routeLock: true,
      cueOrder: 2,
    }
  }

  return {
    ...asset,
    destination: "STANDBY" as const,
    state: isPreloaded
  ? "PRELOADED"
  : asset.state === "LIVE"
    ? "READY"
    : asset.state,
    route: "Standby",
    cueOrder: 3,
    cacheState: isPreloaded ? "HOT" : asset.cacheState,
  }
}).sort((a, b) => (a.cueOrder ?? 99) - (b.cueOrder ?? 99))
const previewMediaAsset =
  orchestratedMediaRows.find((asset) => asset.label === previewMediaAssetLabel) ?? null


  const assetTabStats = [
    ["All", mediaRows.length],
    ["Graphics", mediaRows.filter((asset) => asset.type === "graphic").length],
    ["Videos", mediaRows.filter((asset) => asset.type === "video").length],
    ["Audio", mediaRows.filter((asset) => asset.type === "audio").length],
  ] as const
  const channelLevels = useMemo<Record<MixerChannelKey, number>>(
    () => ({
      Program: programLevel,
      Stage: stageLevel,
      Music: musicLevel,
      Mics: micLevelPercent,
      SFX: sfxLevel,
      Audience: audienceLevel,
    }),
    [audienceLevel, micLevelPercent, musicLevel, programLevel, sfxLevel, stageLevel]
  )

  const [peakLevels, setPeakLevels] = useState<Record<MixerChannelKey, number>>({
    Program: 2,
    Stage: 2,
    Music: 2,
    Mics: 2,
    SFX: 2,
    Audience: 2,
  })

  useEffect(() => {
    setPeakLevels((current) => ({
      Program: Math.max(channelLevels.Program, current.Program - 1.6),
      Stage: Math.max(channelLevels.Stage, current.Stage - 1.6),
      Music: Math.max(channelLevels.Music, current.Music - 1.2),
      Mics: Math.max(channelLevels.Mics, current.Mics - 1.8),
      SFX: Math.max(channelLevels.SFX, current.SFX - 1.2),
      Audience: Math.max(channelLevels.Audience, current.Audience - 1.0),
    }))
  }, [channelLevels])

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(7,12,22,0.96),rgba(3,6,12,1))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.010] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.020)_0px,rgba(255,255,255,0.020)_1px,transparent_1px,transparent_28px)]" />
      {activeUtilityPanel ? (
        <UtilityOverlay
          activePanel={activeUtilityPanel}
          recordingStatus={recordingStatus}
          recordingElapsedSeconds={recordingElapsedSeconds}
          recordings={recordings}
          onArmRecording={armRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
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
          peakLevels={peakLevels}
          onToggleSolo={toggleSoloChannel}
          onToggleMute={toggleMutedChannel}
          onClose={() => setExpandedMixerOpen(false)}
        />
      ) : null}
      {expandedRecordingOpen ? (
        <ExpandedRecordingOverlay
          recordingStatus={recordingStatus}
          recordingElapsedSeconds={recordingElapsedSeconds}
          recordings={recordings}
          recordingSource={recordingSource}
          recordingDestination={recordingDestination}
          recordingQuality={recordingQuality}
          recordingError={recordingError}
          onRecordingSourceChange={setRecordingSource}
          onRecordingDestinationChange={setRecordingDestination}
          onRecordingQualityChange={setRecordingQuality}
          onArmRecording={armRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onClose={() => setExpandedRecordingOpen(false)}
        />
      ) : null}
      {expandedMediaOpen ? (
        <div className="fixed inset-x-5 bottom-5 z-[999] h-[382px] overflow-hidden rounded-[24px] border border-sky-200/16 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(14,165,233,0.08),transparent_28%),linear-gradient(180deg,rgba(6,11,22,0.992),rgba(2,5,11,0.998))] shadow-[0_28px_90px_rgba(0,0,0,0.58),0_0_34px_rgba(56,189,248,0.10),inset_0_1px_0_rgba(255,255,255,0.050)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.030)_0px,rgba(255,255,255,0.030)_1px,transparent_1px,transparent_32px)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/24 to-transparent" />

          <div className="relative z-10 flex h-[54px] items-center justify-between gap-3 border-b border-white/[0.055] px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-sky-300/14 bg-sky-400/[0.070] text-[10px] font-black uppercase tracking-[0.08em] text-sky-100/70 shadow-[0_0_18px_rgba(56,189,248,0.10)]">
                EVS
              </div>

              <div className="min-w-0">
                <div className="text-[7px] font-black uppercase tracking-[0.18em] text-sky-100/44">
                  Broadcast Asset Orchestrator
                </div>
                <div className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.045em] text-white/90">
                  Playback Workstation
                </div>
              </div>
            </div>

            <div className="hidden min-w-0 flex-1 items-center gap-1.5 px-3 xl:flex">
              {[
                ["Inventory", `${orchestratedMediaRows.length}`],
                ["Preview", previewMediaAssetLabel ?? "Idle"],
                ["Program", programMediaAssetLabel ?? "Clear"],
                ["Safe", `${orchestratedMediaRows.filter((asset) => asset.takeSafe !== false).length}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex min-w-0 flex-1 items-center justify-between rounded-full border border-white/[0.040] bg-white/[0.014] px-2 py-1"
                >
                  <span className="text-[6px] font-black uppercase tracking-[0.11em] text-white/22">
                    {label}
                  </span>
                  <span className="truncate text-[7px] font-black uppercase tracking-[0.08em] text-white/54">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => mediaImportInputRef.current?.click()}
                className="rounded-full border border-emerald-300/14 bg-emerald-400/[0.055] px-3 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-emerald-100/62 transition hover:border-emerald-300/24 hover:bg-emerald-400/[0.090] hover:text-emerald-50"
              >
                Import
              </button>

              <button
                type="button"
                onClick={() => setExpandedMediaOpen(false)}
                className="rounded-full border border-white/[0.08] bg-white/[0.030] px-3 py-1 text-[8px] font-black uppercase tracking-[0.10em] text-white/58 transition hover:bg-white/[0.055] hover:text-white/82"
              >
                Close
              </button>
            </div>
          </div>

          <div className="relative z-10 flex h-[38px] items-center justify-between gap-3 border-b border-white/[0.040] px-4">
            <div className="flex items-center gap-1">
              {[
  ["assets", "Assets"],
  ["take", "TAKE"],
  ["routing", "Routing"],
  ["overview", "Overview"],
].map(([id, label]) => {
                const active = activeMediaOrchestratorTab === id

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveMediaOrchestratorTab(id as MediaOrchestratorTab)}
                    className={`rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.10em] transition ${
                      active
                        ? "border-sky-300/20 bg-sky-400/[0.095] text-sky-100/80 shadow-[0_0_16px_rgba(56,189,248,0.10)]"
                        : "border-white/[0.040] bg-black/14 text-white/38 hover:border-white/[0.075] hover:bg-white/[0.025] hover:text-white/68"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {[
                ["Countdown", "USED"],
                ["Host Intro", "LIVE"],
                ["Keynote", "NEXT"],
                ["Closing", "SAFE"],
              ].map(([label, state]) => (
                <div
                  key={label}
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] ${
                    state === "LIVE"
                      ? "border-red-300/16 bg-red-400/[0.055] text-red-100/64"
                      : state === "NEXT"
                        ? "border-sky-300/16 bg-sky-400/[0.055] text-sky-100/64"
                        : state === "SAFE"
                          ? "border-emerald-300/12 bg-emerald-400/[0.045] text-emerald-100/50"
                          : "border-white/[0.045] bg-black/20 text-white/34"
                  }`}
                >
                  {label} · {state}
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 h-[290px] overflow-hidden p-3">
            <div className="mb-2 flex h-[30px] items-center gap-2 rounded-[12px] border border-sky-300/10 bg-sky-400/[0.018] px-2">
              <div className="min-w-0 pr-2">
                <div className="text-[6px] font-black uppercase tracking-[0.16em] text-sky-100/30">
                  Selected Asset
                </div>
                <div className="truncate text-[9px] font-semibold tracking-[-0.02em] text-white/72">
                  {selectedMediaAsset?.label ?? "Select an asset"}
                </div>
              </div>

              <AssetStatePill state={selectedMediaAsset?.state ?? "STANDBY"} />

              <div className="ml-auto grid min-w-[650px] grid-cols-5 gap-1">
                <button type="button" onClick={handleSendSelectedMediaAssetToPreview} className="rounded-[7px] border border-sky-300/14 bg-sky-400/[0.075] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-sky-100/72">
                  ARM PVW
                </button>
                <button type="button" disabled={!selectedMediaAsset} onClick={() => selectedMediaAsset ? setProgramMediaAssetLabel(selectedMediaAsset.label) : undefined} className="rounded-[7px] border border-red-300/14 bg-red-400/[0.060] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-red-100/62 disabled:opacity-35">
                  PGM DIRECT
                </button>
                <button type="button" disabled={!previewMediaAssetLabel} onClick={handleTakeAsset} className="rounded-[7px] border border-emerald-300/14 bg-emerald-400/[0.060] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/62 disabled:opacity-35">
                  TAKE
                </button>
                <button type="button" onClick={() => setRuntimePaused((current) => !current)} disabled={!programMediaAssetLabel} className="rounded-[7px] border border-emerald-300/16 bg-emerald-400/[0.070] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/68 disabled:opacity-35">
                  {runtimePaused ? "RESUME" : "PAUSE"}
                </button>
                <button type="button" onClick={handleResetProgramRuntime} disabled={!programMediaAssetLabel} className="rounded-[7px] border border-red-300/14 bg-red-400/[0.055] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] text-red-100/60 disabled:opacity-35">
                  RESET
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-hidden">
              {activeMediaOrchestratorTab === "overview" ? (
                <MediaOverviewWorkspace mediaRows={orchestratedMediaRows} />
              ) : activeMediaOrchestratorTab === "assets" ? (
                <MediaAssetsWorkspace
                  mediaRows={orchestratedMediaRows}
                  assetTabStats={assetTabStats}
                  selectedMediaAsset={selectedMediaAsset}
previewMediaAsset={previewMediaAsset}
onSelectAsset={setSelectedMediaAssetLabel}
                  onArmPreviewAsset={handleSelectMediaAssetForPreview}
                  onEditImportedAsset={handleOpenMediaAssetEdit}
                  onDeleteImportedAsset={handleDeleteImportedAsset}
                  isImportedAsset={isImportedMediaAsset}
                  onRenameImportedAsset={handleRenameImportedAsset}
                  takeFlashAssetLabel={takeFlashAssetLabel}
                  takeFlashProgramLabel={takeFlashProgramLabel}
                  
                />
              ) : activeMediaOrchestratorTab === "routing" ? (
                <MediaRoutingWorkspace mediaRows={orchestratedMediaRows} />
              ) : activeMediaOrchestratorTab === "take" ? (
                <MediaTakeWorkspace
                  mediaRows={orchestratedMediaRows}
                  onPreload={handlePreloadAsset}
                  onLockRoute={handleLockRoute}
                  onRehearse={handleRehearseAsset}
                  onReset={handleResetMediaOrchestration}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="relative z-10 grid min-h-0 flex-1 gap-2 overflow-hidden pb-2 xl:grid-cols-[0.72fr_2.85fr_1.05fr]">
<ConsolePanel
  title="Scenes"
  action={
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onSaveScene}
        disabled={!onSaveScene}
        className="rounded-full border border-emerald-300/14 bg-emerald-400/[0.060] px-2 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/62 transition hover:border-emerald-300/24 hover:bg-emerald-400/[0.10] disabled:cursor-not-allowed disabled:opacity-35"
      >
        Save
      </button>

      <button
        type="button"
        onClick={onAddScene}
        disabled={!onAddScene}
        className="rounded-full border border-white/[0.055] bg-white/[0.020] px-2 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-white/46 transition hover:border-white/[0.085] hover:bg-white/[0.035] disabled:cursor-not-allowed disabled:opacity-35"
      >
        New
      </button>
    </div>
  }
>
  <div className="grid min-h-0 gap-2">
    {sceneList.length ? (
      <div className="grid gap-1">
        {sceneList.map((scene, index) => {
  const active = activeSceneIds.has(scene.id)

  return (
            <button
              key={scene.id}
              type="button"
              onClick={() => onApplyScene?.(scene.id)}
              onDoubleClick={() => onDoubleClickScene?.(scene.id)}
              className={`grid grid-cols-[22px_1fr_auto_20px] items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left transition ${
                active
                  ? "border-sky-300/24 bg-sky-400/[0.095] text-white shadow-[0_0_18px_rgba(56,189,248,0.10)]"
                  : "border-white/[0.045] bg-white/[0.014] text-white/62 hover:border-white/[0.075] hover:bg-white/[0.026]"
              }`}
            >
{editingSceneId === scene.id ? (
  <input
    autoFocus
    value={sceneNameDraft}
    onClick={(event) => event.stopPropagation()}
    onChange={(event) => setSceneNameDraft(event.target.value)}
    onBlur={() => {
      const trimmed = sceneNameDraft.trim()

      if (trimmed) {
        onRenameScene?.(scene.id, trimmed)
      }

      setEditingSceneId(null)
      setSceneNameDraft("")
    }}
    onKeyDown={(event) => {
      if (event.key === "Escape") {
        setEditingSceneId(null)
        setSceneNameDraft("")
      }

      if (event.key === "Enter") {
        event.preventDefault()

        const trimmed = sceneNameDraft.trim()

        if (trimmed) {
          onRenameScene?.(scene.id, trimmed)
        }

        setEditingSceneId(null)
        setSceneNameDraft("")
      }
    }}
    className="min-w-0 rounded-[6px] border border-sky-300/18 bg-black/28 px-1.5 py-1 text-[10px] font-semibold tracking-[-0.02em] text-white/88 outline-none"
  />
) : (
  <span
    onDoubleClick={(event) => {
      event.stopPropagation()
      setEditingSceneId(scene.id)
      setSceneNameDraft(scene.name)
    }}
    className="truncate rounded-[6px] px-1 -mx-1 text-[10px] font-semibold tracking-[-0.02em] transition hover:bg-sky-300/[0.08]"
  >
    {scene.name}
  </span>
)}

              <span className="truncate text-[10px] font-semibold tracking-[-0.02em]">
                {scene.name}
              </span>

              {programSceneId === scene.id ? (
                <span className="rounded-full border border-red-300/14 bg-red-400/[0.070] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.08em] text-red-100/58">
                  PGM
                </span>
              ) : selectedSceneId === scene.id ? (
                <span className="rounded-full border border-sky-300/14 bg-sky-400/[0.070] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.08em] text-sky-100/58">
                  PVW
                </span>
              ) : null}
              <span
  role="button"
  tabIndex={0}
  aria-label={`Delete scene ${scene.name}`}
  onClick={(event) => {
    event.stopPropagation()
    onDeleteScene?.(scene.id)
  }}
  onKeyDown={(event) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    event.stopPropagation()
    onDeleteScene?.(scene.id)
  }}
  className="flex h-5 w-5 items-center justify-center rounded-full border border-red-300/12 bg-red-400/[0.045] text-[11px] font-black leading-none text-red-100/42 opacity-55 transition hover:border-red-300/24 hover:bg-red-400/[0.10] hover:text-red-50 hover:opacity-100"
>
  ×
</span>
            </button>
          )
        })}
      </div>
    ) : (
      <div className="rounded-[12px] border border-white/[0.045] bg-white/[0.014] p-3 text-[10px] leading-relaxed text-white/42">
        No saved scenes yet. Build the preview canvas, then press{" "}
        <span className="font-black text-emerald-100/60">Save</span>.
      </div>
    )}

    <div className="grid grid-cols-2 gap-1">
      <button
        type="button"
        onClick={onSaveScene}
        disabled={!onSaveScene}
        className="rounded-[10px] border border-emerald-300/14 bg-emerald-400/[0.055] px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] text-emerald-100/62 transition hover:border-emerald-300/24 hover:bg-emerald-400/[0.10] disabled:cursor-not-allowed disabled:opacity-35"
      >
        Save Current
      </button>

      <button
        type="button"
        onClick={onAddScene}
        disabled={!onAddScene}
        className="rounded-[10px] border border-sky-300/14 bg-sky-400/[0.055] px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] text-sky-100/62 transition hover:border-sky-300/24 hover:bg-sky-400/[0.10] disabled:cursor-not-allowed disabled:opacity-35"
      >
        New Scene
      </button>
    </div>
  </div>
</ConsolePanel>

<ConsolePanel
  title="Media"
  action={
    <div className="flex items-center gap-1">
      <input
        ref={mediaImportInputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*,application/pdf"
        className="hidden"
        onChange={handleImportMediaFiles}
      />

      <button
        type="button"
        onClick={() => mediaImportInputRef.current?.click()}
        className="rounded-full border border-emerald-300/14 bg-emerald-400/[0.050] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-emerald-100/58 transition hover:border-emerald-300/24 hover:bg-emerald-400/[0.090] hover:text-emerald-50"
      >
        Import
      </button>

      <button
        type="button"
        onClick={() => {
  setActiveMediaOrchestratorTab("assets")
  setExpandedMediaOpen(true)
}}
        className="rounded-full border border-sky-300/14 bg-sky-400/[0.055] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-sky-100/58 transition hover:border-sky-300/24 hover:bg-sky-400/[0.090] hover:text-sky-50"
      >
        Expand
      </button>
    </div>
  }
>
          <div>
            <AssetIntelligenceHeader mediaRows={mediaRows} />
            <SourceConfidenceStrip mediaRows={mediaRows} />

            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {assetTabStats.map(([tab, count], index) => (
                  <button
                    key={tab}
                    type="button"
                    className={`flex items-center gap-1 rounded-[9px] px-2 py-1 text-[9px] font-semibold transition ${
                      index === 0
                        ? "border border-sky-300/12 bg-sky-400/[0.12] text-sky-100"
                        : "border border-white/[0.035] text-sky-100/52 hover:bg-white/[0.030] hover:text-white/76"
                    }`}
                  >
                    <span>{tab}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[6px] font-black tabular-nums ${index === 0 ? "bg-sky-200/12 text-sky-50/58" : "bg-white/[0.035] text-white/28"}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 rounded-full border border-emerald-300/12 bg-emerald-400/[0.045] px-2 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/46">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-200/60 shadow-[0_0_8px_rgba(167,243,208,0.26)]" />
                <span>Rundown Linked</span>
              </div>
            </div>

<div className="grid grid-cols-3 gap-2 2xl:grid-cols-4">
  {mediaRows.slice(0, 4).map((asset) => (
    <MediaRow
      key={`${asset.label}-${asset.state}-${asset.type}`}
      asset={asset}
    />
  ))}
</div>

{importedMediaAssets.length > 0 ? (
  <div className="mt-2 rounded-[10px] border border-emerald-300/12 bg-emerald-400/[0.040] px-3 py-2">
    <div className="flex items-center justify-between">
      <span className="text-[8px] font-black uppercase tracking-[0.10em] text-emerald-100/52">
        Imported Assets
      </span>

      <span className="text-[8px] font-black uppercase tracking-[0.10em] text-emerald-100/52">
        {importedMediaAssets.length}
      </span>
    </div>

    <div className="mt-1 text-[9px] text-white/48">
      Latest: {importedMediaAssets[0]?.label}
    </div>
  </div>
) : null}

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[
                ["Preview", "Armed"],
                ["TAKE", "Safe"],
                ["Open", "Orchestrator"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[9px] border border-white/[0.045] bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.010))] px-2 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
                  <div className="text-[7px] font-black uppercase tracking-[0.11em] text-white/24">{label}</div>
                  <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-white/54">{value}</div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setExpandedMediaOpen(true)}
              className="mt-2 flex w-full items-center justify-between rounded-[10px] border border-sky-300/10 bg-sky-400/[0.035] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.09em] text-sky-100/58 transition hover:border-sky-300/18 hover:bg-sky-400/[0.060] hover:text-sky-50/78"
            >
              <span>{importedMediaAssets.length > 0 ? `${importedMediaAssets.length} Imported · Open Orchestrator` : "Open Asset Orchestrator"}</span>
              <span className="text-sky-100/38">⌘ Shift A</span>
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
                  audible={channelIsAudible({ label, muted: mutedChannels[label], soloChannel })}
                  peakLevel={peakLevels[label]}
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


      </div>

      <div className="relative z-20 mt-1.5 grid shrink-0 gap-1.5 border-t border-white/[0.045] pt-1.5 xl:grid-cols-[1fr_1fr_1fr_1.4fr_1.15fr_1fr_1fr]">
        <UtilityButton
          icon={<CircleDot size={18} />}
          label={recordingStatus === "recording" ? "Recording" : recordingStatus === "starting" ? "Starting" : "Record"}
meta={recordingStatus === "recording" ? formatRecordingDuration(recordingElapsedSeconds) : recordingStatus === "starting" ? "Requesting egress" : recordingStatus === "armed" ? "Armed" : recordingStatus === "stopped" ? "Finalizing" : "Egress Ready"}
danger={recordingStatus === "recording" || recordingStatus === "starting"}
          onClick={() => setExpandedRecordingOpen(true)}
        />
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

function ExpandedRecordingOverlay({
  recordingStatus,
  recordingElapsedSeconds,
  recordings,
  recordingSource,
  recordingDestination,
  recordingQuality,
  recordingError,
  onRecordingSourceChange,
  onRecordingDestinationChange,
  onRecordingQualityChange,
  onArmRecording,
  onStartRecording,
  onStopRecording,
  onClose,
}: {
  recordingStatus: RecordingStatus
  recordingElapsedSeconds: number
  recordings: RecordingSession[]
  recordingSource: string
  recordingDestination: string
  recordingQuality: string
  recordingError: string | null
  onRecordingSourceChange: (value: string) => void
  onRecordingDestinationChange: (value: string) => void
  onRecordingQualityChange: (value: string) => void
  onArmRecording: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onClose: () => void
}): JSX.Element {
  const isArmed = recordingStatus === "armed"
  const isStarting = recordingStatus === "starting"
  const isRecording = recordingStatus === "recording"
  const latestRecording = recordings[0]
  const latestRecordingStatus =
  latestRecording?.status === "ready"
    ? "Uploaded"
    : latestRecording?.status === "processing"
      ? "Finalizing"
      : latestRecording?.status === "failed"
        ? "Failed"
        : latestRecording?.status === "recording"
          ? "Recording"
          : "Standby"

  const latestRecordingLocation =
  latestRecording?.location
    ? latestRecording.location.split("/").slice(-2).join("/")
    : "Awaiting upload"

  const latestRecordingSize =
  latestRecording?.size && latestRecording.size !== "0"
    ? `${Number(latestRecording.size).toLocaleString()} bytes`
    : "Pending"
  const recordingSourceOptions: RecordingSourceOption[] = [
    {
      id: "program-feed",
      label: "Program Feed",
      type: "program",
      status: isRecording || isStarting ? "live" : "ready",
      description: "Final audience-facing mix with graphics and program audio.",
    },
    {
      id: "preview-feed",
      label: "Preview Feed",
      type: "preview",
      status: "ready",
      description: "Next prepared look before TAKE. Useful for rehearsal captures.",
    },
    {
      id: "screen-share",
      label: "Screen Share",
      type: "iso",
      status: "standby",
      description: "Dedicated screen-share capture path when a presenter is sharing.",
    },
    {
      id: "graphics-clean",
      label: "Graphics Clean Feed",
      type: "clean",
      status: "ready",
      description: "Program-adjacent capture without audience interaction layers.",
    },
    {
      id: "audience-return",
      label: "Audience Return",
      type: "return",
      status: "standby",
      description: "Audience Q&A, moderated participation, or future return audio/video.",
    },
    {
      id: "presenter-host",
      label: "Host ISO",
      type: "iso",
      status: "ready",
      description: "Isolated presenter camera/mic source for post-show editing.",
    },
  ]

  const pipelineStage = isRecording
  ? "Capturing"
  : isStarting
    ? "Starting"
    : recordingStatus === "stopped"
      ? "Processing"
      : isArmed
        ? "Armed"
        : "Idle"

  const encoderStatus = isRecording
  ? "Capturing"
  : isStarting
    ? "Requesting LiveKit egress"
    : isArmed
      ? "Ready to request"
      : recordingStatus === "stopped"
        ? "Packaging"
        : "Standby"

  const estimatedBitrate =
    recordingQuality === "4K Future"
      ? "18 Mbps"
      : recordingQuality === "1080p Standard"
        ? "6 Mbps"
        : "2.5 Mbps"

  const estimatedOutput = recordingElapsedSeconds > 0
    ? `${Math.max(1, Math.round((recordingElapsedSeconds * (recordingQuality === "4K Future" ? 18 : recordingQuality === "1080p Standard" ? 6 : 2.5)) / 8))} MB est.`
    : "—"

  const preflightChecks = [
    {
      label: "Program source ready",
      status: recordingSource.length > 0,
      detail: recordingSource,
    },
    {
      label: "Destination selected",
      status: recordingDestination.length > 0,
      detail: recordingDestination,
    },
    {
      label: "Quality profile valid",
      status: recordingQuality !== "",
      detail: recordingQuality,
    },
    {
  label: "Egress provider",
  status: true,
  detail: "LiveKit configured",
},
{
  label: "Storage target",
  status: true,
  detail: "S3 connected",
},
  ]

  const passedPreflightChecks = preflightChecks.filter((check) => check.status).length
  return (
    <div className="fixed inset-x-6 bottom-4 top-[86px] z-[999] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-[24px] border border-red-200/16 bg-[radial-gradient(circle_at_20%_0%,rgba(248,113,113,0.15),transparent_34%),radial-gradient(circle_at_84%_10%,rgba(251,191,36,0.08),transparent_28%),linear-gradient(180deg,rgba(18,8,10,0.985),rgba(4,5,10,0.998))] shadow-[0_34px_110px_rgba(0,0,0,0.72),0_0_42px_rgba(248,113,113,0.10),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.030)_0px,rgba(255,255,255,0.030)_1px,transparent_1px,transparent_32px)]" />

      <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/[0.065] px-5 py-4">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-red-100/58">
            Program Recording
          </div>
          <div className="mt-1 text-[24px] font-semibold tracking-[-0.055em] text-white/92">
            Recording Console
          </div>
          <div className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/46">
            LiveKit egress recording, runtime, saved session tracking, and S3 finalization status.
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

      <div className="relative z-10 grid min-h-0 items-start gap-4 p-5 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="min-h-0 rounded-[18px] border border-white/[0.065] bg-white/[0.024] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-white/42">
                Status
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span
                  className={`h-3.5 w-3.5 rounded-full ${
isRecording
  ? "animate-pulse bg-red-400 shadow-[0_0_22px_rgba(248,113,113,0.62)]"
  : isStarting
    ? "animate-pulse bg-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.50)]"
    : isArmed
      ? "bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.42)]"
      : "bg-white/22"
                  }`}
                />
                <div className="text-[34px] font-semibold uppercase tracking-[-0.06em] text-white/90">
                  {isRecording ? "Recording" : isStarting ? "Starting Recorder" : isArmed ? "Armed" : recordingStatus === "stopped" ? "Stopped" : "Idle"}                </div>
              </div>
            </div>

            <div
              className={`rounded-[18px] border px-5 py-4 text-right transition-all duration-300 ${
                isRecording
                  ? "border-red-300/45 bg-red-950/20 shadow-[0_0_0_1px_rgba(248,113,113,0.22),0_0_26px_rgba(248,113,113,0.34),inset_0_1px_0_rgba(255,255,255,0.028)]"
                  : isStarting
                    ? "border-sky-300/32 bg-sky-950/18 shadow-[0_0_0_1px_rgba(56,189,248,0.16),0_0_22px_rgba(56,189,248,0.24),inset_0_1px_0_rgba(255,255,255,0.024)]"
                    : "border-white/[0.060] bg-black/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]"
              }`}
            >
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                Runtime
              </div>
              <div className="mt-1 font-mono text-[34px] font-semibold tabular-nums text-white/90">
                {formatRecordingDuration(recordingElapsedSeconds)}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={onArmRecording}
              disabled={isRecording || isStarting}
              className={`rounded-[16px] border px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] transition ${
                isArmed
                  ? "border-amber-300/24 bg-amber-300/14 text-amber-100/86"
                  : "border-white/[0.065] bg-white/[0.024] text-white/58 hover:bg-white/[0.045] hover:text-white/82 disabled:opacity-35"
              }`}
            >
              Arm
            </button>

            <button
              type="button"
              onClick={onStartRecording}
              disabled={!isArmed || isRecording || isStarting}
              className="rounded-[16px] border border-red-300/24 bg-red-400/14 px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-red-100/82 shadow-[0_0_20px_rgba(248,113,113,0.12)] transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {isStarting ? "Starting..." : "Start Recording"}
            </button>

            <button
              type="button"
              onClick={onStopRecording}
              disabled={!isRecording || isStarting}
              className="rounded-[16px] border border-white/[0.075] bg-white/[0.030] px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-white/64 transition hover:bg-white/[0.055] hover:text-white/86 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Stop
            </button>
          </div>

          <div className="mt-5 rounded-[16px] border border-sky-200/10 bg-sky-400/[0.035] px-4 py-3 text-[11px] leading-5 text-sky-50/54">
            LiveKit egress is now connected to S3-backed recording finalization. Future passes can add thumbnails, downloadable archives, retention policies, ISO exports, and recording analytics.
          </div>
          {recordingError ? (
            <div className="mt-4 rounded-[16px] border border-red-300/16 bg-red-400/[0.10] px-4 py-3 text-[11px] leading-5 text-red-100/82 shadow-[0_0_20px_rgba(248,113,113,0.08)]">
              {recordingError}
            </div>
          ) : null}
          <div className="mt-4 rounded-[18px] border border-white/[0.060] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
                  Recording Preflight
                </div>
                <div className="mt-1 text-[12px] font-semibold text-white/64">
                  Validate capture readiness before requesting egress.
                </div>
              </div>

              <div className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${
                passedPreflightChecks === preflightChecks.length
                  ? "border-emerald-300/16 bg-emerald-400/[0.080] text-emerald-100/70"
                  : "border-amber-300/16 bg-amber-300/[0.080] text-amber-100/68"
              }`}>
                {passedPreflightChecks}/{preflightChecks.length} Ready
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {preflightChecks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.050] bg-white/[0.018] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        check.status
                          ? "bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.55)]"
                          : "bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.42)]"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[10px] font-semibold text-white/70">
                        {check.label}
                      </div>
                      <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.08em] text-white/28">
                        {check.detail}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] ${
                      check.status
                        ? "border-emerald-300/14 bg-emerald-400/[0.070] text-emerald-100/64"
                        : "border-amber-300/14 bg-amber-300/[0.070] text-amber-100/64"
                    }`}
                  >
                    {check.status ? "Ready" : "Pending"}
                  </div>
                </div>
              ))}
            </div>
          </div>
                    <div className="mt-4 rounded-[18px] border border-white/[0.060] bg-black/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.14em]text-white/42">
                  Capture Model
                </div>
               <div className="mt-1 text-[12px] font-semibold text-white/64">
  LiveKit pipeline state, S3 upload status, encoder readiness, and finalized output telemetry.
</div>
              </div>

              <div className="rounded-full border border-amber-300/14 bg-amber-300/[0.070] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100/62">
                Pending Egress
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div>
                <div className="mb-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                  Source
                </div>

                <div className="grid max-h-[260px] gap-1.5 overflow-y-auto pr-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {recordingSourceOptions.map((option) => {
                    const active = recordingSource === option.label

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onRecordingSourceChange(option.label)}
                        className={`rounded-[12px] border px-3 py-2 text-left transition ${
                          active
                            ? "border-red-300/22 bg-red-400/[0.105] shadow-[0_0_16px_rgba(248,113,113,0.10)]"
                            : "border-white/[0.050] bg-white/[0.018] hover:bg-white/[0.035]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.08em] text-white/72">
                            {option.label}
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.08em] ${
                              option.status === "live"
                                ? "border-red-300/22 bg-red-400/[0.12] text-red-100/78"
                                : option.status === "ready"
                                  ? "border-emerald-300/14 bg-emerald-400/[0.070] text-emerald-100/58"
                                  : "border-white/[0.055] bg-white/[0.020] text-white/32"
                            }`}
                          >
                            {option.status}
                          </span>
                        </div>
                        <div className="mt-1 text-[9px] leading-4 text-white/36">
                          {option.description}
                        </div>
                        <div className="mt-1.5 text-[7px] font-black uppercase tracking-[0.12em] text-white/24">
                          {option.type} source
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                  Destination
                </div>

                <div className="grid gap-1.5">
                  {["Jupiter Cloud", "Local Browser", "External Storage"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onRecordingDestinationChange(option)}
                      className={`rounded-[9px] border px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] transition ${
                        recordingDestination === option
                          ? "border-sky-300/20 bg-sky-400/[0.090] text-sky-100/76"
                          : "border-white/[0.050] bg-white/[0.018] text-white/42 hover:bg-white/[0.035] hover:text-white/68"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
                  Quality
                </div>

                <div className="grid gap-1.5">
                  {["720p Draft", "1080p Standard", "4K Future"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onRecordingQualityChange(option)}
                      className={`rounded-[9px] border px-2 py-1 text-left text-[10px] font-black uppercase tracking-[0.08em] transition ${
                        recordingQuality === option
                          ? "border-emerald-300/18 bg-emerald-400/[0.080] text-emerald-100/72"
                          : "border-white/[0.050] bg-white/[0.018] text-white/42 hover:bg-white/[0.035] hover:text-white/68"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3 rounded-[18px] border border-white/[0.065] bg-white/[0.020] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.016)]">
          <div className="flex items-center justify-between">
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
              Sessions
            </div>
            <div className="rounded-full border border-white/[0.055] bg-black/22 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.10em] text-white/34">
              {recordings.length} saved
            </div>
          </div>

          <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recordings.length ? (
              recordings.slice(0, 8).map((recording) => (
                <div key={recording.id} className="rounded-[14px] border border-white/[0.050] bg-black/22 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-[12px] font-semibold text-white/74">
                      {recording.label}
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.10em] ${
                      recording.status === "ready"
                        ? "border-emerald-300/14 bg-emerald-400/[0.070] text-emerald-100/62"
                        : recording.status === "recording"
                          ? "border-red-300/20 bg-red-400/[0.12] text-red-100/78"
                          : recording.status === "failed"
                            ? "border-red-300/16 bg-red-400/[0.08] text-red-100/70"
                            : "border-amber-300/14 bg-amber-400/[0.070] text-amber-100/62"
                    }`}>
                      {recording.status}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[9px] font-semibold text-white/34">
                    <span>{new Date(recording.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>{formatRecordingDuration(recording.durationSeconds)}</span>
                  </div>
                  <div className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.08em] text-white/26">
                    {recording.source} · {recording.quality}
                  </div>
                  {recording.size ? (
                    <div className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.08em] text-emerald-100/34">
                      {recording.size} bytes · {recording.location ? "Stored" : "No location"}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[14px] border border-dashed border-white/[0.070] bg-white/[0.014] px-3 py-10 text-center text-[12px] leading-5 text-white/38">
                No recording sessions yet. Arm the recorder and start a capture to create the first session entry.
              </div>
            )}
          </div>

          {latestRecording ? (
            <div className="rounded-[14px] border border-emerald-300/10 bg-emerald-400/[0.045] px-3 py-2 text-[10px] leading-4 text-emerald-50/54">
              Latest: {latestRecording.label} · {latestRecordingStatus} · {latestRecordingLocation}
            </div>
          ) : null}

          <div className="rounded-[18px] border border-white/[0.060] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
                  Recording Pipeline
                </div>
<div className="mt-1 text-[12px] font-semibold text-white/64">
  Live capture telemetry, encoder state, upload finalization, and recording delivery readiness.
</div>
              </div>
              <div className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${
                isRecording
                  ? "border-red-300/20 bg-red-400/[0.12] text-red-100/78"
                  : recordingStatus === "stopped"
                    ? "border-amber-300/18 bg-amber-300/[0.080] text-amber-100/68"
                    : isArmed
                      ? "border-sky-300/18 bg-sky-400/[0.080] text-sky-100/68"
                      : "border-white/[0.060] bg-white/[0.020] text-white/40"
              }`}>
                {pipelineStage}
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {[
                ["Source", recordingSource],
                ["Destination", recordingDestination],
                ["Quality", recordingQuality],
                ["Encoder", encoderStatus],
                ["Target Bitrate", estimatedBitrate],
                ["Estimated Output", latestRecordingSize],
                ["Delivery", latestRecordingStatus],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.050] bg-white/[0.018] px-3 py-2">
                  <span className="text-[10px] font-semibold text-white/42">{label}</span>
                  <span className="truncate text-right text-[10px] font-black uppercase tracking-[0.08em] text-white/64">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Health", isRecording ? "Stable" : "Ready"],
                ["Dropped Frames", "0"],
                ["Exports", latestRecording?.status === "ready" ? "Ready" : recordingStatus === "stopped" ? "Finalizing" : "Pending"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[12px] border border-white/[0.045] bg-black/22 px-2.5 py-2 text-center">
                  <div className="text-[7px] font-black uppercase tracking-[0.12em] text-white/28">{label}</div>
                  <div className="mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-white/62">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
<style jsx global>{`
  @keyframes takeSweep {
    0% {
      transform: translateX(0%);
      opacity: 0;
    }

    15% {
      opacity: 1;
    }

    100% {
      transform: translateX(340%);
      opacity: 0;
    }
  }
`}</style>