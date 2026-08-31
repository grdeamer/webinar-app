import { type JSX } from "react"
import { Radio } from "lucide-react"
import { type BroadcastAssetTelemetry } from "./BottomAssetDockAssetRenderers"
import {
  ProductionIntentPanel,
  OperatorConfidencePanel,
  formatRecordingDuration,
} from "./BottomAssetDockWorkspaceParts"
import type { RecordingStatus } from "./BottomAssetDock"

export default function MediaOverviewWorkspace({
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
