"use client"

import { useEffect, useMemo, useState } from "react"

type Props = {
  title: string
  targetIso: string | null | undefined
  subtitle?: string
  badgeText?: string
}

type CountdownPart = {
  label: string
  value: string
}

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0")
}

function getCountdownParts(targetIso: string | null | undefined, nowMs: number): CountdownPart[] {
  if (!targetIso) {
    return [
      { label: "Days", value: "00" },
      { label: "Hours", value: "00" },
      { label: "Mins", value: "00" },
      { label: "Secs", value: "00" },
    ]
  }

  const targetMs = new Date(targetIso).getTime()
  if (Number.isNaN(targetMs)) {
    return [
      { label: "Days", value: "00" },
      { label: "Hours", value: "00" },
      { label: "Mins", value: "00" },
      { label: "Secs", value: "00" },
    ]
  }

  const diff = Math.max(0, targetMs - nowMs)

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const mins = Math.floor((diff / (1000 * 60)) % 60)
  const secs = Math.floor((diff / 1000) % 60)

  return [
    { label: "Days", value: pad(days) },
    { label: "Hours", value: pad(hours) },
    { label: "Mins", value: pad(mins) },
    { label: "Secs", value: pad(secs) },
  ]
}

export default function EventCountdownCard({
  title,
  targetIso,
  subtitle = "Countdown to event start",
  badgeText = "Countdown block",
}: Props) {
  // Stable first render to avoid SSR/client mismatch
  const [nowMs, setNowMs] = useState<number>(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setNowMs(Date.now())

    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  const parts = useMemo(() => {
    // Before mount, render zeros on both server and first client render
    if (!mounted) {
      return getCountdownParts(null, 0)
    }
    return getCountdownParts(targetIso, nowMs)
  }, [mounted, nowMs, targetIso])

  const targetLabel = targetIso
    ? new Date(targetIso).toLocaleString()
    : "No target time set"

  const hasArrived =
    mounted && targetIso ? new Date(targetIso).getTime() <= nowMs : false

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-white/45">
            {subtitle}
          </div>
          <h3 className="mt-3 text-2xl font-semibold">{title}</h3>
          <div className="mt-2 text-white/60">{targetLabel}</div>
        </div>

        <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1 text-sm text-cyan-200">
          {badgeText}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {parts.map((part) => (
          <div
            key={part.label}
            className="rounded-2xl border border-white/10 bg-black/25 p-4 text-center"
          >
            <div className="text-2xl font-bold lg:text-3xl">{part.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
              {part.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 text-sm text-white/55">
        {hasArrived ? "The scheduled start time has arrived." : `Target time: ${targetLabel}`}
      </div>
    </section>
  )
}