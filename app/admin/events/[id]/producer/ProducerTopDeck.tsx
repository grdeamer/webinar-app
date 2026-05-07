"use client"

import { useEffect, useMemo, useState } from "react"
import type { JSX } from "react"
import {
  ChevronRight,
  Circle,
  Clock3,
  Disc3,
  ShieldCheck,
  Signal,
  Users,
  Wand2,
  Wifi,
} from "lucide-react"

function StatusPill({
  icon,
  label,
  value,
  tone = "",
  pulse = false,
}: {
  icon: JSX.Element
  label: string
  value: string
  tone?: string
  pulse?: boolean
}) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-2xl border px-3 py-1.5",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]",
        "shadow-[0_12px_40px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]",
        tone,
      ].join(" ")}
    >
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-white/72">
        {pulse ? (
          <span className="absolute inset-1 rounded-lg bg-red-400/10 animate-pulse" />
        ) : null}
        <span className="relative z-10">{icon}</span>
      </span>

      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/34">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-white/88">
          {value}
        </div>
      </div>
    </div>
  )
}

function OpsChip({
  label,
  value,
  active = false,
}: {
  label: string
  value: string
  active?: boolean
}) {
  return (
    <div
      className={[
        "hidden items-center gap-1.5 rounded-full border px-2 py-1 sm:flex",
        active
          ? "border-red-300/18 bg-red-400/8 text-red-100/62"
          : "border-white/8 bg-white/[0.025] text-white/36",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          active
            ? "bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.8)] animate-pulse"
            : "bg-white/22",
        ].join(" ")}
      />
      <span>{label}</span>
      <span className={active ? "text-red-50/72" : "text-white/48"}>
        {value}
      </span>
    </div>
  )
}

export default function ProducerTopDeck(): JSX.Element {
  const [viewers, setViewers] = useState(2458)
  const [signalBars, setSignalBars] = useState(4)
  const [latencyScore, setLatencyScore] = useState(18)
  const [confidence, setConfidence] = useState(99)

  const [runtimeSeconds, setRuntimeSeconds] = useState(1727)

  const runtime = useMemo(() => {
    const hours = Math.floor(runtimeSeconds / 3600)
    const minutes = Math.floor((runtimeSeconds % 3600) / 60)
    const seconds = runtimeSeconds % 60

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":")
  }, [runtimeSeconds])

  useEffect(() => {
    const id = setInterval(() => {
      setViewers((value) => Math.max(0, value + (Math.random() > 0.65 ? 1 : 0)))
      setRuntimeSeconds((value) => value + 1)
      setSignalBars(3 + Math.floor(Math.random() * 2))
      setLatencyScore(16 + Math.floor(Math.random() * 8))
      setConfidence(98 + Math.floor(Math.random() * 2))
    }, 1200)

    return () => clearInterval(id)
  }, [])

  const latencyLabel = latencyScore < 22 ? "Excellent" : "Good"

  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.016))] p-2 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="grid gap-2 xl:grid-cols-[1.15fr_1fr_1fr_1fr_1fr_1fr]">
        <StatusPill
          icon={
            <span className="relative flex items-center justify-center">
              <Disc3 size={15} className="text-red-300 animate-spin" />
              <Circle size={6} className="absolute fill-red-300 text-red-300" />
              <span className="absolute h-5 w-5 rounded-full border border-red-300/40 animate-ping" />
            </span>
          }
          label="Live Status"
          value="Program Live"
          tone="border-red-400/20 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.12),transparent_36%),rgba(255,255,255,0.03)]"
          pulse
        />

        <StatusPill
          icon={<Clock3 size={15} />}
          label="Runtime"
          value={runtime}
          tone="border-white/10 tabular-nums"
        />

        <StatusPill
          icon={<ShieldCheck size={15} />}
          label="Confidence"
          value={`${confidence}% stable`}
          tone="border-emerald-300/18"
        />

        <StatusPill
          icon={<Users size={15} />}
          label="Audience"
          value={`${viewers.toLocaleString()} live`}
          tone="border-sky-400/18"
        />

        <StatusPill
          icon={<Signal size={15} />}
          label="Latency"
          value={`${latencyLabel} · ${latencyScore}ms`}
          tone="border-emerald-300/18"
        />

        <StatusPill
          icon={<Wand2 size={15} className="animate-pulse" />}
          label="Transition"
          value="Auto · 600ms"
          tone="border-violet-300/18"
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/18 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <Wifi size={13} className="text-emerald-200/65" />
            Signal Locked
          </div>
          <div className="hidden h-3 w-px bg-white/10 sm:block" />
          <div className="hidden min-w-0 items-center gap-1 truncate text-white/32 md:flex">
            <span>Session A1</span>
            <ChevronRight size={11} className="text-white/18" />
            <span>Holding pattern</span>
            <ChevronRight size={11} className="text-white/18" />
            <span>{confidence}% confidence</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-1.5 lg:flex">
            <OpsChip label="REC" value="Armed" active />
            <OpsChip label="ISO" value="Ready" />
            <OpsChip label="PGM" value="Clean" />
          </div>
          <span className="hidden text-[9px] tracking-[0.16em] text-emerald-100/35 sm:inline">
            UPLINK
          </span>
          <div className="flex items-end gap-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className={[
                  "w-1.5 rounded-full transition-all duration-500",
                  index < signalBars
                    ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.7)]"
                    : "bg-white/12",
                ].join(" ")}
                style={{ height: `${8 + index * 3}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}