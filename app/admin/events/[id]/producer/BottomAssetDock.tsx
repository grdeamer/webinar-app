import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type JSX } from "react"
import { createClient } from "@/lib/supabase/client"
type MediaOrchestratorTab = "overview" | "assets" | "routing" | "take"
import {
  type DockAssetRecord,
  type SceneSummary,
} from "./assetDockTypes"

import {
  type BroadcastAssetTelemetry,
  type BroadcastAssetType,
  type BroadcastAssetState,
  AssetRundownStrip,
  ConsolePanel,
  ScenePreviewTile,
  PreparedSourceImage,
  AssetStatePill,
  AssetTypeGlyph,
  AssetConfidenceRail,
  AssetHoverIntelligence,
  CueStackRow,
} from "./BottomAssetDockAssetRenderers"


export type RecordingStatus = "idle" | "armed" | "starting" | "recording" | "stopped"




import {
  Archive,
  CircleDot,
  Clapperboard,
  HardDrive,
  Image,
  Keyboard,
  Layers3,
  LayoutGrid,
  List,
  Music2,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  Trash2,
  Video,
  Volume2,
} from "lucide-react"
import type { ProducerWorkspaceMode } from "./ProducerModeBar"

import type { PreviewBlock } from "./useProducerBlocks"
import { buildProducerAssetUrl } from "./producerAssetUrls"
import {
  type MediaAssetEditDraft,
  type MediaAssetRuntimeState,
  type RecordingSession,
  type RecordingStatusRow,
  type RecordingSourceOption,
  type SourceLibraryView,
  type UtilityPanel,
  type ProductionDrawerTab,
  type MixerChannelKey,
  AssetIntelligenceHeader,
  SourceConfidenceStrip,
  TakeSafetyMatrix,
  RouteMappingPanel,
  TransitionCompatibilityPanel,
  TimelineStatePill,
  ActiveTakeQueuePanel,
  ProductionIntentPanel,
  OperatorConfidencePanel,
  MediaRow,
  SourceLibraryCard,
  CompactAudioMeter,
  AudioAssetRow,
  MixerStrip,
  ExpandedAudioMixerOverlay,
  CommRow,
  UtilityButton,
  UtilityOverlay,
  ExpandedRecordingOverlay,
  formatRecordingDuration,
} from "./BottomAssetDockWorkspaceParts"
import ProductionControlsDrawer from "./ProductionControlsDrawer"


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
  recordingStatus,
  recordingElapsedSeconds,
}: {
  mediaRows: BroadcastAssetTelemetry[]
  recordingStatus: RecordingStatus
  recordingElapsedSeconds: number
}): JSX.Element {
  return (
    <div className="grid gap-2 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-2">
        <ProductionIntentPanel />

        <OperationsRackPanel
          mediaRows={mediaRows}
          recordingStatus={recordingStatus}
        />
      </div>

      <div className="space-y-2">
        <OperationsTelemetryPanel
          recordingStatus={recordingStatus}
          recordingElapsedSeconds={recordingElapsedSeconds}
        />

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
                <span className="text-[10px] font-semibold text-white/42">
                  {label}
                </span>

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
function OperationsTelemetryPanel({
  recordingStatus,
  recordingElapsedSeconds,
}: {
  recordingStatus: RecordingStatus
  recordingElapsedSeconds: number
}): JSX.Element {
  const recordingActive =
    recordingStatus === "recording" || recordingStatus === "starting"

  return (
    <div className="rounded-[16px] border border-white/[0.045] bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.010))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.045] pb-2">
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
            Operations + Recording
          </div>

          <div className="mt-1 text-[12px] font-semibold tracking-[-0.02em] text-white/72">
            System telemetry and archive state
          </div>
        </div>

        <div
          className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.10em] ${
            recordingActive
              ? "border-red-300/18 bg-red-400/[0.080] text-red-100/68"
              : "border-emerald-300/14 bg-emerald-400/[0.060] text-emerald-100/60"
          }`}
        >
          {recordingActive ? "Recording Live" : "Archive Ready"}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          {
            label: "Recording",
            value: recordingActive
              ? formatRecordingDuration(recordingElapsedSeconds)
              : "Standby",
            active: recordingActive,
          },
          { label: "Archive", value: "Connected", active: true },
          { label: "Safety", value: "Nominal", active: true },
          { label: "Recovery", value: "Prepared", active: true },
        ].map(({ label, value, active }) => (
          <div
            key={label}
            className={`rounded-[11px] border px-3 py-2 ${
              active
                ? "border-white/[0.050] bg-white/[0.018]"
                : "border-white/[0.035] bg-black/18"
            }`}
          >
            <div className="text-[7px] font-black uppercase tracking-[0.12em] text-white/24">
              {label}
            </div>

            <div className="mt-1 text-[11px] font-black uppercase tracking-[0.08em] text-white/66">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1">
        {[
          ["REC", "Live"],
          ["ISO", "Ready"],
          ["Backup", "Hot"],
          ["Cloud", "Sync"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[10px] border border-white/[0.040] bg-black/18 px-2 py-1.5 text-center"
          >
            <div className="text-[6px] font-black uppercase tracking-[0.10em] text-white/20">
              {label}
            </div>

            <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.08em] text-white/52">
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
function OperationsRackPanel({
  mediaRows,
  recordingStatus,
}: {
  mediaRows: BroadcastAssetTelemetry[]
  recordingStatus: RecordingStatus
}): JSX.Element {
  const recordingActive =
    recordingStatus === "recording" || recordingStatus === "starting"

  const routedCount = mediaRows.filter((asset) => asset.routeLock).length
  const safeTakeCount = mediaRows.filter((asset) => asset.takeSafe !== false).length
  const warningCount = mediaRows.filter((asset) => asset.takeSafe === false).length

  return (
    <div className="relative overflow-hidden rounded-[16px] border border-violet-300/[0.075] bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.060),transparent_34%),linear-gradient(180deg,rgba(18,16,30,0.78),rgba(6,8,15,0.92))] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.020)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.010)_42%,transparent_64%)]" />

      <div className="relative z-10 flex items-start justify-between gap-3 border-b border-white/[0.045] pb-2">
        <div>
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.14em] text-violet-100/42">
            <Radio size={11} />
            Operations Rack
          </div>

          <div className="mt-1 text-[12px] font-semibold tracking-[-0.02em] text-white/72">
            Sources, routing, and stage readiness
          </div>
        </div>

        <div
          className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.10em] ${
            recordingActive
              ? "border-red-300/18 bg-red-400/[0.080] text-red-100/68"
              : "border-emerald-300/14 bg-emerald-400/[0.060] text-emerald-100/60"
          }`}
        >
          {recordingActive ? "Live Capture" : "Nominal"}
        </div>
      </div>

      <div className="relative z-10 mt-3 grid grid-cols-4 gap-1.5 text-center">
        {[
          {
            label: "Assets",
            value: mediaRows.length,
            tone: "text-sky-100/70",
          },
          {
            label: "Routed",
            value: routedCount,
            tone: "text-violet-100/70",
          },
          {
            label: "Safe",
            value: safeTakeCount,
            tone: "text-emerald-100/70",
          },
          {
            label: "Review",
            value: warningCount,
            tone: warningCount > 0
              ? "text-amber-100/72"
              : "text-white/44",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[11px] border border-white/[0.045] bg-white/[0.018] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.012)]"
          >
            <div
              className={`text-[15px] font-black tracking-[-0.04em] ${item.tone}`}
            >
              {item.value}
            </div>

            <div className="mt-0.5 text-[6px] font-black uppercase tracking-[0.10em] text-white/28">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-3 grid gap-1.5 sm:grid-cols-2">
        {[
          [
            "Stage Readiness",
            warningCount > 0 ? "Review" : "Green",
          ],
          [
            "Route Health",
            routedCount > 0 ? "Mapped" : "Open",
          ],
          [
            "Capture Link",
            recordingActive ? "Recording" : "Ready",
          ],
          ["Fallback State", "Prepared"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-[10px] border border-white/[0.040] bg-black/18 px-2.5 py-1.5"
          >
            <span className="text-[9px] font-semibold text-white/38">
              {label}
            </span>

            <span className="text-[8px] font-black uppercase tracking-[0.10em] text-emerald-100/54">
              {value}
            </span>
          </div>
        ))}
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

  function buildPreviewBlockFromAsset(
    asset: BroadcastAssetTelemetry,
    blockId: string,
  ): PreviewBlock {
    const blockType: PreviewBlock["type"] =
      asset.type === "graphic" ? "image" : asset.type === "video" ? "video" : "text"

    return {
      id: blockId,
      type: blockType,
      x: 24,
      y: 24,
      width: blockType === "text" ? 320 : 420,
      height: blockType === "text" ? 120 : 236,
      zIndex: 1,
      opacity: 1,
      scale: 1,
      rotation: 0,
      label: asset.label,
      src: asset.imageUrl ?? null,
      content: blockType === "text" ? asset.label : null,
      hidden: false,
      locked: false,
      groupId: null,
      blendMode: "normal",
      timelineStartMs: 0,
      timelineDurationMs: 4000,
    }
  }

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
  draggable={asset.type !== "audio" && asset.type !== "live"}
  onClick={() => onSelectAsset(asset.label)}
  onDragStart={(event) => {
    if (asset.type === "audio" || asset.type === "live") return

    const block = buildPreviewBlockFromAsset(
      asset,
      `drag-asset-${crypto.randomUUID()}`,
    )

    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData("application/x-jupiter-preview-block", JSON.stringify(block))
    event.dataTransfer.setData("text/plain", asset.label)
  }}
  onMouseEnter={() => setHoverPreviewAssetLabel(asset.label)}
  onMouseLeave={() =>
    setHoverPreviewAssetLabel((current) =>
      current === asset.label ? null : current
    )
  }
                  className={`relative grid grid-cols-[28px_minmax(0,1fr)_72px] items-center gap-1.5 rounded-[9px] border px-2 py-1.5 text-left transition-all duration-300 ease-out hover:-translate-y-px active:translate-y-0 ${asset.type !== "audio" && asset.type !== "live" ? "cursor-grab active:cursor-grabbing" : ""} ${
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
  <div className="absolute bottom-1 left-1 rounded bg-black/45 px-1 py-0.5 text-[7px] font-black tabular-nums text-white/68">
    {asset.duration}
  </div>
  {asset.type !== "audio" && asset.type !== "live" ? (
    <div className="absolute right-1 top-1 rounded-full border border-sky-200/20 bg-sky-400/[0.16] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.10em] text-sky-50/70 shadow-[0_0_12px_rgba(56,189,248,0.16)] opacity-0 transition group-hover:opacity-100">
      Drag
    </div>
  ) : null}
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
  workspaceMode,
  scenes,
  selectedSceneId,
  programSceneId,
  hotkeySceneId,
  previewBlocks,
  localMicLevel,
  eventId,
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
  previewProgramDifferent,
  takeBusy,
  onTakeProgram,
  onRecordingHealthChange,
}: {
  workspaceMode: ProducerWorkspaceMode
  scenes: SceneSummary[]
  selectedSceneId: string | null
  programSceneId: string | null
  programSlideLabel: string | null
  hotkeySceneId: string | null
  previewBlocks: PreviewBlock[]
  localMicLevel?: number
  eventId: string
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
  previewProgramDifferent: boolean
  takeBusy: boolean
  onTakeProgram?: (mode: "cut" | "auto") => Promise<boolean>
  onRecordingHealthChange?: (status: RecordingStatus, error: string | null) => void
}): JSX.Element {
  const [activeUtilityPanel, setActiveUtilityPanel] = useState<UtilityPanel | null>(null)
  const [productionDrawerTab, setProductionDrawerTab] = useState<ProductionDrawerTab | null>(null)
  const [expandedMediaOpen, setExpandedMediaOpen] = useState(false)
  const [sourceLibraryView, setSourceLibraryView] = useState<SourceLibraryView>("blocks")
  const mediaImportInputRef = useRef<HTMLInputElement | null>(null)
  const [importedMediaAssets, setImportedMediaAssets] = useState<BroadcastAssetTelemetry[]>([])
  const [mediaImportBusy, setMediaImportBusy] = useState(false)
  const [mediaImportError, setMediaImportError] = useState<string | null>(null)
  const [deletingMediaAssetId, setDeletingMediaAssetId] = useState<string | null>(null)
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
    const savedView = window.localStorage.getItem("jupiter:producer-source-library-view")
    if (savedView === "icons" || savedView === "list" || savedView === "blocks") {
      setSourceLibraryView(savedView)
    }
  }, [])

  const updateSourceLibraryView = useCallback((view: SourceLibraryView) => {
    setSourceLibraryView(view)
    window.localStorage.setItem("jupiter:producer-source-library-view", view)
  }, [])
  useEffect(() => {
    let cancelled = false

    async function loadSavedAssets(): Promise<void> {
      const response = await fetch(`/api/admin/events/${eventId}/live/assets/commit`, {
        cache: "no-store",
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok || cancelled) return

      const savedAssets: BroadcastAssetTelemetry[] = (payload?.assets ?? []).map(
        (asset: {
          id: string
          asset_type: "image" | "video" | "pdf"
          label: string
          storage_path: string
          signed_url?: string | null
          public_url?: string | null
          mime_type?: string | null
          byte_size?: number | null
        }, index: number) => ({
          id: String(asset.id),
          label: asset.label || `Saved source ${index + 1}`,
          type: asset.asset_type === "video" ? "video" : "graphic",
          state: "PRELOADED",
          duration: asset.asset_type === "pdf" ? "PDF" : asset.asset_type === "image" ? "16:9" : "—",
          meta: formatFileSize(Number(asset.byte_size || 0)),
          route: "Saved",
          lastPlayed: "Not Played",
          linkedScene: "Unassigned",
          imageUrl: asset.mime_type?.startsWith("image/")
            ? buildProducerAssetUrl(eventId, asset.storage_path)
            : null,
          storagePath: asset.storage_path,
          audioEmbedded: asset.asset_type === "video",
          destination: "STANDBY",
          takeSafe: true,
          cueOrder: index + 1,
          progress: 0,
          scheduledIn: "Saved",
          resetBehavior: "Manual",
          cacheState: "HOT",
          codecState: "OK",
          routeLock: false,
          hoverHint: "Saved to the event source library",
          takeCompatibility: "Clean",
          segment: "Imported",
          trigger: "Manual",
        }),
      )

      setImportedMediaAssets((current) => {
        const currentIds = new Set(current.map((asset) => asset.id).filter(Boolean))
        return [...current, ...savedAssets.filter((asset) => !currentIds.has(asset.id))]
      })
    }

    void loadSavedAssets()
    return () => {
      cancelled = true
    }
  }, [eventId])
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
  const [dockTakeBusy, setDockTakeBusy] = useState(false)
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

async function handleTakeAsset(): Promise<void> {
  if (!previewProgramDifferent || takeBusy || dockTakeBusy) return

  const nextProgramLabel = previewMediaAssetLabel
  setDockTakeBusy(true)

  try {
    await onTakeProgram?.("auto")

    if (!nextProgramLabel) return

setTakeFlashAssetLabel(nextProgramLabel)
setTakeFlashProgramLabel(nextProgramLabel)

window.setTimeout(() => {
  setTakeFlashAssetLabel(null)
}, 320)

window.setTimeout(() => {
  setTakeFlashProgramLabel(null)
}, 650)
  setProgramMediaAssetLabel(nextProgramLabel)
  setPreviewMediaAssetLabel(null)
  setRuntimePaused(false)
  setMediaRuntimeByLabel((current) => ({
    ...current,
    [nextProgramLabel]: {
      isPlaying: true,
      startedAtMs: Date.now(),
      elapsedSeconds: current[nextProgramLabel]?.elapsedSeconds ?? 0,
    },
  }))
  } finally {
    setDockTakeBusy(false)
  }
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
      assetId: targetAsset.id ?? null,
      storagePath: targetAsset.storagePath ?? null,
      x: 12,
      y: 12,
      width: 76,
      height: 42.75,
      opacity: 1,
      zIndex: nextZIndex,
      groupId: "source-route",
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
  persisted?: { id: string; url: string; path: string },
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
    id: persisted?.id,
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
    imageUrl: isImage ? persisted?.url ?? URL.createObjectURL(file) : null,
    storagePath: persisted?.path ?? null,
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

async function handleImportMediaFiles(
  event: ChangeEvent<HTMLInputElement>,
): Promise<void> {
  const files = Array.from(event.target.files ?? [])

  if (!files.length) return
  event.target.value = ""
  setMediaImportBusy(true)
  setMediaImportError(null)
  setActiveMediaOrchestratorTab("assets")
  setExpandedMediaOpen(true)

  try {
    const supabase = createClient()
    const persistedAssets: BroadcastAssetTelemetry[] = []

    for (const [index, file] of files.entries()) {
      const assetType = file.type.startsWith("video/")
        ? "video"
        : file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
          ? "pdf"
          : "image"
      const prepareRes = await fetch(`/api/admin/events/${eventId}/live/assets/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, byteSize: file.size }),
      })
      const prepared = await prepareRes.json().catch((): null => null)
      if (!prepareRes.ok) throw new Error(prepared?.error || `Could not prepare ${file.name}`)

      const { error: uploadError } = await supabase.storage
        .from(prepared.bucket)
        .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type })
      if (uploadError) throw uploadError

      const label = file.name.replace(/\.[^/.]+$/, "") || `Imported Asset ${index + 1}`
      const commitRes = await fetch(`/api/admin/events/${eventId}/live/assets/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: prepared.path,
          label,
          mimeType: file.type,
          byteSize: file.size,
          assetType,
        }),
      })
      const committed = await commitRes.json().catch((): null => null)
      if (!commitRes.ok) throw new Error(committed?.error || `Could not save ${file.name}`)

      persistedAssets.push(createImportedMediaAsset(file, index, {
        id: String(committed.asset.id),
        url: buildProducerAssetUrl(eventId, String(committed.asset.storage_path)),
        path: String(committed.asset.storage_path),
      }))
    }

    setImportedMediaAssets((current) => [...persistedAssets, ...current])
  } catch (error) {
    setMediaImportError(error instanceof Error ? error.message : "The source could not be imported")
  } finally {
    setMediaImportBusy(false)
  }
}

async function handleDeleteImportedAsset(label: string): Promise<void> {
  const removedAsset = importedMediaAssets.find((asset) => asset.label === label)
  if (!removedAsset) return

  const confirmed = window.confirm(
    `Delete “${label}” permanently from this event's source library? This cannot be undone.`,
  )
  if (!confirmed) return

  setMediaImportError(null)
  setDeletingMediaAssetId(removedAsset.id ?? label)

  try {
    if (removedAsset.id) {
      const response = await fetch(`/api/admin/events/${eventId}/live/assets/commit`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: removedAsset.id }),
      })
      const payload = await response.json().catch((): null => null)
      if (!response.ok) {
        throw new Error(payload?.error || "The source could not be deleted")
      }
    }

  setImportedMediaAssets((current) => {
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
  } catch (error) {
    setMediaImportError(error instanceof Error ? error.message : "The source could not be deleted")
  } finally {
    setDeletingMediaAssetId(null)
  }
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

  useEffect(() => {
    onRecordingHealthChange?.(recordingStatus, recordingError)
  }, [onRecordingHealthChange, recordingError, recordingStatus])

  useEffect(() => {
    let cancelled = false

    async function restoreRecordingState(): Promise<void> {
      try {
        const response = await fetch("/api/livekit/recording/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        })
        const data = await response.json().catch((): null => null)
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Recording state could not be restored")
        }
        if (cancelled) return

        const history: RecordingStatusRow[] = Array.isArray(data.recordings)
          ? data.recordings
          : []
        setRecordings(history.map((recording, index): RecordingSession => {
          const startedAt = String(recording.started_at || new Date().toISOString())
          const endedAt = recording.ended_at ? String(recording.ended_at) : null
          const durationSeconds = endedAt
            ? Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000))
            : 0
          const status = String(recording.status || "")
          return {
            id: String(recording.id),
            label: `Program Recording ${history.length - index}`,
            startedAt,
            endedAt,
            durationSeconds,
            source: String(recording.source || "Program Feed"),
            destination: String(recording.destination || "Jupiter Cloud"),
            quality: String(recording.quality || "1080p Standard"),
            egressId: recording.egress_id ? String(recording.egress_id) : null,
            file: recording.file_name ? String(recording.file_name) : null,
            location: recording.file_location ? String(recording.file_location) : null,
            size: recording.file_size == null ? null : String(recording.file_size),
            status: status === "complete"
              ? "ready"
              : status === "starting" || status === "active" || status === "ending"
                ? "recording"
                : "failed",
          }
        }))

        if (data.active && data.egressId) {
          const active = history.find((recording) => recording.egress_id === data.egressId)
          const startedAt = active?.started_at
            ? new Date(active.started_at).getTime()
            : Date.now()
          setActiveEgressId(String(data.egressId))
          setRecordingStartedAt(startedAt)
          setRecordingNow(Date.now())
          setRecordingStatus("recording")
        }
      } catch (error) {
        if (!cancelled) {
          setRecordingError(error instanceof Error ? error.message : "Recording state could not be restored")
        }
      }
    }

    void restoreRecordingState()
    return () => {
      cancelled = true
    }
  }, [eventId])
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
          eventId,
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
        body: JSON.stringify({ eventId, egressId }),
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
    if (!window.confirm("Stop the active recording? Jupiter will finalize and upload the captured file.")) return

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
            eventId,
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
      {productionDrawerTab ? (
        <ProductionControlsDrawer
          activeTab={productionDrawerTab}
          onTabChange={setProductionDrawerTab}
          onClose={() => setProductionDrawerTab(null)}
          audioChannels={[
            ["Program", programLevel],
            ["Stage", stageLevel],
            ["Music", musicLevel],
            ["Mics", micLevelPercent],
            ["SFX", sfxLevel],
            ["Audience", audienceLevel],
          ].map(([id, level]) => ({
            id: String(id),
            label: String(id),
            level: Number(level),
            muted: mutedChannels[id as MixerChannelKey],
            solo: soloChannel === id,
          }))}
          onToggleMute={(channel) => toggleMutedChannel(channel as MixerChannelKey)}
          onToggleSolo={(channel) => toggleSoloChannel(channel as MixerChannelKey)}
          recordingStatus={recordingStatus}
          recordingElapsedSeconds={recordingElapsedSeconds}
          recordings={recordings}
          recordingError={recordingError}
          recordingSource={recordingSource}
          recordingDestination={recordingDestination}
          recordingQuality={recordingQuality}
          onRecordingSourceChange={setRecordingSource}
          onRecordingDestinationChange={setRecordingDestination}
          onRecordingQualityChange={setRecordingQuality}
          onArmRecording={armRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />
      ) : null}
      {expandedMediaOpen ? (
        <div className="fixed bottom-5 left-3 right-3 z-[999] flex h-[430px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[18px] border border-white/[0.12] bg-[#050914]/[0.99] shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-2xl lg:left-[84px] lg:right-5 lg:max-w-[calc(100vw-104px)]">
          <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-white/[0.07] px-5">
            <div>
              <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-sky-200/55">
                Source preparation
              </div>
              <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.035em] text-white/92">
                Choose a source, prepare it, then send it to Preview.
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => mediaImportInputRef.current?.click()}
                disabled={mediaImportBusy}
                className="h-9 rounded-[10px] border border-white/[0.10] bg-white/[0.045] px-4 text-[10px] font-semibold text-white/74 transition hover:bg-white/[0.08] hover:text-white"
              >
                {mediaImportBusy ? "Importing…" : "Import source"}
              </button>
              <button
                type="button"
                onClick={() => setExpandedMediaOpen(false)}
                className="h-9 rounded-[10px] border border-white/[0.08] px-4 text-[10px] font-semibold text-white/48 transition hover:bg-white/[0.05] hover:text-white/80"
              >
                Close
              </button>
            </div>
          </header>

          {mediaImportError ? (
            <div className="border-b border-red-300/10 bg-red-400/[0.08] px-5 py-2 text-[10px] font-medium text-red-100/80">
              {mediaImportError}
            </div>
          ) : null}
          <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.65fr)]">
            <section className="min-h-0 overflow-y-auto border-r border-white/[0.07] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-semibold text-white/78">Source library</h3>
                  <p className="mt-0.5 text-[9px] text-white/34">
                    {orchestratedMediaRows.length} available · select one to inspect
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-[9px] border border-white/[0.08] bg-black/20 p-0.5" aria-label="Source library layout">
                    {([
                      ["icons", LayoutGrid, "Icon view"],
                      ["list", List, "List view"],
                      ["blocks", Layers3, "Block view"],
                    ] as const).map(([view, Icon, label]) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => updateSourceLibraryView(view)}
                        className={`grid h-7 w-8 place-items-center rounded-[7px] transition ${sourceLibraryView === view ? "bg-sky-400/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.18)]" : "text-white/34 hover:bg-white/[0.06] hover:text-white/68"}`}
                        title={label}
                        aria-label={label}
                        aria-pressed={sourceLibraryView === view}
                      >
                        <Icon size={13} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <div className="hidden items-center gap-3 text-[8px] font-medium text-white/32 xl:flex">
                    <span>1 · Choose</span>
                    <span>2 · Prepare</span>
                    <span className="text-sky-200/65">3 · Preview</span>
                  </div>
                </div>
              </div>

              {orchestratedMediaRows.length ? (
                <div className={`grid gap-2 ${sourceLibraryView === "icons" ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : sourceLibraryView === "list" ? "grid-cols-1" : "sm:grid-cols-2 2xl:grid-cols-3"}`}>
                  {orchestratedMediaRows.map((asset) => (
                    <SourceLibraryCard
                      key={`${asset.label}-${asset.type}`}
                      asset={asset}
                      selected={selectedMediaAsset?.label === asset.label}
                      inPreview={previewMediaAssetLabel === asset.label}
                      onSelect={() => setSelectedMediaAssetLabel(asset.label)}
                      onSendToPreview={() => handleSelectMediaAssetForPreview(asset.label)}
                      onDelete={
                        isImportedMediaAsset(asset.label)
                          ? () => void handleDeleteImportedAsset(asset.label)
                          : undefined
                      }
                      deleting={deletingMediaAssetId === (asset.id ?? asset.label)}
                      viewMode={sourceLibraryView}
                    />
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => mediaImportInputRef.current?.click()}
                  className="flex h-[220px] w-full items-center justify-center rounded-[14px] border border-dashed border-white/[0.12] text-[11px] font-medium text-white/40 transition hover:border-sky-300/30 hover:bg-sky-400/[0.025] hover:text-white/68"
                >
                  Import your first video, image, audio file, or PDF
                </button>
              )}
            </section>

            <aside className="flex min-h-0 flex-col p-4">
              <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/32">
                Prepared source
              </div>
              {selectedMediaAsset ? (
                <>
                  <div className="mt-3 flex h-[118px] w-full items-center justify-center overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#08101d] p-2 text-white/24 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
                    {selectedMediaAsset.imageUrl ? (
                      <div className="flex h-full max-w-[190px] items-center justify-center overflow-hidden rounded-[8px] border border-white/[0.06] bg-black/25 px-1.5">
                        <PreparedSourceImage
                          src={selectedMediaAsset.imageUrl}
                          label={selectedMediaAsset.label}
                        />
                      </div>
                    ) : selectedMediaAsset.type === "video" ? (
                      <Video size={28} />
                    ) : selectedMediaAsset.type === "audio" ? (
                      <Music2 size={28} />
                    ) : (
                      <Image size={28} />
                    )}
                  </div>
                  <h3 className="mt-3 truncate text-[15px] font-semibold tracking-[-0.025em] text-white/88">
                    {selectedMediaAsset.label}
                  </h3>
                  <p className="mt-1 text-[9px] leading-relaxed text-white/38">
                    {selectedMediaAsset.type} · {selectedMediaAsset.duration} · {selectedMediaAsset.meta}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-y border-white/[0.06] py-3 text-[9px]">
                    <div>
                      <div className="text-white/28">Scene</div>
                      <div className="mt-1 truncate text-white/62">{selectedMediaAsset.linkedScene}</div>
                    </div>
                    <div>
                      <div className="text-white/28">Status</div>
                      <div className="mt-1 text-white/62">
                        {previewMediaAssetLabel === selectedMediaAsset.label ? "In Preview" : "Ready"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto space-y-2 pt-4">
                    <button
                      type="button"
                      onClick={handleSendSelectedMediaAssetToPreview}
                      className="flex h-11 w-full items-center justify-center rounded-[11px] border border-sky-300/28 bg-sky-400/[0.13] text-[11px] font-semibold text-sky-50 transition hover:bg-sky-400/[0.20]"
                    >
                      {previewMediaAssetLabel === selectedMediaAsset.label
                        ? "Refresh in Preview"
                        : "Send to Preview"}
                    </button>
                    {isImportedMediaAsset(selectedMediaAsset.label) ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenMediaAssetEdit(selectedMediaAsset.label)}
                          className="h-8 rounded-[9px] border border-white/[0.08] text-[9px] font-medium text-white/45 hover:bg-white/[0.04] hover:text-white/72"
                        >
                          Edit details
                        </button>
                        <button
                          type="button"
                          disabled={deletingMediaAssetId === (selectedMediaAsset.id ?? selectedMediaAsset.label)}
                          onClick={() => void handleDeleteImportedAsset(selectedMediaAsset.label)}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[9px] border border-red-300/[0.14] bg-red-400/[0.035] text-[9px] font-medium text-red-100/52 hover:bg-red-400/[0.08] hover:text-red-100/82 disabled:cursor-wait disabled:opacity-45"
                        >
                          <Trash2 size={11} aria-hidden="true" />
                          {deletingMediaAssetId === (selectedMediaAsset.id ?? selectedMediaAsset.label)
                            ? "Deleting…"
                            : "Delete from library"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-center text-[10px] leading-relaxed text-white/32">
                  Select a source from the library to prepare it.
                </div>
              )}
            </aside>
          </div>
        </div>
      ) : null}
      
      <div className="relative z-10 grid min-h-0 flex-1 gap-2 overflow-hidden pb-2 xl:grid-cols-[0.72fr_3.9fr]">
<ConsolePanel
  title="Scene presets"
  action={
    <button
      type="button"
      onClick={onAddScene}
      disabled={!onAddScene}
      className="rounded-[8px] border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[8px] font-semibold text-white/52 transition hover:bg-white/[0.05] hover:text-white/78 disabled:cursor-not-allowed disabled:opacity-35"
    >
      New scene
    </button>
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
              className={`grid grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left transition ${
                active
                  ? "border-sky-300/24 bg-sky-400/[0.095] text-white shadow-[0_0_18px_rgba(56,189,248,0.10)]"
                  : "border-white/[0.045] bg-white/[0.014] text-white/62 hover:border-white/[0.075] hover:bg-white/[0.026]"
              }`}
            >
<div className="min-w-0 flex-1 overflow-hidden pr-2">
  {editingSceneId === scene.id ? (
    <input
      autoFocus
      value={sceneNameDraft}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
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
          event.preventDefault()
          event.stopPropagation()
          setEditingSceneId(null)
          setSceneNameDraft("")
        }

        if (event.key === "Enter") {
          event.preventDefault()
          event.stopPropagation()

          const trimmed = sceneNameDraft.trim()

          if (trimmed) {
            onRenameScene?.(scene.id, trimmed)
          }

          setEditingSceneId(null)
          setSceneNameDraft("")
        }
      }}
      className="w-full min-w-0 text-left rounded-[6px] border border-sky-300/18 bg-black/28 px-1.5 py-1 text-[10px] font-semibold tracking-[-0.02em] text-white/88 outline-none"
    />
  ) : (
    <span
      role="button"
      tabIndex={0}
      onDoubleClick={(event) => {
        event.stopPropagation()
        setEditingSceneId(scene.id)
        setSceneNameDraft(scene.name || "Untitled Scene")
      }}
      className="block w-full min-w-0 truncate text-left rounded-[6px] -mx-1 px-1 text-[10px] font-semibold tracking-[-0.02em] text-white/74 transition hover:bg-sky-300/[0.08] hover:text-white/92"
      title="Double-click to rename scene"
    >
      {scene.name || "Untitled Scene"}
    </span>
  )}
</div>

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

    <div>
      <button
        type="button"
        onClick={onSaveScene}
        disabled={!onSaveScene}
        className="w-full rounded-[9px] border border-sky-300/18 bg-sky-400/[0.075] px-2 py-2 text-[9px] font-semibold text-sky-100/72 transition hover:bg-sky-400/[0.12] disabled:cursor-not-allowed disabled:opacity-35"
      >
        Save current Preview as a scene
      </button>
    </div>
  </div>
</ConsolePanel>

<ConsolePanel
  title="Sources"
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
        className="rounded-[8px] border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[8px] font-semibold text-white/52 transition hover:bg-white/[0.05] hover:text-white/78"
      >
        Import
      </button>

      <button
        type="button"
        onClick={() => setExpandedMediaOpen(true)}
        className="rounded-[8px] border border-sky-300/16 bg-sky-400/[0.06] px-2.5 py-1 text-[8px] font-semibold text-sky-100/64 transition hover:bg-sky-400/[0.11] hover:text-sky-50"
      >
        Open library
      </button>
    </div>
  }
