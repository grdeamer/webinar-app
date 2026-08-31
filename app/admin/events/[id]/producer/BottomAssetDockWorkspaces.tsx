import { useState, type JSX } from "react"
import { Radio } from "lucide-react"
import {
  type BroadcastAssetTelemetry,
  AssetStatePill,
  AssetTypeGlyph,
} from "./BottomAssetDockAssetRenderers"
import type { PreviewBlock } from "./useProducerBlocks"
import {
  ProductionIntentPanel,
  OperatorConfidencePanel,
  ActiveTakeQueuePanel,
  RouteMappingPanel,
  TakeSafetyMatrix,
  TransitionCompatibilityPanel,
  formatRecordingDuration,
} from "./BottomAssetDockWorkspaceParts"
import type { RecordingStatus } from "./BottomAssetDock"

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



export function MediaOverviewWorkspace({
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

export function MediaAssetsWorkspace({
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


export function MediaTakeWorkspace({
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

export function MediaRoutingWorkspace({
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
