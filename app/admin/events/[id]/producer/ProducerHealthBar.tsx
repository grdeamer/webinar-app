"use client"

import { AlertTriangle, Check, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react"
import type { JSX } from "react"
import type {
  ProducerHealthSnapshot,
  ProducerTransportHealth,
} from "./producerHealthUtils"

function HealthSignal({
  label,
  ready,
  pending = false,
}: {
  label: string
  ready: boolean
  pending?: boolean
}): JSX.Element {
  return (
    <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.10em] text-white/46">
      <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${
        pending
          ? "border-sky-300/18 bg-sky-400/[0.08] text-sky-200"
          : ready
            ? "border-emerald-300/16 bg-emerald-400/[0.07] text-emerald-200"
            : "border-amber-300/18 bg-amber-400/[0.08] text-amber-200"
      }`}>
        {pending ? <LoaderCircle className="animate-spin" size={9} /> : ready ? <Check size={9} /> : <AlertTriangle size={9} />}
      </span>
      {label}
    </div>
  )
}

export default function ProducerHealthBar({
  snapshot,
  transportHealth,
  recordingStatus,
  recordingError,
  recoveryBusy,
  onRecover,
}: {
  snapshot: ProducerHealthSnapshot
  transportHealth: ProducerTransportHealth
  recordingStatus: string
  recordingError: string | null
  recoveryBusy: boolean
  onRecover: () => void
}): JSX.Element {
  const needsAttention = snapshot.overall !== "healthy" || Boolean(recordingError)
  const transportPending = transportHealth === "connecting" || transportHealth === "recovering"

  return (
    <div className="relative z-[80] shrink-0 border-b border-white/[0.055] bg-[#050914]/96 px-3 py-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.16)] md:px-4">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em] ${
            needsAttention ? "text-amber-100/68" : "text-emerald-100/62"
          }`}>
            {needsAttention ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
            {needsAttention ? "Health attention" : "Control plane healthy"}
          </div>

          <div className="hidden items-center gap-3 border-l border-white/[0.06] pl-3 sm:flex">
            <HealthSignal label="Transport" ready={transportHealth === "connected"} pending={transportPending} />
            <HealthSignal label="Preview" ready={snapshot.previewReady} />
            <HealthSignal label="Program" ready={snapshot.programReady} />
            <HealthSignal label="Stage" ready={snapshot.stageReady} />
            <HealthSignal label={`Record ${recordingStatus}`} ready={!recordingError} pending={recordingStatus === "starting"} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {snapshot.issues.length > 0 || recordingError ? (
            <details className="group relative">
              <summary className="cursor-pointer list-none rounded-[8px] border border-amber-300/14 bg-amber-400/[0.06] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.10em] text-amber-100/62 transition hover:bg-amber-400/[0.10]">
                {snapshot.issues.length + (recordingError ? 1 : 0)} issue{snapshot.issues.length + (recordingError ? 1 : 0) === 1 ? "" : "s"}
              </summary>
              <div className="absolute right-0 top-9 z-[400] w-[min(420px,calc(100vw-24px))] rounded-[16px] border border-white/[0.10] bg-[#070b14]/[0.995] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.72)]">
                {[...snapshot.issues, ...(recordingError ? [{ id: "recording", label: "Recording pipeline error", detail: recordingError, severity: "critical" as const }] : [])].map((issue) => (
                  <div key={issue.id} className="rounded-[11px] border border-white/[0.055] bg-white/[0.025] px-3 py-2.5 [&+&]:mt-1.5">
                    <div className={`text-[9px] font-bold ${issue.severity === "critical" ? "text-red-100/76" : "text-amber-100/72"}`}>{issue.label}</div>
                    <div className="mt-1 text-[9px] leading-4 text-white/38">{issue.detail}</div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          <button
            type="button"
            onClick={onRecover}
            disabled={recoveryBusy}
            className="flex items-center gap-1.5 rounded-[8px] border border-sky-300/14 bg-sky-400/[0.06] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.10em] text-sky-100/62 transition hover:bg-sky-400/[0.11] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className={recoveryBusy ? "animate-spin" : ""} size={10} />
            {recoveryBusy ? "Recovering" : "Recover"}
          </button>
        </div>
      </div>
    </div>
  )
}
