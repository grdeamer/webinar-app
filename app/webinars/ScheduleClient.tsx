"use client"

import React from "react"
import Link from "next/link"

type WebinarRow = {
  id: string
  title: string | null
  webinar_date: string | null
  duration_minutes: number | null
  join_link: string | null
  speaker: string | null
  timezone: string | null
}

type Status = "live" | "upcoming" | "past" | "unscheduled"

function formatTimeRange(startISO: string, durationMinutes: number) {
  const start = new Date(startISO)
  const end = new Date(start.getTime() + durationMinutes * 60_000)

  const fmt = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })

  return `${fmt.format(start)} – ${fmt.format(end)}`
}

function getStatus(w: WebinarRow, nowMs: number): Status {
  if (!w.webinar_date) return "unscheduled"
  const start = new Date(w.webinar_date).getTime()
  const dur = w.duration_minutes ?? 60
  const end = start + dur * 60_000

  if (nowMs >= start && nowMs <= end) return "live"
  if (nowMs < start) return "upcoming"
  return "past"
}

export default function ScheduleClient({ webinars }: { webinars: WebinarRow[] }) {
  const [now, setNow] = React.useState(() => Date.now())

  // Update “live” state automatically (every 15 seconds feels snappy)
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])

  const items = React.useMemo(() => {
    return webinars
      .slice()
      .sort((a, b) => {
        const ad = a.webinar_date ? new Date(a.webinar_date).getTime() : 0
        const bd = b.webinar_date ? new Date(b.webinar_date).getTime() : 0
        return ad - bd
      })
      .map((w) => {
        const status = getStatus(w, now)
        return { w, status }
      })
  }, [webinars, now])

  const liveCount = items.filter((x) => x.status === "live").length

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-white/60">
          {liveCount > 0 ? (
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              {liveCount} live right now
            </span>
          ) : (
            <span>No sessions live right now</span>
          )}
        </div>

        <div className="text-xs text-white/40">
          Your time:{" "}
          {new Date(now).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </div>
      </div>

      {/* Stack like your screenshot */}
      <div className="mt-6 space-y-8">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            No webinars yet.
          </div>
        ) : (
          items.map(({ w, status }) => {
            const dur = w.duration_minutes ?? 60
            const range = w.webinar_date ? formatTimeRange(w.webinar_date, dur) : "Time TBD"

            const isLive = status === "live"
            const isClickable = isLive && !!w.join_link

            // Live = full opacity + pop; not live = slightly grayed out
            const cardClass =
              "relative mx-auto w-full max-w-2xl rounded-none border border-black/30 bg-sky-900/60 px-8 py-6 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition"

            const liveStyle = isLive
              ? "opacity-100 ring-1 ring-cyan-300/60 shadow-[0_0_30px_rgba(34,211,238,0.18)]"
              : "opacity-45 grayscale"

            return (
              <div key={w.id} className="flex flex-col items-center">
                <div className={`${cardClass} ${liveStyle}`}>
                  {/* Badge */}
                  <div className="absolute left-3 top-3">
                    {isLive ? (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                        LIVE NOW
                      </span>
                    ) : status === "upcoming" ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                        Upcoming
                      </span>
                    ) : status === "past" ? (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Ended
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Unscheduled
                      </span>
                    )}
                  </div>

                  <div className="text-xl font-bold text-white">
                    {w.title || "Untitled Webinar"}
                  </div>

                  <div className="mt-2 text-lg font-semibold text-white/90">{range}</div>

                  {w.speaker ? (
                    <div className="mt-2 text-sm text-white/70">{w.speaker}</div>
                  ) : null}

                  {/* Join button only when live */}
                  <div className="mt-5">
                    {isClickable ? (
                      <a
                        href={w.join_link!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2 text-sm font-semibold text-slate-950 hover:opacity-90"
                      >
                        Join now ↗
                      </a>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white/50"
                        title={
                          status === "live"
                            ? "No join link configured"
                            : "This webinar is not live yet"
                        }
                      >
                        {status === "past" ? "Session ended" : "Not live yet"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Optional: subtle connector spacing feel */}
                <div className="h-2" />
              </div>
            )
          })
        )}
      </div>

      {/* Optional footer link */}
      <div className="mt-10 text-center text-xs text-white/40">
        Having trouble? Try refreshing, or check your device clock/timezone.
      </div>
    </div>
  )
}