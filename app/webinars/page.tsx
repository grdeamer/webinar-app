"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { WEBINARS, type Webinar, type Tag as WebinarTag } from "../../lib/webinars"

type FilterTag = "All" | WebinarTag
type ViewMode = "schedule" | "cards"
type ThemeMode = "dark" | "light"
type WebinarWithMeta = Webinar & { webinar_date?: string; duration_minutes?: number; durationMinutes?: number }

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

// “Dock” curve: gaussian-ish falloff from the cursor
function dockScale(distancePx: number, maxScale: number, radiusPx: number) {
  const d = Math.abs(distancePx)
  const x = d / Math.max(1, radiusPx)
  const t = Math.exp(-(x * x))
  return 1 + (maxScale - 1) * t
}

/**
 * Best-effort parse:
 * - If your Webinar objects ever include `webinar_date` (ISO string), we’ll use it.
 * - Otherwise we try: new Date(`${w.date} ${w.time}`)
 */
function getStartDate(w: WebinarWithMeta): Date | null {
  if (typeof w.webinar_date === "string" && w.webinar_date) {
    const d = new Date(w.webinar_date)
    return isNaN(d.getTime()) ? null : d
  }

  const guess = new Date(`${w.date} ${w.time}`)
  if (!isNaN(guess.getTime())) return guess

  const guess2 = new Date(w.date)
  if (!isNaN(guess2.getTime())) return guess2

  return null
}

function getDurationMinutes(w: WebinarWithMeta): number {
  const n =
    typeof w.duration_minutes === "number"
      ? w.duration_minutes
      : typeof w.durationMinutes === "number"
        ? w.durationMinutes
        : 60
  return Number.isFinite(n) && n > 0 ? Math.min(8 * 60, n) : 60
}

function useNow(tickMs = 10_000) {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), tickMs)
    return () => window.clearInterval(t)
  }, [tickMs])
  return now
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function normalizeTag(tag: string | null): FilterTag {
  const t = (tag ?? "").toLowerCase()
  if (t === "upcoming") return "Upcoming"
  if (t === "live") return "Live"
  if (t === "on-demand" || t === "ondemand") return "On-demand"
  return "All"
}

function statusFor(w: WebinarWithMeta, now: Date) {
  if (w.tag === "On-demand") {
    return {
      kind: "ondemand" as const,
      active: true,
      start: null as Date | null,
      end: null as Date | null,
      past: false,
      upcoming: false,
    }
  }

  const start = getStartDate(w)
  if (!start) {
    return {
      kind: "unknown" as const,
      active: false,
      start: null as Date | null,
      end: null as Date | null,
      past: false,
      upcoming: false,
    }
  }

  const end = new Date(start.getTime() + getDurationMinutes(w) * 60_000)
  const active = now >= start && now < end
  const upcoming = now < start
  const past = now >= end

  return {
    kind: active ? ("live" as const) : upcoming ? ("upcoming" as const) : ("past" as const),
    active,
    start,
    end,
    past,
    upcoming,
  }
}

function HighlightText({
  text,
  query,
  className,
  markClassName,
}: {
  text: string
  query: string
  className?: string
  markClassName?: string
}) {
  const q = query.trim()
  if (!q) return <span className={className}>{text}</span>

  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "ig"))

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const isMatch = part.toLowerCase() === q.toLowerCase()
        return isMatch ? (
          <mark
            key={i}
            className={
              markClassName ??
              "rounded px-1 py-0.5 bg-indigo-500/15 text-indigo-200 border border-indigo-400/20"
            }
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </span>
  )
}

