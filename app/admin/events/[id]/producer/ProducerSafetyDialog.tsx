"use client"

import { AlertTriangle, Check, Radio, ShieldAlert } from "lucide-react"
import type { JSX } from "react"

export type ProducerSafetyAction = "go_live" | "go_off_air"

type SafetyCheck = {
  label: string
  detail: string
  ready: boolean
  required?: boolean
}

export default function ProducerSafetyDialog({
  action,
  checks,
  busy,
  onCancel,
  onConfirm,
}: {
  action: ProducerSafetyAction
  checks: SafetyCheck[]
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}): JSX.Element {
  const goingLive = action === "go_live"
  const blockingChecks = checks.filter((check) => check.required && !check.ready)
  const warnings = checks.filter((check) => !check.required && !check.ready)
  const confirmationDisabled = busy || blockingChecks.length > 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="producer-safety-title"
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#010308]/78 px-4 py-8 backdrop-blur-md"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) onCancel()
      }}
    >
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-[22px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(13,18,30,0.995),rgba(4,7,14,0.998))] shadow-[0_36px_110px_rgba(0,0,0,0.76),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div
          className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${
            goingLive ? "via-emerald-200/50" : "via-red-200/50"
          } to-transparent`}
        />

        <div className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border ${
                goingLive
                  ? "border-emerald-300/20 bg-emerald-400/[0.10] text-emerald-100"
                  : "border-red-300/20 bg-red-400/[0.10] text-red-100"
              }`}
            >
              {goingLive ? <Radio size={20} /> : <ShieldAlert size={20} />}
            </div>

            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/38">
                Operator confirmation
              </div>
              <h2 id="producer-safety-title" className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-white/94">
                {goingLive ? "Send Program to the audience?" : "Take the event off air?"}
              </h2>
              <p className="mt-2 text-[12px] leading-5 text-white/48">
                {goingLive
                  ? "Jupiter will expose the current Program output to attendees. Preview remains private until the next TAKE."
                  : "Attendees will leave Program and return to the holding experience. The Producer Room will remain connected."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 px-5 py-4 sm:px-6">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-center justify-between gap-4 rounded-[13px] border border-white/[0.06] bg-white/[0.025] px-3.5 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    check.ready
                      ? "border-emerald-300/18 bg-emerald-400/[0.09] text-emerald-200"
                      : check.required
                        ? "border-red-300/20 bg-red-400/[0.10] text-red-200"
                        : "border-amber-300/20 bg-amber-400/[0.09] text-amber-200"
                  }`}
                >
                  {check.ready ? <Check size={13} /> : <AlertTriangle size={13} />}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white/78">{check.label}</div>
                  <div className="mt-0.5 text-[9px] leading-4 text-white/34">{check.detail}</div>
                </div>
              </div>
              <span className={`shrink-0 text-[8px] font-bold uppercase tracking-[0.12em] ${
                check.ready ? "text-emerald-200/64" : check.required ? "text-red-200/72" : "text-amber-200/68"
              }`}>
                {check.ready ? "Ready" : check.required ? "Required" : "Warning"}
              </span>
            </div>
          ))}

          {warnings.length > 0 && blockingChecks.length === 0 ? (
            <p className="px-1 pt-1 text-[10px] leading-4 text-amber-100/52">
              You can continue with warnings, but confirm the output intentionally.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] px-5 py-4 sm:px-6">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-w-[96px] rounded-[10px] border border-white/[0.09] bg-white/[0.025] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.10em] text-white/58 transition hover:bg-white/[0.05] hover:text-white/82 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            disabled={confirmationDisabled}
            onClick={onConfirm}
            className={`min-w-[168px] rounded-[10px] border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.10em] transition disabled:cursor-not-allowed disabled:opacity-35 ${
              goingLive
                ? "border-emerald-300/22 bg-emerald-400/[0.13] text-emerald-50 hover:bg-emerald-400/[0.19]"
                : "border-red-300/22 bg-red-400/[0.13] text-red-50 hover:bg-red-400/[0.19]"
            }`}
          >
            {busy ? "Applying…" : goingLive ? "Confirm Go Live" : "Confirm Off Air"}
          </button>
        </div>
      </div>
    </div>
  )
}
