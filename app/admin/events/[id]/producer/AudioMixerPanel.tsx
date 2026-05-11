

"use client"

import type { JSX } from "react"
import { AudioLines, Gauge, Mic2 } from "lucide-react"

export function AudioMixerPanel({ localMicLevel }: { localMicLevel: number }): JSX.Element {
  const hostLevel = Math.max(2, Math.round(localMicLevel * 18))
  const programLevel = Math.max(3, Math.round(localMicLevel * 18))
  const masterLevel = Math.max(programLevel, 8)
  const clipActive = localMicLevel > 0.88
  const signalActive = localMicLevel > 0.08

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-emerald-200/20 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.20),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,rgba(8,31,26,0.86),rgba(2,8,12,0.98))] p-4 shadow-[0_24px_72px_rgba(0,0,0,0.36),0_0_38px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,0.07)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background:repeating-linear-gradient(0deg,rgba(255,255,255,0.9)_0px,rgba(255,255,255,0.9)_1px,transparent_1px,transparent_5px)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-100/45 to-transparent" />

      <div className="relative z-10 mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/76">
            <AudioLines size={14} />
            Audio Program
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/34">
            Confidence monitor · mix-minus · return feed
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${
              clipActive
                ? "border-red-200/38 bg-red-500/16 text-red-100 shadow-[0_0_22px_rgba(248,113,113,0.24)]"
                : signalActive
                  ? "border-emerald-200/32 bg-emerald-300/12 text-emerald-50"
                  : "border-white/10 bg-black/30 text-white/45"
            }`}
          >
            {clipActive ? "Clip" : signalActive ? "Mic Active" : "Standing By"}
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-3">
        {[
          { label: "Host", level: hostLevel, badge: "IFB", live: signalActive },
          { label: "Guest", level: 9, badge: "N-1", live: true },
          { label: "Program", level: programLevel, badge: "PGM", live: signalActive },
        ].map((row) => (
          <div key={row.label} className="rounded-[18px] border border-white/8 bg-black/24 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    row.live
                      ? "bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.65)] animate-pulse"
                      : "bg-white/20"
                  }`}
                />
                {row.label}
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/38">
                {row.badge}
              </span>
            </div>

            <div className="flex h-4 items-center gap-1 rounded-full border border-white/8 bg-black/55 px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {Array.from({ length: 18 }).map((_, index) => {
                const active = index < row.level

                return (
                  <div
                    key={`${row.label}-${index}`}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ease-out ${
                      active
                        ? index > 14
                          ? "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.55)]"
                          : index > 11
                            ? "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.48)]"
                            : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.48)]"
                        : "bg-white/10"
                    }`}
                    style={{
                      transform: active ? `scaleY(${index > 14 ? 1.18 : 1})` : "scaleY(0.82)",
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-4 rounded-[22px] border border-white/10 bg-black/28 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/42">
            <Gauge size={12} /> Master Output
          </div>
          <div
            className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] ${
              clipActive
                ? "border-red-300/24 bg-red-500/14 text-red-100"
                : "border-emerald-300/16 bg-emerald-400/8 text-emerald-100/64"
            }`}
          >
            {clipActive ? "Limiter Hit" : "Nominal"}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="flex h-5 items-center gap-1 rounded-full border border-white/8 bg-black/58 px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {Array.from({ length: 22 }).map((_, index) => {
              const active = index < masterLevel

              return (
                <div
                  key={`master-${index}`}
                  className={`h-2.5 flex-1 rounded-full transition-all duration-300 ${
                    active
                      ? index > 18
                        ? "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.55)]"
                        : index > 14
                          ? "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.45)]"
                          : "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]"
                      : "bg-white/10"
                  }`}
                />
              )
            })}
          </div>
          <div className="text-right text-[10px] font-black tabular-nums text-white/52">
            -{Math.max(6, 24 - masterLevel)} dB
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-[18px] border border-sky-300/14 bg-sky-400/8 p-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-sky-100/48">
            Monitor Bus
          </div>
          <div className="mt-1 text-xs font-semibold text-sky-50/75">Control Room</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[72%] rounded-full bg-sky-300/70 shadow-[0_0_12px_rgba(125,211,252,0.35)]" />
          </div>
        </div>
        <div className="rounded-[18px] border border-emerald-300/14 bg-emerald-400/8 p-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-emerald-100/48">
            Return
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-50/75">Clean Feed</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[86%] rounded-full bg-emerald-300/70 shadow-[0_0_12px_rgba(52,211,153,0.35)]" />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap gap-2">
        <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
          Space = TAKE
        </div>
        <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
          M = Talkback
        </div>
      </div>
    </div>
  )
}

export default AudioMixerPanel