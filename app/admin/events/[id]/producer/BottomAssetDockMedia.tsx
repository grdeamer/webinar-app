import { type JSX } from "react"

import {
  AssetRundownStrip,
  AssetStatePill,
  AssetTypeGlyph,
  AssetConfidenceRail,
  AssetHoverIntelligence,
  type BroadcastAssetTelemetry,
} from "./BottomAssetDockAssetRenderers"

import { Image, Music2, Radio, Trash2, Video } from "lucide-react"

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

export type SourceLibraryView = "icons" | "list" | "blocks"

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
