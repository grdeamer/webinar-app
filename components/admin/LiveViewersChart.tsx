"use client"

import React from "react"

type Point = { t: number; v: number }

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function formatTime(ts: number) {
  const d = new Date(ts)
  const hh = d.getHours()
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

function buildPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return ""
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  // Smooth-ish curve with quadratic segments (simple + looks good)
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const midX = (prev.x + curr.x) / 2
    const midY = (prev.y + curr.y) / 2
    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`
  }
  const last = points[points.length - 1]
  d += ` T ${last.x} ${last.y}`
  return d
}

export default function LiveViewersChart({
  roomKey = "general",
  title = "Live viewers",
  windowMinutes = 10,
  intervalSeconds = 10,
  height = 180,
}: {
  roomKey?: string
  title?: string
  windowMinutes?: number
  intervalSeconds?: number
  height?: number
}) {
  const [points, setPoints] = React.useState<Point[]>([])
  const [live, setLive] = React.useState(0)
  const [peak, setPeak] = React.useState(0)
  const [status, setStatus] = React.useState<string>("")
  const [paused, setPaused] = React.useState(false)

  const windowMs = windowMinutes * 60 * 1000
  const intervalMs = intervalSeconds * 1000

  async function fetchLive() {
    const res = await fetch(
      `/api/general-session/presence/live?room_key=${encodeURIComponent(roomKey)}`,
      { cache: "no-store" }
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || "Failed to load live count")
    return Number(json?.live ?? 0)
  }

  React.useEffect(() => {
    let mounted = true

    async function tick() {
      try {
        setStatus("")
        const v = await fetchLive()
        if (!mounted) return

        setLive(v)
        setPoints((prev) => {
          const now = Date.now()
          const next = [...prev, { t: now, v }]
          const cutoff = now - windowMs
          const trimmed = next.filter((p) => p.t >= cutoff)
          return trimmed
        })
      } catch (e: any) {
        if (!mounted) return
        setStatus(e?.message || "Live error")
      }
    }

    // initial fill (so graph isn't empty)
    ;(async () => {
      try {
        const v = await fetchLive()
        if (!mounted) return
        const now = Date.now()
        const seed: Point[] = []
        // seed ~6 points backwards so it looks populated
        for (let i = 5; i >= 0; i--) seed.push({ t: now - i * intervalMs, v })
        setPoints(seed)
        setLive(v)
        setPeak(v)
      } catch (e: any) {
        if (!mounted) return
        setStatus(e?.message || "Live error")
      }
    })()

    const id = setInterval(() => {
      if (!paused) tick()
    }, intervalMs)

    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [roomKey, windowMs, intervalMs, paused])

  React.useEffect(() => {
    setPeak((p) => Math.max(p, live))
  }, [live])

  // SVG layout
  const width = 900 // virtual width; scales with viewBox
  const pad = 22
  const h = height
  const w = width

  const now = Date.now()
  const cutoff = now - windowMs
  const visible = points.filter((p) => p.t >= cutoff)

  const minV = 0
  const maxV = Math.max(3, ...visible.map((p) => p.v), peak)

  const toXY = (p: Point) => {
    const x = pad + ((p.t - cutoff) / windowMs) * (w - pad * 2)
    const y =
      pad +
      (1 - (p.v - minV) / (maxV - minV || 1)) * (h - pad * 2)
    return { x: clamp(x, pad, w - pad), y: clamp(y, pad, h - pad) }
  }

  const xy = visible.map(toXY)
  const linePath = buildPath(xy)

  // Area fill under the line
  const areaPath =
    xy.length > 0
      ? `${linePath} L ${xy[xy.length - 1].x} ${h - pad} L ${xy[0].x} ${h - pad} Z`
      : ""

  const last = xy[xy.length - 1]
  const tickLabels = (() => {
    // 3 labels: start, middle, end
    const start = cutoff
    const mid = cutoff + windowMs / 2
    const end = now
    return [
      { x: pad, t: start },
      { x: w / 2, t: mid },
      { x: w - pad, t: end },
    ]
  })()

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              Live
            </span>
            <span>•</span>
            <span>Window: {windowMinutes}m</span>
            <span>•</span>
            <span>Every {intervalSeconds}s</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-white/50">Watching now</div>
            <div className="text-2xl font-bold">{live}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/50">Peak</div>
            <div className="text-2xl font-bold">{peak}</div>
          </div>

          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="block w-full"
          style={{ height }}
        >
          <defs>
            <linearGradient id="lvLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            <linearGradient id="lvFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
              <stop offset="45%" stopColor="#a78bfa" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>

            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* subtle grid */}
          {[0.25, 0.5, 0.75].map((p, i) => {
            const y = pad + p * (h - pad * 2)
            return (
              <line
                key={i}
                x1={pad}
                y1={y}
                x2={w - pad}
                y2={y}
                stroke="white"
                strokeOpacity="0.06"
              />
            )
          })}

          {/* area */}
          {areaPath ? <path d={areaPath} fill="url(#lvFill)" /> : null}

          {/* glow line */}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke="url(#lvLine)"
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#glow)"
            />
          ) : null}

          {/* endpoint dot */}
          {last ? (
            <>
              <circle cx={last.x} cy={last.y} r="6.5" fill="white" opacity="0.12" />
              <circle cx={last.x} cy={last.y} r="4" fill="#34d399" />
            </>
          ) : null}

          {/* x-axis time labels */}
          {tickLabels.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={h - 6}
              textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
              fontSize="12"
              fill="white"
              opacity="0.45"
            >
              {formatTime(t.t)}
            </text>
          ))}

          {/* y-axis max label */}
          <text
            x={pad}
            y={14}
            textAnchor="start"
            fontSize="12"
            fill="white"
            opacity="0.45"
          >
            max {maxV}
          </text>
        </svg>
      </div>

      {status ? <div className="mt-2 text-xs text-rose-200">{status}</div> : null}
    </div>
  )
}