>
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-1.5 flex items-center justify-between border-b border-white/[0.065] pb-1.5">
              <p className="text-[9px] font-medium text-white/48">Choose a source, then send it to Preview</p>
              <span className="text-[8px] font-medium tabular-nums text-white/38">
                {mediaRows.length} available
              </span>
            </div>

            {mediaRows.length ? (
              <div className="grid min-h-[148px] grid-flow-col auto-cols-[220px] content-start justify-start gap-2 overflow-x-auto pb-1 pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(125,211,252,0.22)_transparent] 2xl:auto-cols-[240px]">
                {mediaRows.slice(0, 6).map((asset) => (
                  <SourceLibraryCard
                    key={`${asset.label}-${asset.type}`}
                    asset={asset}
                    selected={selectedMediaAsset?.label === asset.label}
                    inPreview={previewMediaAssetLabel === asset.label}
                    onSelect={() => setSelectedMediaAssetLabel(asset.label)}
                    onSendToPreview={() => handleSelectMediaAssetForPreview(asset.label)}
                    onDelete={
                      isImportedMediaAsset(asset.label)
                        ? () => void handleDeleteImportedAsset(asset.label)
                        : undefined
                    }
                    deleting={deletingMediaAssetId === (asset.id ?? asset.label)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid min-h-[126px] grid-cols-5 gap-2">
                {["Camera", "Slides", "Video", "Holding", "Screen"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => mediaImportInputRef.current?.click()}
                    className="group relative flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-dashed border-white/[0.10] bg-[#080d16] text-left transition hover:border-sky-300/28 hover:bg-[#0b1421]"
                  >
                    <div className="flex aspect-video w-full items-center justify-center border-b border-white/[0.05] bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.08),transparent_58%),#060b13] text-[18px] font-light text-white/18">
                      {index + 1}
                    </div>
                    <div className="px-2.5 py-2">
                      <div className="truncate text-[9px] font-semibold text-white/50">{label}</div>
                      <div className="mt-0.5 text-[7px] uppercase tracking-[0.08em] text-white/24">Awaiting source</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 pt-1.5">
              <div className="min-w-0">
                <div className="truncate text-[10px] font-semibold text-white/68">
                  {selectedMediaAsset?.label ?? "No source selected"}
                </div>
                <div className="mt-0.5 text-[8px] text-white/30">
                  {selectedMediaAsset
                    ? previewMediaAssetLabel === selectedMediaAsset.label
                      ? "Currently in Preview"
                      : "Ready to prepare"
                    : "Open the library to browse all sources"}
                </div>
              </div>
              <button
                type="button"
                disabled={!selectedMediaAsset}
                onClick={handleSendSelectedMediaAssetToPreview}
                className="h-9 rounded-[9px] border border-sky-300/24 bg-sky-400/[0.10] px-4 text-[9px] font-semibold text-sky-50/80 transition hover:bg-sky-400/[0.16] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Send to Preview
              </button>
              <button
                type="button"
                disabled={!previewProgramDifferent || takeBusy || dockTakeBusy}
                onClick={() => void handleTakeAsset()}
                className="h-9 min-w-[76px] rounded-[9px] border border-red-300/28 bg-red-500/[0.11] px-4 text-[9px] font-bold tracking-[0.04em] text-red-50/88 transition hover:bg-red-500/[0.18] disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.025] disabled:text-white/28"
              >
                {dockTakeBusy || takeBusy ? "TAKING" : "TAKE"}
              </button>
            </div>
          </div>
        </ConsolePanel>



      </div>

      {workspaceMode === "show" || workspaceMode === "advanced" ? (
      <div className="relative z-20 mt-1.5 grid shrink-0 gap-1.5 border-t border-white/[0.06] pt-1.5 xl:grid-cols-[minmax(0,1fr)_minmax(330px,0.62fr)]">
        <div className="grid grid-cols-4 gap-1.5">
          <CompactAudioMeter label="Program" level={programLevel} />
          <CompactAudioMeter label="Stage" level={stageLevel} />
          <CompactAudioMeter label="Mics" level={micLevelPercent} />
          <CompactAudioMeter label="Playback" level={musicLevel} />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <UtilityButton
            icon={<CircleDot size={15} />}
            label={recordingStatus === "recording" ? "Recording" : "Record"}
            meta={recordingStatus === "recording" ? formatRecordingDuration(recordingElapsedSeconds) : recordingStatus === "armed" ? "Armed" : "Off"}
            danger={recordingStatus === "recording" || recordingStatus === "starting"}
            onClick={() => setProductionDrawerTab("recording")}
          />
          <UtilityButton icon={<Radio size={16} />} label="Stream" meta="Setup" onClick={() => setActiveUtilityPanel("stream")} />
          <UtilityButton icon={<Layers3 size={16} />} label="Media" meta="Manage" onClick={() => setActiveUtilityPanel("overlays")} />
          <UtilityButton icon={<Volume2 size={16} />} label="Mixer" meta="Open" onClick={() => setProductionDrawerTab("audio")} />
        </div>
      </div>
      ) : null}
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
