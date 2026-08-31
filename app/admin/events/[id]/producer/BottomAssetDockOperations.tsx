import { type JSX } from "react"

import { type BroadcastAssetTelemetry } from "./BottomAssetDockAssetRenderers"

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
