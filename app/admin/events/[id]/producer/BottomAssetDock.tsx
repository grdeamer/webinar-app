
import { useEffect, useMemo, useState, type JSX } from "react"
type UtilityPanel = "stream" | "overlays" | "schedule" | "shortcuts" | "settings"
type MediaOrchestratorTab = "overview" | "assets" | "routing" | "take"
type MixerChannelKey = "Program" | "Stage" | "Music" | "Mics" | "SFX" | "Audience"
type BroadcastAssetType = "video" | "graphic" | "audio" | "live"
type BroadcastAssetState = "READY" | "LIVE" | "LOOPING" | "STANDBY" | "CUED" | "SAFE" | "PRELOADED" | "FAILED"

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
    type === "video" ? <Video size={13} /> :
    type === "graphic" ? <FileImage size={13} /> :
    type === "audio" ? <Waves size={13} /> :
    <Radio size={13} />

  const tone =
    type === "video"
      ? "border-sky-300/13 bg-sky-400/[0.050] text-sky-100/58"
      : type === "graphic"
        ? "border-violet-300/13 bg-violet-400/[0.050] text-violet-100/58"
        : type === "audio"
          ? "border-emerald-300/13 bg-emerald-400/[0.050] text-emerald-100/58"
          : "border-red-300/14 bg-red-400/[0.060] text-red-100/62"

  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border ${tone}`}>
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
            className="h-full rounded-full bg-gradient-to-r from-sky-300/38 via-sky-200/52 to-white/42 transition-[width] duration-300"
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
          className={`group rounded-[9px] border px-1.5 py-1.5 text-left transition hover:-translate-y-px active:translate-y-0 ${
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
    <div className="mb-2 grid grid-cols-4 gap-1">
      {metrics.map(([label, value], index) => (
        <div
          key={label}
          className={`rounded-[9px] border px-2 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.010)] ${
            index === 3 && checkCount > 0
              ? "border-amber-300/13 bg-amber-300/[0.045]"
              : "border-white/[0.040] bg-white/[0.014]"
          }`}
        >
          <div className="text-[6.5px] font-black uppercase tracking-[0.11em] text-white/22">{label}</div>
          <div className="mt-0.5 truncate text-[8px] font-black uppercase tracking-[0.08em] text-white/52">{value}</div>
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
    <div className="rounded-[16px] border border-white/[0.055] bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/38">
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

      <div className="mt-3 grid grid-cols-2 gap-2">
        {checks.map(([label, value]) => {
          const caution = value === "Review" || value === "Open" || value === "Idle"

          return (
            <div
              key={label}
              className={`rounded-[11px] border px-3 py-2 ${
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
    <div className="rounded-[16px] border border-white/[0.055] bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/38">
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

      <div className="mt-3 grid gap-1.5">
        {routes.map(([code, label, status]) => (
          <div key={code} className="grid grid-cols-[42px_1fr_auto] items-center gap-2 rounded-[11px] border border-white/[0.045] bg-white/[0.018] px-2.5 py-2">
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
    <div className="rounded-[16px] border border-white/[0.055] bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/38">
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

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {[
          ["Motion", nextAsset?.type === "video" ? "Timed" : "Static"],
          ["Audio", nextAsset?.audioEmbedded ? "Embedded" : "Clear"],
          ["Reset", nextAsset?.resetBehavior ?? "Manual"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[10px] border border-white/[0.045] bg-white/[0.016] px-2 py-1.5 text-center">
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
    <div className="rounded-[16px] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.020),rgba(255,255,255,0.010))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
            Active TAKE Queue
          </div>

          <div className="mt-1 text-[10px] font-semibold tracking-[-0.015em] text-white/46">
            Ordered narrative execution
          </div>
        </div>

        <div className="rounded-full border border-red-300/14 bg-red-400/[0.055] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-red-100/56">
          TAKE Armed
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
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

      <div className="mt-3 grid grid-cols-3 gap-1.5">
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
    <div className="rounded-[16px] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.020),rgba(255,255,255,0.010))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
            Production Intent
          </div>
          <div className="mt-1 text-[10px] font-semibold tracking-[-0.015em] text-white/46">
            Narrative purpose behind the next media action
          </div>
        </div>

        <div className="rounded-full border border-sky-300/12 bg-sky-400/[0.050] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-sky-100/54">
          Director View
        </div>
      </div>

      <div className="mt-3 grid gap-1.5">
        {[
          ["Moment", "Open with motion"],
          ["Audience Effect", "Orient attention"],
          ["Operator Goal", "Clean handoff"],
          ["Narrative Risk", "Low"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-[11px] border border-white/[0.045] bg-black/20 px-2.5 py-1.5"
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
    <div className="rounded-[16px] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.020),rgba(255,255,255,0.010))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
            Operator Confidence
          </div>
          <div className="mt-1 text-[10px] font-semibold tracking-[-0.015em] text-white/46">
            Human-readable confidence for the live moment
          </div>
        </div>

        <div className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.050] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/54">
          Confidence High
        </div>
      </div>

      <div className="mt-3 grid gap-1.5">
        {confidenceRows.map(([label, value, tone]) => {
          const isAmber = tone === "amber"

          return (
            <div
              key={label}
              className={`flex items-center justify-between rounded-[11px] border px-2.5 py-1.5 ${
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
      className={`group relative flex min-w-0 items-stretch gap-1.5 overflow-hidden rounded-[11px] border p-1 text-left transition hover:-translate-y-px hover:border-white/[0.085] hover:bg-white/[0.030] active:translate-y-0 ${
selected
  ? "border-sky-300/22 bg-sky-400/[0.060] shadow-[0_0_18px_rgba(56,189,248,0.10),inset_0_1px_0_rgba(255,255,255,0.018)]"
  : asset.state === "PRELOADED"
    ? "border-emerald-300/16 bg-emerald-400/[0.045] shadow-[0_0_20px_rgba(16,185,129,0.12)]"
    : "border-white/[0.045] bg-white/[0.016]"
      }`}
    >
      <div className={`relative h-[54px] w-[72px] shrink-0 overflow-hidden rounded-[8px] border ${typeFrame}`}>
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
            <div className="truncate text-[10px] font-semibold tracking-[-0.025em] text-white/82">{asset.label}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <AssetTypeGlyph type={asset.type} />
              <div className="min-w-0 text-[6.5px] font-black uppercase tracking-[0.12em] text-white/28">
                {asset.meta}
              </div>
            </div>
          </div>
          <AssetStatePill state={asset.state} />
        </div>

<div className="mt-1 grid grid-cols-3 gap-1 text-[6.5px] font-black uppercase tracking-[0.11em] text-white/26">
  <span className="truncate">{asset.route}</span>

  <span className="truncate text-center">
    {asset.lastPlayed}
  </span>

  <span className="truncate text-right">
    {asset.linkedScene}
  </span>
</div>

<div className="mt-1 flex flex-wrap items-center gap-1">
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

<div className="mt-1 overflow-hidden rounded-full bg-white/[0.040]">
  <div
    className={`h-[3px] rounded-full transition-[width] duration-300 ${
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
      <div className="relative z-[2500] flex items-start justify-between gap-4 border-b border-white/[0.065] px-5 py-4">
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

      <div className="relative z-10 grid h-[calc(100%-112px)] min-h-0 gap-4 overflow-hidden p-5 xl:grid-cols-[1fr_280px]">
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
    <div className="space-y-2.5">
      <ActiveTakeQueuePanel mediaRows={mediaRows} />
      <ProductionIntentPanel />
      <OperatorConfidencePanel />
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
  onUploadPdf?: () => void
  onSendSlideToPreview?: (slideIndex: number) => void
  onTakeSlide?: (slideIndex: number) => void
  onApplyScene?: (sceneId: string) => void
  onDoubleClickScene?: (sceneId: string) => void
  onDeleteScene?: (sceneId: string) => void
}): JSX.Element {
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<UtilityPanel | null>(null)
  const [expandedMixerOpen, setExpandedMixerOpen] = useState(false)
  const [expandedRecordingOpen, setExpandedRecordingOpen] = useState(false)
  const [expandedMediaOpen, setExpandedMediaOpen] = useState(false)
  const [activeMediaOrchestratorTab, setActiveMediaOrchestratorTab] = useState<MediaOrchestratorTab>("overview")
  const [selectedMediaAssetLabel, setSelectedMediaAssetLabel] = useState<string | null>(null)
  const [previewMediaAssetLabel, setPreviewMediaAssetLabel] = useState<string | null>(null)
  const [programMediaAssetLabel, setProgramMediaAssetLabel] = useState<string | null>(null)
  const [takeFlashActive, setTakeFlashActive] = useState(false)
  function handleTakeAsset(): void {
  if (!previewMediaAssetLabel) return

  setProgramMediaAssetLabel(previewMediaAssetLabel)
  setTakeFlashActive(true)

  window.setTimeout(() => {
    setTakeFlashActive(false)
  }, 900)
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

  const mediaRows: BroadcastAssetTelemetry[] = [
    ...mediaItems.slice(0, 4).map((item, index) => blockToBroadcastAsset(item, index === 0 ? "Opening Roll-In" : "Media Asset", index)),
    {
      label: "Welcome Slide",
      type: "graphic" as BroadcastAssetType,
      state: "PRELOADED" as BroadcastAssetState,
      duration: "16:9",
      meta: "Graphic · 1920×1080",
      route: "Preview",
      lastPlayed: "Not played",
      linkedScene: "Opening",
      imageUrl: null,
      programSafe: true,
      destination: "PREVIEW" as const,
      takeSafe: true,
      cueOrder: 5,
      progress: 0,
      scheduledIn: "In 18m",
      resetBehavior: "Hold",
      cacheState: "HOT" as const,
      codecState: "OK" as const,
      routeLock: true,
      hoverHint: "Static graphic preloaded",
      takeCompatibility: "Clean" as const,
      segment: "Arrival",
      trigger: "Scheduled",
    },
    {
      label: "Remote Presenter Feed",
      type: "live" as BroadcastAssetType,
      state: "LIVE" as BroadcastAssetState,
      duration: "LIVE",
      meta: "Live Source · 720p",
      route: "Stage",
      lastPlayed: "On air",
      linkedScene: "Host ISO",
      imageUrl: null,
      audioEmbedded: true,
      programSafe: true,
      destination: "PROGRAM" as const,
      takeSafe: true,
      cueOrder: 6,
      progress: 100,
      scheduledIn: "Live now",
      resetBehavior: "Continuous",
      cacheState: "HOT" as const,
      codecState: "LIVE" as const,
      routeLock: true,
      hoverHint: "Live source confidence active",
      takeCompatibility: "Live Only" as const,
      segment: "Live Host",
      trigger: "Stage Route",
    },
  ].slice(0, 6)

  const selectedMediaAsset =
    mediaRows.find((asset) => asset.label === selectedMediaAssetLabel) ?? mediaRows[0] ?? null

const orchestratedMediaRows: BroadcastAssetTelemetry[] = mediaRows.map((asset) => {
  const isPreloaded = preloadedAssetLabels.includes(asset.label)
  const isProgram = asset.label === programMediaAssetLabel
  const isPreview = asset.label === previewMediaAssetLabel

  if (isProgram) {
    return {
      ...asset,
      destination: "PROGRAM" as const,
      state: "LIVE" as BroadcastAssetState,
      route: "PGM",
      progress: 100,
      scheduledIn: "Live now",
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
        <div className={`fixed inset-x-6 bottom-6 top-[96px] z-[999] overflow-hidden rounded-[24px] border border-sky-200/16 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.16),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(168,85,247,0.10),transparent_32%),linear-gradient(180deg,rgba(5,10,18,0.985),rgba(2,5,10,0.998))] text-white shadow-[0_34px_110px_rgba(0,0,0,0.72),0_0_42px_rgba(56,189,248,0.12),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl ${takeFlashActive ? 'animate-pulse' : ''}`}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.030)_0px,rgba(255,255,255,0.030)_1px,transparent_1px,transparent_32px)]" />

          <div className="relative z-10 flex items-start justify-between gap-4 border-b border-white/[0.065] px-5 py-4">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-100/52">
                Broadcast Asset Intelligence
              </div>
              <div className="mt-1 text-[22px] font-semibold tracking-[-0.055em] text-white/92">
                Expanded Media Orchestrator
              </div>
              <div className="mt-1 max-w-3xl text-[12px] leading-relaxed text-white/46">
                Cue-aware asset routing, orchestration telemetry, preview confidence, and rundown-linked playback preparation.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExpandedMediaOpen(false)}
              className="rounded-full border border-white/[0.08] bg-white/[0.030] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.10em] text-white/58 transition hover:bg-white/[0.055] hover:text-white/82"
            >
              Close
            </button>
          </div>

          <div className="relative z-10 h-[calc(100%-104px)] min-h-0 overflow-hidden p-5">
            <div className="mb-3 overflow-hidden rounded-[16px] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.020),rgba(255,255,255,0.010))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.014)]">
  <div className="mb-2 flex items-center justify-between">
    <div>
      <div className="text-[8px] font-black uppercase tracking-[0.16em] text-sky-100/38">
        Narrative Timeline
      </div>
      <div className="mt-1 text-[11px] font-semibold tracking-[-0.02em] text-white/66">
        Event choreography awareness
      </div>
    </div>

    <div className="rounded-full border border-sky-300/10 bg-sky-400/[0.045] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-sky-100/44">
      Timeline Linked
    </div>
  </div>

  <div className="flex items-center gap-2 overflow-x-auto pb-1">
    {[
      ["Countdown", "USED"],
      ["Host Intro", "LIVE"],
      ["Keynote", "NEXT"],
      ["Break", "STANDBY"],
      ["Session A", "LINKED"],
      ["Closing", "SAFE"],
    ].map(([label, state], index) => (
      <div key={label} className="flex items-center gap-2">
        <div className={`min-w-[112px] rounded-[12px] border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.010)] ${state === "LIVE" ? "border-red-300/16 bg-red-400/[0.045]" : state === "NEXT" ? "border-sky-300/16 bg-sky-400/[0.045]" : "border-white/[0.050] bg-black/22"}`}>
          <div className="text-[7px] font-black uppercase tracking-[0.10em] text-white/24">
            Segment {index + 1}
          </div>

          <div className="mt-1 text-[10px] font-semibold tracking-[-0.025em] text-white/82">
            {label}
          </div>

<TimelineStatePill state={state} />
        </div>

        {index < 5 ? (
          <div className="h-px w-6 shrink-0 bg-gradient-to-r from-sky-300/24 via-white/10 to-transparent" />
        ) : null}
      </div>
    ))}
  </div>
</div>
            <div className="mb-3 grid grid-cols-4 gap-2">
              {[
["Inventory", `${orchestratedMediaRows.length} Assets`],
["Cue Safety", `${orchestratedMediaRows.filter((asset) => asset.takeSafe !== false).length} Clear`],
["Route Locks", `${orchestratedMediaRows.filter((asset) => asset.routeLock).length} Armed`],
["Live Sources", `${orchestratedMediaRows.filter((asset) => asset.state === "LIVE").length} Active`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[14px] border border-white/[0.055] bg-white/[0.018] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
                  <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/28">{label}</div>
                  <div className="mt-1 text-[13px] font-semibold tracking-[-0.025em] text-white/78">{value}</div>
                </div>
              ))}
            </div>
<div className="mb-3 flex items-center justify-between gap-3 rounded-[16px] border border-white/[0.055] bg-white/[0.014] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
  <div className="flex items-center gap-1">
    {[
      ["overview", "Overview", "Mission control"],
      ["assets", "Assets", "Inventory"],
      ["routing", "Routing", "Signal paths"],
      ["take", "TAKE", "Execution"],
    ].map(([id, label, meta]) => {
      const active = activeMediaOrchestratorTab === id

      return (
        <button
          key={id}
          type="button"
          onClick={() =>
            setActiveMediaOrchestratorTab(id as MediaOrchestratorTab)
          }
          className={`rounded-[12px] border px-3 py-2 text-left transition ${
            active
              ? "border-sky-300/18 bg-sky-400/[0.085] text-sky-100/78"
              : "border-white/[0.040] bg-black/14 text-white/42 hover:border-white/[0.075] hover:bg-white/[0.025] hover:text-white/68"
          }`}
        >
          <div className="text-[9px] font-black uppercase tracking-[0.12em]">
            {label}
          </div>

          <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.10em] opacity-45">
            {meta}
          </div>
        </button>
      )
    })}
  </div>

  <div className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.045] px-3 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-emerald-100/48">
    Workspace Mode
  </div>
</div>
{activeMediaOrchestratorTab === "overview" ? (
            <div className="grid h-[calc(100%-188px)] min-h-0 gap-4 overflow-hidden xl:grid-cols-[1.15fr_0.85fr]">
              <div className="min-h-0 overflow-hidden rounded-[18px] border border-white/[0.065] bg-black/22 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
                    Active Asset Inventory
                  </div>
                  <div className="mt-1 text-[12px] font-semibold tracking-[-0.02em] text-white/78">
                    Program-aware playback assets
                  </div>
                </div>

                <div className="rounded-full border border-sky-300/12 bg-sky-400/[0.055] px-3 py-1 text-[8px] font-black uppercase tracking-[0.10em] text-sky-100/54">
                  Orchestration Linked
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between gap-2 rounded-[12px] border border-white/[0.045] bg-white/[0.014] p-1">
                <div className="flex items-center gap-1">
                  {assetTabStats.map(([tab, count], index) => (
                    <button
                      key={tab}
                      type="button"
                      className={`flex items-center gap-1 rounded-[9px] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] transition ${
                        index === 0
                          ? "bg-sky-400/[0.12] text-sky-100/76"
                          : "text-white/34 hover:bg-white/[0.030] hover:text-white/68"
                      }`}
                    >
                      <span>{tab}</span>
                      <span className="rounded-full bg-white/[0.045] px-1.5 py-0.5 text-[6.5px] text-white/42">{count}</span>
                    </button>
                  ))}
                </div>

                <div className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.045] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/48">
                  Filters Armed
                </div>
              </div>

<div className="grid max-h-[calc(100%-82px)] gap-1.5 overflow-y-auto pr-1 xl:grid-cols-2">
  {orchestratedMediaRows.map((asset) => (
    <MediaRow
      key={`${asset.label}-${asset.destination}-${asset.state}`}
      asset={asset}
      selected={selectedMediaAsset?.label === asset.label}
      onSelect={() => setSelectedMediaAssetLabel(asset.label)}
    />
  ))}
</div>
            </div>

              <div className="min-h-0 space-y-2.5 overflow-y-auto rounded-[18px] border border-white/[0.065] bg-white/[0.020] p-3 pr-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
              <div className="rounded-[16px] border border-sky-300/12 bg-sky-400/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-100/48">
                      Selected Asset
                    </div>
                    <div className="mt-1 truncate text-[14px] font-semibold tracking-[-0.035em] text-white/86">
                      {selectedMediaAsset?.label ?? "Select an asset"}
                    </div>
                    <div className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.10em] text-white/28">
                      {selectedMediaAsset ? `${selectedMediaAsset.type} · ${selectedMediaAsset.meta}` : "Awaiting operator selection"}
                    </div>
                  </div>

                  <AssetStatePill state={selectedMediaAsset?.state ?? "STANDBY"} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={!selectedMediaAsset}
                    onClick={() => selectedMediaAsset ? setPreviewMediaAssetLabel(selectedMediaAsset.label) : null}
                    className="rounded-[10px] border border-sky-300/14 bg-sky-400/[0.060] px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] text-sky-100/62 transition hover:bg-sky-400/[0.095] disabled:opacity-35"
                  >
                    Send to Preview
                  </button>
                  <button
                    type="button"
                    disabled={!selectedMediaAsset}
                    onClick={() => {
                      if (!selectedMediaAsset) return

                      setProgramMediaAssetLabel(selectedMediaAsset.label)
                      setTakeFlashActive(true)

                      const nextPreview =
                        orchestratedMediaRows.find(
                          (asset) =>
                            asset.label !== selectedMediaAsset.label &&
                            asset.destination !== "PROGRAM"
                        ) ?? null

                      setPreviewMediaAssetLabel(nextPreview?.label ?? null)

                      window.setTimeout(() => {
                        setTakeFlashActive(false)
                      }, 900)
                    }}
                    className="rounded-[10px] border border-red-300/14 bg-red-400/[0.060] px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] text-red-100/62 transition hover:bg-red-400/[0.095] disabled:opacity-35"
                  >
                    Send to Program
                  </button>
                </div>
              </div>
<div className="mb-3 flex items-center gap-1 rounded-[12px] border border-white/[0.055] bg-white/[0.018] p-1">
  {[
    ["overview", "Overview"],
    ["assets", "Assets"],
    ["routing", "Routing"],
    ["take", "TAKE"],
  ].map(([value, label]) => (
    <button
      key={value}
      type="button"
      onClick={() => setActiveMediaOrchestratorTab(value as MediaOrchestratorTab)}
      className={`rounded-[9px] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] transition ${
        activeMediaOrchestratorTab === value
          ? "bg-sky-400/[0.12] text-sky-100/80"
          : "text-white/34 hover:bg-white/[0.030] hover:text-white/70"
      }`}
    >
      {label}
    </button>
  ))}
</div>
{activeMediaOrchestratorTab === "overview" ? (
  <MediaOverviewWorkspace
    mediaRows={orchestratedMediaRows}
  />
) : null}
              <div className="rounded-[16px] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.010))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
  <div className="flex items-start justify-between gap-3">
    <div>
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/40">
      <button
  type="button"
  disabled={!previewMediaAssetLabel}
  onClick={handleTakeAsset}
  className="rounded-[10px] border border-emerald-300/14 bg-emerald-400/[0.060] px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] text-emerald-100/62 transition hover:bg-emerald-400/[0.095] disabled:opacity-35"
>
  TAKE Preview
</button>
        Narrative Timing
      </div>

      <div className="mt-1 text-[10px] font-semibold tracking-[-0.015em] text-white/46">
        Emotional pacing and transition readiness
      </div>
    </div>

    <div className="rounded-full border border-emerald-300/12 bg-emerald-400/[0.050] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.10em] text-emerald-100/54">
      Flow Stable
    </div>
  </div>

  <div className="mt-3 grid gap-1.5">
    {[
      ["Audience State", "Focused"],
      ["Presenter", "Ready"],
      ["Music Bed", "Active"],
      ["Transition Window", "Open"],
      ["Scene Cooldown", "Nominal"],
    ].map(([label, value], index) => (
      <div
        key={label}
        className={`flex items-center justify-between rounded-[11px] border px-3 py-2 ${
          index === 3
            ? "border-sky-300/12 bg-sky-400/[0.045]"
            : "border-white/[0.045] bg-black/20"
        }`}
      >
        <span className="text-[8px] font-black uppercase tracking-[0.11em] text-white/28">
          {label}
        </span>

        <span
          className={`text-[9px] font-semibold tracking-[-0.01em] ${
            index === 3
              ? "text-sky-100/62"
              : "text-white/58"
          }`}
        >
          {value}
        </span>
      </div>
    ))}
  </div>
</div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
                  Cue Stack
                </div>

                <div className="mt-3 grid gap-1.5">
                  {orchestratedMediaRows.slice(0, 4).map((asset, index) => (
                    <CueStackRow
                      key={`${asset.label}-${index}`}
                      asset={{ ...asset, cueOrder: index + 1 }}
                    />
                  ))}
                </div>

                <OrchestrationCommandStrip
  onPreload={handlePreloadAsset}
  onLockRoute={handleLockRoute}
  onRehearse={handleRehearseAsset}
  onReset={handleResetMediaOrchestration}
/>
              </div>

            <TakeSafetyMatrix mediaRows={orchestratedMediaRows} />
            <RouteMappingPanel mediaRows={orchestratedMediaRows} />
            <TransitionCompatibilityPanel mediaRows={orchestratedMediaRows} />
              <div className="rounded-[16px] border border-white/[0.055] bg-black/20 p-3">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/38">
                  Operational Status
                </div>

                <div className="mt-3 grid gap-2">
                  {[
                    ["Preview Confidence", "Stable"],
                    ["Route Validation", "Mapped"],
                    ["TAKE Preflight", "Green"],
                    ["Timeline Sync", "Linked"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-[11px] border border-white/[0.045] bg-white/[0.018] px-3 py-2"
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
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="relative z-10 grid min-h-0 flex-1 gap-2 overflow-hidden pb-2 xl:grid-cols-[1.15fr_0.9fr_0.95fr_0.9fr]">
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

        <ConsolePanel
  title="Media"
  action={
    <button
      type="button"
      onClick={() => setExpandedMediaOpen(true)}
      className="rounded-full border border-sky-300/14 bg-sky-400/[0.055] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-sky-100/58 transition hover:border-sky-300/24 hover:bg-sky-400/[0.090] hover:text-sky-50"
    >
      Expand
    </button>
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

            <div className="grid grid-cols-2 gap-2">
              {mediaRows.slice(0, 2).map((asset) => (
                <MediaRow key={`${asset.label}-${asset.state}-${asset.type}`} asset={asset} />
              ))}
            </div>

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
              <span>Open Asset Orchestrator</span>
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
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
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
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
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
                      className={`rounded-[11px] border px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] transition ${
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
                      className={`rounded-[11px] border px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] transition ${
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
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
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
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
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