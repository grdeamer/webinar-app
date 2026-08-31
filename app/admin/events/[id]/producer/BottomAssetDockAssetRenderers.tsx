import { useState, type JSX } from "react"
import { Image, Video, FileImage, Waves, Radio } from "lucide-react"

export type BroadcastAssetType = "video" | "graphic" | "audio" | "live"
export type BroadcastAssetState = "READY" | "LIVE" | "LOOPING" | "STANDBY" | "CUED" | "SAFE" | "PRELOADED" | "FAILED"

export type BroadcastAssetTelemetry = {
  id?: string
  label: string
  type: BroadcastAssetType
  state: BroadcastAssetState
  duration: string
  meta: string
  route: string
  lastPlayed: string
  linkedScene: string
  imageUrl?: string | null
  storagePath?: string | null
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

export function AssetRundownStrip({ asset }: { asset: BroadcastAssetTelemetry }): JSX.Element {
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

export function ConsolePanel({
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

export function ScenePreviewTile({
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

export function PreparedSourceImage({
  src,
  label,
}: {
  src: string
  label: string
}): JSX.Element {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const failed = failedSrc === src

  if (failed) {
    return (
      <div className="flex h-full min-h-[128px] w-full flex-col items-center justify-center px-5 text-center">
        <Image size={25} className="text-white/28" aria-hidden="true" />
        <div className="mt-3 text-[10px] font-semibold text-white/62">Source preview unavailable</div>
        <div className="mt-1 max-w-[220px] text-[9px] leading-relaxed text-white/36">
          Re-import {label} once to save it permanently to this event.
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`${label} preview`}
      className="h-full w-full object-contain"
      onError={() => setFailedSrc(src)}
    />
  )
}

export function AssetStatePill({ state }: { state: BroadcastAssetState }): JSX.Element {
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

export function AssetTypeGlyph({ type }: { type: BroadcastAssetType }): JSX.Element {
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

export function AssetConfidenceRail({ asset }: { asset: BroadcastAssetTelemetry }): JSX.Element {
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

export function AssetHoverIntelligence({ asset }: { asset: BroadcastAssetTelemetry }): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-1 bottom-1 translate-y-1 rounded-[8px] border border-white/[0.050] bg-black/62 px-1.5 py-1 opacity-0 shadow-[0_8px_22px_rgba(0,0,0,0.34)] backdrop-blur-md transition duration-150 group-hover:translate-y-0 group-hover:opacity-100">
      <div className="flex items-center justify-between gap-1 text-[6.5px] font-black uppercase tracking-[0.08em] text-white/42">
        <span className="truncate">{asset.hoverHint ?? "Preview confidence available"}</span>
        <span className="shrink-0 text-sky-100/50">{asset.takeCompatibility ?? "Clean"}</span>
      </div>
    </div>
  )
}

export function CueStackRow({ asset }: { asset: BroadcastAssetTelemetry }): JSX.Element {
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
      <div className="grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2">
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

