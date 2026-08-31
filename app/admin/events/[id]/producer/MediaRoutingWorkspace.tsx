import { type JSX } from "react"
import { type BroadcastAssetTelemetry } from "./BottomAssetDockAssetRenderers"
import {
  RouteMappingPanel,
  TakeSafetyMatrix,
  TransitionCompatibilityPanel,
} from "./BottomAssetDockWorkspaceParts"

export default function MediaRoutingWorkspace({
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
