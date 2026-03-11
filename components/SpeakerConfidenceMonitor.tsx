// components/SpeakerConfidenceMonitor.tsx

"use client"

import { useEffect, useMemo, useState } from "react"

type FeaturedResponse = {
  featured: {
    id: string
    name: string | null
    question: string
  } | null
  queue?: Array<{
    id: string
    name: string | null
    question: string
  }>
  rotation_enabled?: boolean
  rotation_seconds?: number
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }

  return `${m}:${String(sec).padStart(2, "0")}`
}

export default function SpeakerConfidenceMonitor({
  roomKey = "general",
  sessionTitle,
  controlState,
  lowerThirdActive,
  lowerThirdName,
  lowerThirdTitle,
}: {
  roomKey?: string
  sessionTitle: string
  controlState: "holding" | "live" | "paused" | "ended"
  lowerThirdActive: boolean
  lowerThirdName: string | null
  lowerThirdTitle: string | null
}) {
  const [now, setNow] = useState<Date>(new Date())
  const [liveStartedAt, setLiveStartedAt] = useState<number | null>(null)
  const [qa, setQa] = useState<FeaturedResponse>({
    featured: null,
    queue: [],
    rotation_enabled: true,
    rotation_seconds: 15,
  })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (controlState === "live" && liveStartedAt == null) {
      setLiveStartedAt(Date.now())
    }
    if (controlState !== "live" && controlState !== "paused") {
      setLiveStartedAt(null)
    }
  }, [controlState, liveStartedAt])

  useEffect(() => {
    let active = true

    async function load() {
      const res = await fetch(`/api/qa/featured?room_key=${encodeURIComponent(roomKey)}`, {
        cache: "no-store",
      })
      const data = await res.json()
      if (!active) return
      setQa({
        featured: data?.featured || null,
        queue: Array.isArray(data?.queue) ? data.queue : [],
        rotation_enabled: Boolean(data?.rotation_enabled ?? true),
        rotation_seconds: Number(data?.rotation_seconds ?? 15),
      })
    }

    load()
    const t = setInterval(load, 3000)
    return () => {
      active = false
      clearInterval(t)
    }
  }, [roomKey])

  const nextQuestion = useMemo(() => {
    return (qa.queue || []).find((q) => q.id !== qa.featured?.id) || null
  }, [qa])

  const elapsed = useMemo(() => {
    if (controlState !== "live" || liveStartedAt == null) return "00:00"
    return formatDuration(Math.floor((Date.now() - liveStartedAt) / 1000))
  }, [controlState, liveStartedAt, now])

  const stateTone =
    controlState === "live"
      ? "text-emerald-300 border-emerald-400/25 bg-emerald-500/10"
      : controlState === "paused"
      ? "text-amber-200 border-amber-400/25 bg-amber-500/10"
      : controlState === "ended"
      ? "text-red-300 border-red-400/25 bg-red-500/10"
      : "text-white/70 border-white/10 bg-white/5"

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Clock</div>
        <div className="mt-2 text-3xl font-bold">{formatClock(now)}</div>
        <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/45">Elapsed</div>
        <div className="mt-2 text-2xl font-semibold">{elapsed}</div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Session</div>
        <div className="mt-2 text-xl font-semibold">{sessionTitle}</div>
        <div className="mt-4">
          <span className={`rounded-full border px-3 py-1 text-xs ${stateTone}`}>
            {controlState.toUpperCase()}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 xl:col-span-1">
        <div className="text-[11px] uppercase tracking-[0.2em] text-yellow-200/80">
          Current Question
        </div>
        {qa.featured ? (
          <>
            <div className="mt-2 text-sm text-white/60">
              {qa.featured.name?.trim() || "Anonymous"}
            </div>
            <div className="mt-2 text-base font-semibold leading-6">
              {qa.featured.question}
            </div>
          </>
        ) : (
          <div className="mt-3 text-sm text-white/55">No featured question live.</div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4 xl:col-span-1">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Next Question</div>
        {nextQuestion ? (
          <>
            <div className="mt-2 text-sm text-white/60">
              {nextQuestion.name?.trim() || "Anonymous"}
            </div>
            <div className="mt-2 text-base font-semibold leading-6">
              {nextQuestion.question}
            </div>
          </>
        ) : (
          <div className="mt-3 text-sm text-white/55">No next question queued.</div>
        )}

        <div className="mt-4 text-xs text-white/45">
          Rotation {qa.rotation_enabled ? "On" : "Off"} • {qa.rotation_seconds || 15}s
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Lower Third</div>
        <div className="mt-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              lowerThirdActive
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/5 text-white/60"
            }`}
          >
            {lowerThirdActive ? "ACTIVE" : "OFF"}
          </span>
        </div>

        <div className="mt-4 text-sm text-white/60">Name</div>
        <div className="mt-1 text-base font-semibold">
          {lowerThirdName || "No name set"}
        </div>

        <div className="mt-4 text-sm text-white/60">Title</div>
        <div className="mt-1 text-base font-semibold">
          {lowerThirdTitle || "No title set"}
        </div>
      </section>
    </div>
  )
}