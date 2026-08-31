import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type JSX } from "react"

import {
  type BroadcastAssetTelemetry,
  type BroadcastAssetType,
  type BroadcastAssetState,
  AssetRundownStrip,
  AssetStatePill,
  AssetTypeGlyph,
  AssetConfidenceRail,
  AssetHoverIntelligence,
} from "./BottomAssetDockAssetRenderers"

import type { RecordingStatus } from "./BottomAssetDock"

export type { PreviewBlock } from "./useProducerBlocks"
export type { ProducerWorkspaceMode } from "./ProducerModeBar"
export { buildProducerAssetUrl } from "./producerAssetUrls"
export type { DockAssetRecord, SceneSummary } from "./assetDockTypes"

import {
  Image,
  Mic2,
  Music2,
  Radio,
  Trash2,
  Video,
} from "lucide-react"

export type MediaAssetEditDraft = {
  label: string
  linkedScene: string
  segment: string
  trigger: string
}

export type MediaAssetRuntimeState = {
  isPlaying: boolean
  startedAtMs: number | null
  elapsedSeconds: number
}

export type RecordingSession = {
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

export type RecordingStatusRow = {
  id: string
  started_at?: string | null
  ended_at?: string | null
  status?: string | null
  source?: string | null
  destination?: string | null
  quality?: string | null
  egress_id?: string | null
  file_name?: string | null
  file_location?: string | null
  file_size?: number | string | null
}

export type RecordingSourceOption = {
  id: string
  label: string
  type: "program" | "preview" | "iso" | "clean" | "return"
  status: "live" | "ready" | "standby"
  description: string
}

export type SourceLibraryView = "icons" | "list" | "blocks"

export type { ProductionDrawerTab } from "./ProductionControlsDrawer"

export type UtilityPanel = "stream" | "overlays" | "schedule" | "shortcuts" | "settings"

export type MixerChannelKey = "Program" | "Stage" | "Music" | "Mics" | "SFX" | "Audience"

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

export function formatRecordingDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

export function AssetIntelligenceHeader({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
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

export function SourceConfidenceStrip({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
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


export function TakeSafetyMatrix({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
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

export function RouteMappingPanel({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
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

export function TransitionCompatibilityPanel({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
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
export function TimelineStatePill({ state }: { state: string }): JSX.Element {
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
export function ActiveTakeQueuePanel({ mediaRows }: { mediaRows: BroadcastAssetTelemetry[] }): JSX.Element {
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
export function ProductionIntentPanel(): JSX.Element {
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
export function OperatorConfidencePanel(): JSX.Element {
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
export function MediaRow({
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

export function SourceLibraryCard({
  asset,
  selected,
  inPreview,
  onSelect,
  onSendToPreview,
  onDelete,
  deleting = false,
  viewMode = "blocks",
}: {
  asset: BroadcastAssetTelemetry
  selected: boolean
  inPreview: boolean
  onSelect: () => void
  onSendToPreview?: () => void
  onDelete?: () => void
  deleting?: boolean
  viewMode?: SourceLibraryView
}): JSX.Element {
  const listView = viewMode === "list"
  const iconView = viewMode === "icons"
  const icon =
    asset.type === "video" ? (
      <Video size={18} />
    ) : asset.type === "audio" ? (
      <Music2 size={18} />
    ) : asset.type === "live" ? (
      <Radio size={18} />
    ) : (
      <Image size={18} />
    )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onSendToPreview}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect()
        }
      }}
      title="Select source. Double-click to send directly to Preview."
      className={`group relative flex min-w-0 cursor-pointer overflow-hidden rounded-[10px] border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/45 ${
        listView
          ? "min-h-[68px] flex-row"
          : iconView
            ? "min-h-[132px] flex-col"
            : "min-h-[112px] flex-row sm:flex-col"
      } ${
        selected
          ? "border-sky-300/50 bg-sky-400/[0.09] shadow-[0_0_0_1px_rgba(125,211,252,0.10),0_8px_20px_rgba(0,0,0,0.22)]"
          : "border-white/[0.09] bg-[#0a101b] hover:border-white/[0.18] hover:bg-[#0d1523]"
      }`}
    >
      <div className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(80,116,176,0.12),transparent_62%),#050a12] p-2 text-white/34 ${
        listView
          ? "h-[68px] w-[92px] border-r border-white/[0.07]"
          : iconView
            ? "h-[82px] w-full border-b border-white/[0.07]"
            : "h-[82px] w-[116px] border-r border-white/[0.07] sm:h-[78px] sm:w-full sm:border-b sm:border-r-0"
      }`}>
        {asset.imageUrl ? (
          <img
            src={asset.imageUrl}
            alt={`${asset.label} source preview`}
            className="h-full w-full object-contain opacity-90 transition duration-300 group-hover:scale-[1.015] group-hover:opacity-100"
          />
        ) : (
          icon
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/[0.025]" />
        <span className="absolute bottom-1.5 left-1.5 rounded-[4px] border border-white/10 bg-black/70 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.08em] text-white/76">
          {asset.type}
        </span>
        {inPreview ? (
          <span className="absolute right-1.5 top-1.5 rounded-[4px] border border-sky-200/22 bg-sky-500/20 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.10em] text-sky-50/90">
            PVW
          </span>
        ) : null}
      </div>

      <div className={`flex min-w-0 flex-1 flex-col justify-center px-2.5 ${listView ? "py-1.5" : "py-2"}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-semibold tracking-[-0.01em] text-white/88">
            {asset.label}
          </span>
          <span className="shrink-0 text-[8px] font-medium tabular-nums text-white/34">{asset.duration}</span>
        </div>
        <span className="mt-1 truncate text-[8px] text-white/38">
          {asset.meta} · {asset.linkedScene === "Unassigned" ? "Ready" : asset.linkedScene}
        </span>
        {onDelete ? (
          <button
            type="button"
            disabled={deleting}
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
            className="mt-2 inline-flex h-6 w-fit items-center gap-1.5 rounded-[7px] border border-red-300/15 bg-red-400/[0.045] px-2 text-[8px] font-semibold text-red-100/58 transition hover:border-red-300/28 hover:bg-red-400/[0.10] hover:text-red-50 disabled:cursor-wait disabled:opacity-45"
            aria-label={`Delete ${asset.label} permanently from the source library`}
            title="Delete permanently from this event's source library"
          >
            <Trash2 size={10} aria-hidden="true" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function CompactAudioMeter({
  label,
  level,
}: {
  label: string
  level: number
}): JSX.Element {
  const normalized = Math.max(2, Math.min(96, level))

  return (
    <div className="min-w-0 rounded-[9px] border border-white/[0.07] bg-[#080d16] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[8px] font-bold uppercase tracking-[0.10em] text-white/58">{label}</span>
        <span className="text-[8px] font-medium tabular-nums text-white/36">{dbLabelFromPercent(normalized)}</span>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded-[3px] bg-white/[0.06]">
        <div className="absolute inset-y-0 left-0 w-[72%] bg-emerald-400/[0.10]" />
        <div className="absolute inset-y-0 left-[72%] w-[18%] bg-amber-300/[0.10]" />
        <div className="absolute inset-y-0 right-0 w-[10%] bg-red-400/[0.12]" />
        <div
          className="absolute inset-y-0 left-0 rounded-[3px] bg-gradient-to-r from-emerald-500 via-emerald-300 via-[72%] to-amber-300 shadow-[0_0_10px_rgba(52,211,153,0.18)] transition-[width] duration-100"
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  )
}

export function AudioAssetRow({
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

export function MixerStrip({
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

export function ExpandedAudioMixerOverlay({
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
    <div className="fixed left-[96px] top-[118px] z-[999] h-[min(720px,calc(100dvh-160px))] w-[min(980px,calc(100vw-560px))] min-w-[760px] overflow-hidden rounded-[24px] border border-emerald-200/16 bg-[radial-gradient(circle_at_24%_0%,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_80%_12%,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,rgba(5,13,18,0.985),rgba(2,5,10,0.998))] shadow-[0_34px_110px_rgba(0,0,0,0.72),0_0_42px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.045)] backdrop-blur-2xl">
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

      <div className="relative z-10 grid h-[calc(100%-92px)] min-h-0 gap-3 overflow-hidden p-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="min-h-0 overflow-hidden rounded-[18px] border border-white/[0.065] bg-black/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.020)]">
          <div className="grid h-full min-h-0 grid-cols-3 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
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

        <div className="min-h-0 space-y-3 overflow-y-auto rounded-[18px] border border-white/[0.065] bg-white/[0.020] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
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

export function CommRow({
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

export function UtilityButton({
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

export function UtilityOverlay({
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

export function ExpandedRecordingOverlay({
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
