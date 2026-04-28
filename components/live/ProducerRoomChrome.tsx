"use client"

import type { ReactNode } from "react"
import {
  Activity,
  Clapperboard,
  Layers3,
  MessageSquareText,
  MonitorPlay,
  Radio,
  Settings,
  UsersRound,
} from "lucide-react"

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">
      {children}
    </div>
  )
}

export function GlassPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        "rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </div>
  )
}

export function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "sky" | "red" | "emerald" | "amber"
}) {
  const toneClass =
    tone === "sky"
      ? "border-sky-400/20 bg-sky-400/10 text-sky-100"
      : tone === "red"
        ? "border-red-400/25 bg-red-500/10 text-red-100"
        : tone === "emerald"
          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
          : tone === "amber"
            ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
            : "border-white/10 bg-white/5 text-white/80"

  return (
    <div className={cx("rounded-full border px-3 py-1.5 text-xs", toneClass)}>
      <span className="text-white/45">{label}</span>
      <span className="ml-1 font-medium text-white">{value}</span>
    </div>
  )
}

export function StatusDot({
  tone = "red",
}: {
  tone?: "red" | "emerald" | "sky" | "amber"
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.9)]"
      : tone === "sky"
        ? "bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.9)]"
        : tone === "amber"
          ? "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.9)]"
          : "bg-red-400 shadow-[0_0_16px_rgba(248,113,113,0.95)]"

  return <span className={cx("inline-block h-2.5 w-2.5 rounded-full", toneClass)} />
}

export function CommandRail() {
  const items = [
    { label: "Show", icon: MonitorPlay, active: true },
    { label: "Scenes", icon: Clapperboard },
    { label: "Layers", icon: Layers3 },
    { label: "Talent", icon: UsersRound },
    { label: "Q&A", icon: MessageSquareText },
    { label: "Signal", icon: Activity },
    { label: "Settings", icon: Settings },
  ]

  return (
    <aside className="hidden rounded-[28px] border border-white/10 bg-black/30 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl xl:flex xl:flex-col xl:items-center xl:gap-3">
      <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 shadow-[0_0_35px_rgba(56,189,248,0.18)]">
        <Radio size={21} className="text-sky-100" strokeWidth={1.8} />
      </div>

      {items.map((item) => {
        const Icon = item.icon

        return (
          <button
            key={item.label}
            type="button"
            title={item.label}
            className={cx(
              "group relative flex h-12 w-12 items-center justify-center rounded-2xl border transition",
              item.active
                ? "border-sky-300/30 bg-sky-400/15 text-sky-100 shadow-[0_0_30px_rgba(56,189,248,0.22)]"
                : "border-white/10 bg-white/[0.035] text-white/45 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/85"
            )}
          >
            <Icon size={20} strokeWidth={1.7} />

            {item.active ? (
              <span className="absolute -right-1 h-6 w-[3px] rounded-full bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.9)]" />
            ) : null}
          </button>
        )
      })}
    </aside>
  )
}