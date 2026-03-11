"use client"

import { useEffect, useMemo, useState } from "react"

type BreakoutItem = {
  id: string
  title: string
  description: string | null
  join_link: string | null
  whenLabel: string
  speakerName?: string | null
  speakerAvatarUrl?: string | null
  status: "live" | "starting-soon" | "upcoming" | "ended"
  autoOpen?: boolean
}

function initials(name?: string | null) {
  if (!name) return "BR"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "BR"
}

function statusStyles(status: BreakoutItem["status"]) {
  switch (status) {
    case "live":
      return {
        dot: "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)] animate-pulse",
        badge: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
        label: "LIVE NOW",
      }
    case "starting-soon":
      return {
        dot: "bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.9)]",
        badge: "border-sky-400/30 bg-sky-400/15 text-sky-200",
        label: "Starting Soon",
      }
    case "ended":
      return {
        dot: "bg-white/30",
        badge: "border-white/10 bg-white/5 text-white/60",
        label: "Ended",
      }
    default:
      return {
        dot: "bg-white/80",
        badge: "border-white/10 bg-white/5 text-white/75",
        label: "Upcoming",
      }
  }
}

function detectPlatform(link?: string | null) {
  if (!link) return null
  const v = link.toLowerCase()

  if (
    v.includes("zoom.us") ||
    v.includes("zoom.com") ||
    v.startsWith("zoommtg:")
  ) {
    return "zoom"
  }

  if (
    v.includes("teams.microsoft.com") ||
    v.includes("teams.live.com") ||
    v.includes("msteams:")
  ) {
    return "teams"
  }

  return null
}

function PlatformBadge({ platform }: { platform: "zoom" | "teams" | null }) {
  if (!platform) return null

  if (platform === "zoom") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs text-sky-200">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
          Z
        </span>
        Zoom
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-400/10 px-3 py-1 text-xs text-indigo-200">
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-500 text-[10px] font-bold text-white">
        T
      </span>
      Teams
    </div>
  )
}

export default function EventBreakoutMagnifyList({ items }: { items: BreakoutItem[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [pointer, setPointer] = useState<Record<string, { x: number; y: number }>>({})
  const [autoOpened, setAutoOpened] = useState<Record<string, boolean>>({})

  const liveAutoOpenTarget = useMemo(
    () => items.find((item) => item.status === "live" && item.join_link && item.autoOpen),
    [items]
  )

  useEffect(() => {
    if (!liveAutoOpenTarget?.id || !liveAutoOpenTarget.join_link) return
    if (autoOpened[liveAutoOpenTarget.id]) return

    const timer = window.setTimeout(() => {
      window.open(liveAutoOpenTarget.join_link as string, "_blank", "noopener,noreferrer")
      setAutoOpened((prev) => ({ ...prev, [liveAutoOpenTarget.id as string]: true }))
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [autoOpened, liveAutoOpenTarget])

  return (
    <div className="grid grid-cols-1 gap-6">
      {items.map((item) => {
        const isHovered = hoveredId === item.id
        const coords = pointer[item.id] || { x: 50, y: 50 }
        const ui = statusStyles(item.status)
        const platform = detectPlatform(item.join_link)

        return (
          <section
            key={item.id}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = ((e.clientX - rect.left) / rect.width) * 100
              const y = ((e.clientY - rect.top) / rect.height) * 100
              setPointer((prev) => ({ ...prev, [item.id]: { x, y } }))
            }}
            className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-8 transition-all duration-300 ease-out"
            style={{
              transform: isHovered ? "translateY(-8px) scale(1.025)" : "translateY(0px) scale(1)",
              boxShadow: isHovered
                ? "0 22px 50px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px rgba(99,102,241,0.18)"
                : "0 10px 28px rgba(0,0,0,0.18)",
              zIndex: isHovered ? 10 : 1,
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: `radial-gradient(circle at ${coords.x}% ${coords.y}%, rgba(129,140,248,0.18), rgba(34,211,238,0.1) 22%, rgba(255,255,255,0.04) 44%, transparent 72%)`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_35%,rgba(99,102,241,0.14))] opacity-80" />

            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${ui.badge}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${ui.dot}`} />
                      {ui.label}
                    </span>

                    <span className="text-sm text-white/60">{item.whenLabel}</span>

                    <PlatformBadge platform={platform} />
                  </div>

                  <h2 className="mt-4 text-3xl font-semibold text-white transition-transform duration-300 group-hover:translate-x-1">
                    {item.title}
                  </h2>

                  <div className="mt-2 text-sm text-white/65">
                    Speaker: {item.speakerName || "Host TBA"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.speakerAvatarUrl ? (
                    <img
                      src={item.speakerAvatarUrl}
                      alt={item.speakerName || "Speaker"}
                      className="h-14 w-14 rounded-full border border-white/15 object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white/80 shadow-lg">
                      {initials(item.speakerName)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                {item.description ? (
                  <p className="max-w-3xl text-base leading-7 text-white/75">
                    {item.description}
                  </p>
                ) : (
                  <p className="max-w-3xl text-base leading-7 text-white/45">
                    Description coming soon.
                  </p>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {item.join_link ? (
                    <a
                      href={item.join_link}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex rounded-full px-5 py-2.5 font-medium text-white transition group-hover:scale-[1.03] ${
                        item.status === "live"
                          ? "bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:bg-emerald-400"
                          : item.status === "starting-soon"
                          ? "bg-sky-600 hover:bg-sky-500"
                          : "bg-indigo-600 hover:bg-indigo-500"
                      }`}
                    >
                      {item.status === "live" ? "Join Room Live" : "Join Room"}
                    </a>
                  ) : (
                    <div className="text-sm text-white/45">Join link coming soon.</div>
                  )}

                  <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/50">
                    Hover to magnify
                  </div>

                  {item.autoOpen && item.join_link ? (
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                      Auto-open enabled
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}