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
      className={`rounded-2xl border px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${toneClass}`}
    >
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
    <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_34%),linear-gradient(180deg,rgba(9,15,32,0.96),rgba(3,7,16,0.99))] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="mb-4 overflow-hidden rounded-[28px] border border-violet-300/12 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-100/64">
              <Users size={13} />
              Talent Operations
            </div>

            <div className="mt-1 text-xl font-semibold tracking-tight text-white">
              Presenter Green Room
            </div>

            <div className="mt-1 text-sm leading-6 text-white/42">
              Route presenters, verify readiness, and manage live stage confidence.
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-300/16 bg-emerald-400/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/62 shadow-[0_0_18px_rgba(52,211,153,0.08)]">
            <CircleDot size={11} className="text-emerald-300" />
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
            label="IFB"
            value="Ready"
            tone="green"
          />

          <ReadinessCard
            label="Stage"
            value="Locked"
            tone="neutral"
          />

          <ReadinessCard
            label="Confidence"
            value="Live"
            tone="red"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-violet-300/12 bg-violet-400/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/58">
            <Headphones size={11} />
            IFB Active
          </div>

          <div className="flex items-center gap-2 rounded-full border border-sky-300/12 bg-sky-400/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-sky-100/58">
            <Radio size={11} />
            Confidence Routed
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-300/12 bg-emerald-400/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/58">
            <ShieldCheck size={11} />
            Talent Safe
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/24 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
            <Sparkles size={11} />
            Green Room Synced
          </div>
        </div>
      </div>

      <div className="space-y-2.5 rounded-[24px] border border-white/8 bg-black/18 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {children}
      </div>
    </div>
  )
}