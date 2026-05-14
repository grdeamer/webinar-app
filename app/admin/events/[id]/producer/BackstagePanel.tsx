"use client"

import type { ReactNode } from "react"
import {
  CircleDot,
  Headphones,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"

function BackstageAtmosphere({ active }: { active: boolean }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-violet-300/7 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.018)_42%,transparent_64%)] animate-[backstageSignalSweep_12s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.055] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_7px)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/26 to-transparent" />

      {active ? (
        <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-200/30 to-transparent animate-[backstageReadinessRail_2.8s_ease-in-out_infinite]" />
      ) : null}
    </>
  )
}

function ReadinessCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "neutral" | "green" | "violet" | "red"
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-300/14 bg-emerald-400/8 text-emerald-100/70"
      : tone === "violet"
        ? "border-violet-300/14 bg-violet-400/8 text-violet-100/70"
        : tone === "red"
          ? "border-red-300/14 bg-red-400/8 text-red-100/70"
          : "border-white/10 bg-white/[0.035] text-white/64"

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${toneClass}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.022)_42%,transparent_64%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

      <div className="text-[8px] font-black uppercase tracking-[0.16em] opacity-65">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold tracking-tight text-white">
        {value}
      </div>
    </div>
  )
}

export default function BackstagePanel({
  participantCount,
  children,
}: {
  participantCount: number
  children: ReactNode
}) {
  return (
    <div className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.09),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.05),transparent_34%),linear-gradient(180deg,rgba(9,15,32,0.97),rgba(3,7,16,0.99))] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <BackstageAtmosphere active={participantCount > 0} />
      <div className="relative z-10 mb-4 overflow-hidden rounded-[28px] border border-violet-300/12 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.014))] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.018)_42%,transparent_64%)] animate-[backstageSignalSweep_13s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/24 to-transparent" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-100/64">
              <Users size={13} />
              Presenter Operations
            </div>

            <div className="mt-1 text-xl font-semibold tracking-tight text-white">
              Backstage
            </div>

            <div className="mt-1 text-sm leading-6 text-white/42">
              Prepare presenters and monitor backstage readiness.
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-300/16 bg-emerald-400/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/62 shadow-[0_0_12px_rgba(52,211,153,0.05)]">
            <CircleDot size={11} className="animate-pulse text-emerald-300" />
            {participantCount} Connected
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <ReadinessCard
            label="Talent"
            value={String(participantCount)}
            tone="violet"
          />

          <ReadinessCard
            label="Audio"
            value="Ready"
            tone="green"
          />

          <ReadinessCard
            label="Stage"
            value="Ready"
            tone="neutral"
          />

          <ReadinessCard
            label="Return"
            value="Ready"
            tone="red"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-violet-300/12 bg-violet-400/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/58">
            <Headphones size={11} />
            Audio Ready
          </div>

          <div className="flex items-center gap-2 rounded-full border border-sky-300/12 bg-sky-400/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-sky-100/58">
            <Radio size={11} />
            Return Ready
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-300/12 bg-emerald-400/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/58">
            <ShieldCheck size={11} />
            Presenters Ready
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/24 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
            <Sparkles size={11} />
            Backstage Stable
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-2.5 overflow-hidden rounded-[24px] border border-white/8 bg-black/18 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_20px)]" />
        <div className="relative z-10 space-y-2.5">
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes backstageSignalSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          46% {
            opacity: 0.42;
          }

          100% {
            transform: translateX(18%);
          }
        }

        @keyframes backstageReadinessRail {
          0%,
          100% {
            opacity: 0.2;
            transform: scaleX(0.72);
          }

          50% {
            opacity: 0.5;
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  )
}