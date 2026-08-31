import { type JSX } from "react"
import { type BroadcastAssetTelemetry } from "./BottomAssetDockAssetRenderers"
import {
  ActiveTakeQueuePanel,
  OperatorConfidencePanel,
} from "./BottomAssetDockWorkspaceParts"

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

export default function MediaTakeWorkspace({
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