export default function WebinarsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [filter, setFilter] = useState<FilterTag>("All")
  const [hydrated, setHydrated] = useState(false)
  const [view, setView] = useState<ViewMode>("schedule")
  const [animateCount, setAnimateCount] = useState(false)

  const now = useNow(10_000)

  // ----- Theme (dark/light) -----
  const [theme, setTheme] = useState<ThemeMode>("dark")
  const isDark = theme === "dark"

  // ----- Dock magnification state (Schedule view) -----
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const rafRef = useRef<number | null>(null)
  const [cursorY, setCursorY] = useState<number | null>(null) // viewport Y
  const [dockEnabled, setDockEnabled] = useState(true)

  // Initial URL + theme load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get("q") ?? ""
    const tag = normalizeTag(params.get("tag"))
    const v = (params.get("view") as ViewMode | null) ?? "schedule"

    setQuery(q)
    setDebouncedQuery(q)
    setFilter(tag)
    setView(v === "cards" ? "cards" : "schedule")

    // Theme: localStorage -> else system preference
    const saved = (localStorage.getItem("webinars_theme") as ThemeMode | null) ?? null
    if (saved === "dark" || saved === "light") {
      setTheme(saved)
    } else {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
      setTheme(prefersDark ? "dark" : "light")
    }

    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem("webinars_theme", theme)
  }, [theme, hydrated])

  // ⌘K / Ctrl+K focus
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k"
      const isMetaOrCtrl = e.metaKey || e.ctrlKey
      if (isMetaOrCtrl && isK) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === "Escape") inputRef.current?.blur()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Debounce query
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 250)
    return () => window.clearTimeout(handle)
  }, [query])

  // URL sync
  useEffect(() => {
    if (!hydrated) return
    const params = new URLSearchParams()
    const q = debouncedQuery.trim()
    if (q) params.set("q", q)
    if (filter !== "All") params.set("tag", filter)
    if (view !== "schedule") params.set("view", view)
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filter, hydrated, pathname, view])

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()

    return WEBINARS.filter((w) => {
      const matchesFilter = filter === "All" ? true : w.tag === filter
      const matchesQuery =
        q.length === 0
          ? true
          : [w.title, w.speaker, w.description, w.tag, w.date, w.time].some((field) =>
              (field || "").toLowerCase().includes(q)
            )
      return matchesFilter && matchesQuery
    })
  }, [debouncedQuery, filter])

  // trigger animated count when result size changes
  useEffect(() => {
    setAnimateCount(true)
    const t = window.setTimeout(() => setAnimateCount(false), 220)
    return () => window.clearTimeout(t)
  }, [filtered.length])

  const countLabel = filtered.length === 1 ? "1 webinar" : `${filtered.length} webinars`

  const clearAll = () => {
    setQuery("")
    setDebouncedQuery("")
    setFilter("All")
  }

  const scheduleList = useMemo(() => {
    const withTimes = filtered.map((w) => {
      const s = statusFor(w, now)
      const startMs = s.start ? s.start.getTime() : Number.POSITIVE_INFINITY
      const sortKey =
        s.kind === "live"
          ? startMs - 1_000_000_000
          : s.kind === "upcoming"
            ? startMs
            : s.kind === "past"
              ? startMs + 10_000_000_000
              : s.kind === "ondemand"
                ? startMs + 20_000_000_000
                : startMs + 30_000_000_000
      return { w, s, sortKey }
    })

    withTimes.sort((a, b) => a.sortKey - b.sortKey)
    return withTimes
  }, [filtered, now])

  // Dock mouse move handler (requestAnimationFrame throttled)
  function onDockMouseMove(e: React.MouseEvent) {
    if (!dockEnabled) return
    const y = e.clientY
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => setCursorY(y))
  }

  function onDockLeave() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setCursorY(null)
  }

  // compute scales per item based on cursor distance to each card center
  const dockScales = useMemo(() => {
    const n = scheduleList.length
    if (!dockEnabled || cursorY == null) return Array.from({ length: n }, () => 1)

    const maxScale = 1.16
    const radiusPx = 220

    return scheduleList.map((_, i) => {
      const el = itemRefs.current[i]
      if (!el) return 1
      const r = el.getBoundingClientRect()
      const centerY = r.top + r.height / 2
      const s = dockScale(cursorY - centerY, maxScale, radiusPx)
      return clamp(s, 1, maxScale)
    })
  }, [scheduleList, cursorY, dockEnabled])

  // ---- Theme-aware class helpers ----
  const pageBg = isDark
    ? "bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white"
    : "bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900"

  const panel = isDark
    ? "bg-white/5 border-white/10"
    : "bg-white/90 border-slate-200 shadow-sm"

  const subtleText = isDark ? "text-white/70" : "text-slate-600"
  const mutedText = isDark ? "text-white/50" : "text-slate-500"
  const borderSubtle = isDark ? "border-white/10" : "border-slate-200"

  const inputClass = isDark
    ? "bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-indigo-500/70"
    : "bg-white/95 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-indigo-600/30"

  const pillActive = isDark
    ? "bg-white/15 border-white/20 text-white"
    : "bg-slate-900 text-white border-slate-900"
  const pillIdle = isDark
    ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"

  function TagBadge({ tag }: { tag: Webinar["tag"] }) {
    const base = "text-xs font-semibold px-3 py-1 rounded-full border backdrop-blur"
    if (tag === "Live") {
      return (
        <span
          className={[
            base,
            isDark ? "bg-red-500/15 border-red-400/30 text-red-100" : "bg-red-50 border-red-200 text-red-700",
          ].join(" ")}
        >
          LIVE
        </span>
      )
    }
    if (tag === "On-demand") {
      return (
        <span
          className={[
            base,
            isDark
              ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-100"
              : "bg-emerald-50 border-emerald-200 text-emerald-700",
          ].join(" ")}
        >
          ON-DEMAND
        </span>
      )
    }
    return (
      <span
        className={[
          base,
          isDark
            ? "bg-indigo-500/15 border-indigo-400/30 text-indigo-100"
            : "bg-indigo-50 border-indigo-200 text-indigo-700",
        ].join(" ")}
      >
        UPCOMING
      </span>
    )
  }

  function FilterPill({
    label,
    active,
    onClick,
  }: {
    label: FilterTag
    active: boolean
    onClick: () => void
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          "rounded-full px-4 py-2 text-sm font-medium border transition",
          active ? pillActive : pillIdle,
        ].join(" ")}
      >
        {label}
      </button>
    )
  }

  const markClass = isDark
    ? "rounded px-1 py-0.5 bg-indigo-400/25 text-indigo-100"
    : "rounded px-1 py-0.5 bg-yellow-300 text-slate-900"

  const headerBtn = isDark
    ? "bg-white/10 hover:bg-white/15 border-white/10 text-white"
    : "bg-white/90 hover:bg-white border-slate-200 text-slate-900 shadow-sm"

  const heroGradient = isDark
    ? "bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent"
    : "bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent"

  return (
    <div className={["min-h-screen", pageBg].join(" ")}>
      {/* NAV */}
      <header className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold">
          Webinar App
        </Link>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className={[
              "rounded-xl border transition px-4 py-2 text-sm",
              headerBtn,
            ].join(" ")}
            title="Toggle dark/light"
          >
            {isDark ? "Light mode" : "Dark mode"}
          </button>

          <Link
            href="/admin"
            className={[
              "rounded-xl border transition px-4 py-2 text-sm",
              headerBtn,
            ].join(" ")}
          >
            Admin
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-8 pb-10 text-center">
        <h1 className="text-6xl font-bold tracking-tight leading-tight">
          Learn from experts.
          <br />
          <span className={heroGradient}>Live &amp; on-demand webinars.</span>
        </h1>

        <p className={["text-xl mt-6 max-w-2xl mx-auto", subtleText].join(" ")}>
          Search by topic, speaker, or format. Schedule view dims sessions that aren’t “now”.
        </p>
      </section>

      {/* SEARCH + FILTER + VIEW */}
      <section className="max-w-6xl mx-auto px-6 pb-10">
        <div className={["rounded-3xl border p-6 md:p-8", panel, borderSubtle].join(" ")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-left">
              <div className={["text-sm", mutedText].join(" ")}>Showing</div>
              <div
                className={[
                  "text-2xl font-semibold tracking-tight inline-block",
                  animateCount ? "scale-[1.03] opacity-90" : "scale-100 opacity-100",
                  "transition duration-200 ease-out",
                ].join(" ")}
              >
                {countLabel}
              </div>
              <div className={["mt-1 text-xs", mutedText].join(" ")}>
                Local time:{" "}
                <span className={isDark ? "text-white/80" : "text-slate-700"}>
                  {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </div>

            <div className="w-full md:max-w-xl">
              <div className="relative">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search webinars (e.g. next.js, auth, tailwind)..."
                  className={[
                    "w-full rounded-2xl border px-4 py-3 pr-16 outline-none focus:ring-2 transition",
                    inputClass,
                  ].join(" ")}
                />
                <div
                  className={[
                    "absolute right-3 top-1/2 -translate-y-1/2 text-xs border px-2 py-1 rounded-lg",
                    isDark ? "text-white/50 border-white/10 bg-white/5" : "text-slate-500 border-slate-200 bg-white",
                  ].join(" ")}
                >
                  ⌘K
                </div>
              </div>

              <div className={["mt-2 flex items-center justify-between text-xs", mutedText].join(" ")}>
                <span>Highlighted matches + shareable URL</span>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className={isDark ? "hover:text-white/70 transition" : "hover:text-slate-700 transition"}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
            {(["All", "Upcoming", "Live", "On-demand"] as FilterTag[]).map((t) => (
              <FilterPill key={t} label={t} active={filter === t} onClick={() => setFilter(t)} />
            ))}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {view === "schedule" ? (
                <button
                  type="button"
                  onClick={() => setDockEnabled((v) => !v)}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium border transition",
                    dockEnabled ? pillActive : pillIdle,
                  ].join(" ")}
                  title="Dock-style magnification on hover"
                >
                  Dock magnify: {dockEnabled ? "On" : "Off"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setView("schedule")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium border transition",
                  view === "schedule" ? pillActive : pillIdle,
                ].join(" ")}
              >
                Schedule
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium border transition",
                  view === "cards" ? pillActive : pillIdle,
                ].join(" ")}
              >
                Cards
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* LIST */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-2xl font-semibold">No results</div>
            <p className={["mt-2", subtleText].join(" ")}>
              Try a different search term or switch filters.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className={[
                "mt-6 rounded-xl border transition px-5 py-3 font-medium",
                headerBtn,
              ].join(" ")}
            >
              Reset search
            </button>
          </div>
        ) : view === "schedule" ? (
          <div
            ref={containerRef}
            onMouseMove={onDockMouseMove}
            onMouseLeave={onDockLeave}
            className="mx-auto flex max-w-5xl flex-col gap-6"
            style={{ paddingTop: 8, paddingBottom: 8 }}
          >
            <div className={["text-xs text-center", mutedText].join(" ")}>
              Tip: move your mouse up/down the schedule — Dock magnification is{" "}
              <span className={isDark ? "text-white/70" : "text-slate-700"}>
                {dockEnabled ? "ON" : "OFF"}
              </span>
              .
            </div>

            {scheduleList.map(({ w, s }, idx) => {
              const isActive = s.active
              const isPast = s.past === true

              const timeLabel =
                s.kind === "ondemand"
                  ? "On-demand"
                  : s.start
                    ? `${fmtTime(s.start)} — ${s.end ? fmtTime(s.end) : ""}`
                    : w.time

              const scale = dockScales[idx] ?? 1
              const z = Math.round((scale - 1) * 1000)

              // Better “dim” behavior for light mode (don’t disappear)
              const inactiveDim = isDark ? "opacity-60 grayscale-[20%]" : "opacity-90 saturate-90"
              const pastDim = isDark ? "opacity-45" : "opacity-75"

              const cardBase = isDark
                ? "bg-white/5 border-white/10"
                : "bg-white/95 border-slate-200 shadow-[0_10px_30px_rgba(2,6,23,0.08)]"

              const cardHover = isDark ? "hover:bg-white/10" : "hover:bg-slate-50"

              const activeRing = isDark
                ? "border-indigo-400/40 bg-indigo-500/10 shadow-2xl shadow-indigo-500/10"
                : "border-indigo-300 bg-indigo-50 shadow-md shadow-indigo-200/40"

              return (
                <div
                  key={w.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el
                  }}
                  className="origin-center"
                  style={{
                    transform: `translateZ(0) scale(${scale})`,
                    transition: dockEnabled
                      ? "transform 170ms cubic-bezier(.2,.8,.2,1)"
                      : "transform 120ms ease-out",
                    willChange: "transform",
                    zIndex: 10 + z,
                  }}
                >
                  <Link
                    href={`/webinars/${w.id}`}
                    className={[
                      "group relative block rounded-2xl border px-6 py-6 text-center transition",
                      cardBase,
                      cardHover,
                      isActive ? activeRing : "",
                      !isActive ? inactiveDim : "opacity-100",
                      isPast ? pastDim : "",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition",
                        isDark
                          ? "bg-gradient-to-br from-indigo-500/10 to-violet-500/10"
                          : "bg-gradient-to-br from-indigo-200/30 to-violet-200/30",
                      ].join(" ")}
                    />

                    <div className="relative flex flex-col items-center gap-3">
                      <div className="flex items-center gap-3">
                        <TagBadge tag={w.tag} />
                        {isActive ? (
                          <span
                            className={[
                              "text-xs rounded-full border px-3 py-1",
                              isDark
                                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700",
                            ].join(" ")}
                          >
                            Happening now
                          </span>
                        ) : null}
                      </div>

                      <div className={["text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900"].join(" ")}>
                        <HighlightText
                          text={w.title}
                          query={debouncedQuery}
                          markClassName={markClass}
                        />
                      </div>

                      <div className={["text-lg font-semibold", isDark ? "text-white/80" : "text-slate-700"].join(" ")}>
                        {timeLabel}
                      </div>

                      <div className={["text-sm", isDark ? "text-white/60" : "text-slate-600"].join(" ")}>
                        <HighlightText
                          text={w.speaker}
                          query={debouncedQuery}
                          markClassName={markClass}
                        />
                        {w.date ? (
                          <span className={isDark ? "text-white/40" : "text-slate-400"}>
                            {" "}
                            • {w.date}
                          </span>
                        ) : null}
                      </div>

                      <div className={["mt-2 text-xs max-w-3xl", isDark ? "text-white/50" : "text-slate-500"].join(" ")}>
                        <HighlightText
                          text={w.description}
                          query={debouncedQuery}
                          markClassName={markClass}
                        />
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          // CARDS
          <div className="grid gap-10 md:grid-cols-2">
            {filtered.map((w) => {
              const s = statusFor(w, now)
              const isActive = s.active

              const cardBase = isDark
                ? "bg-white/5 border-white/10"
                : "bg-white/95 border-slate-200 shadow-[0_10px_30px_rgba(2,6,23,0.08)]"

              const cardHover = isDark ? "hover:bg-white/10" : "hover:bg-slate-50"
              const inactiveDim = isDark ? "opacity-60 grayscale-[20%]" : "opacity-90 saturate-90"

              return (
                <div
                  key={w.id}
                  className={[
                    "group relative overflow-hidden rounded-3xl border p-8 transition",
                    cardBase,
                    cardHover,
                    !isActive ? inactiveDim : "opacity-100",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "absolute inset-0 opacity-0 group-hover:opacity-100 transition",
                      isDark
                        ? "bg-gradient-to-br from-indigo-500/10 to-violet-500/10"
                        : "bg-gradient-to-br from-indigo-200/30 to-violet-200/30",
                    ].join(" ")}
                  />

                  <div className="relative">
                    <div className="flex items-center gap-3">
                      <TagBadge tag={w.tag} />
                      {isActive ? (
                        <span
                          className={[
                            "text-xs rounded-full border px-3 py-1",
                            isDark
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700",
                          ].join(" ")}
                        >
                          Happening now
                        </span>
                      ) : null}
                    </div>

                    <h2 className={["text-2xl font-semibold mt-4 tracking-tight", isDark ? "text-white" : "text-slate-900"].join(" ")}>
                      <HighlightText text={w.title} query={debouncedQuery} markClassName={markClass} />
                    </h2>

                    <p className={["mt-4 leading-relaxed", isDark ? "text-white/70" : "text-slate-600"].join(" ")}>
                      <HighlightText text={w.description} query={debouncedQuery} markClassName={markClass} />
                    </p>

                    <div className={["flex flex-wrap gap-4 mt-6 text-sm", isDark ? "text-white/70" : "text-slate-600"].join(" ")}>
                      <span>{w.date}</span>
                      <span>•</span>
                      <span>{w.time}</span>
                      <span>•</span>
                      <span>{w.speaker}</span>
                    </div>

                    <div className="mt-8 flex items-center gap-3">
                      <Link
                        href={`/webinars/${w.id}`}
                        className={[
                          "rounded-xl transition px-6 py-3 font-medium",
                          isDark
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-300/30",
                        ].join(" ")}
                      >
                        {w.tag === "On-demand" ? "Watch now →" : "Reserve spot →"}
                      </Link>

                      <Link
                        href={`/webinars/${w.id}`}
                        className={[
                          "rounded-xl border transition px-6 py-3 font-medium",
                          headerBtn,
                        ].join(" ")}
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="text-center pb-24">
        <h2 className="text-4xl font-bold tracking-tight">Want updates on new webinars?</h2>
        <p className={["mt-4", subtleText].join(" ")}>We’ll email you when new sessions are announced.</p>

        <button
          className={[
            "mt-8 rounded-2xl border px-8 py-4 text-lg font-medium transition",
            headerBtn,
          ].join(" ")}
        >
          Join the list
        </button>
      </section>
    </div>
  )
}