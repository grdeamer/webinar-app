"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { PauseCircle } from "@untitledui/icons"

type ActivityRow = {
  room_key: string
  session_id: string
  user_email: string | null
  current_path: string
  updated_at: string
}

type QuestionSignal = {
  id: string
  name: string | null
  question: string
  status: "pending" | "approved" | "answered"
  created_at: string
  origin_region: string | null
  origin_country: string | null
  origin_city: string | null
  origin_lat: number
  origin_lng: number
}

type Destination = "Lobby" | "Main Stage" | "Session" | "Q&A"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const nodes: Record<Destination, { x: number; y: number }> = {
  Lobby: { x: 170, y: 120 },
  "Main Stage": { x: 720, y: 205 },
  Session: { x: 165, y: 475 },
  "Q&A": { x: 700, y: 450 },
}

const fieldStars = [
  [4, 12, 1], [9, 38, .7], [13, 76, 1.2], [19, 24, .6], [25, 59, .9], [31, 8, .6],
  [37, 84, 1.1], [43, 33, .7], [49, 67, .55], [55, 15, 1.1], [61, 48, .65], [67, 86, .9],
  [73, 26, .65], [79, 61, 1.1], [85, 9, .7], [91, 43, .9], [96, 78, .65], [7, 91, .6],
  [16, 5, .8], [29, 95, .65], [41, 4, 1], [53, 93, .55], [65, 5, .8], [77, 94, .6],
  [89, 96, .65], [98, 17, 1], [2, 64, .55], [22, 82, .9], [34, 51, .6], [46, 21, .95],
] as const

function destinationFor(path: string): Destination {
  if (path.includes("/qa")) return "Q&A"
  if (path.startsWith("/general-session") || path.includes("main-stage")) return "Main Stage"
  if (path.includes("/session") || path.includes("/webinar")) return "Session"
  return "Lobby"
}

function shortPath(path: string) {
  const destination = destinationFor(path)
  if (destination === "Main Stage") return "entered Main Stage"
  if (destination === "Q&A") return "opened Q&A"
  if (destination === "Session") return "entered a session"
  return "entered the lobby"
}

function pathBetween(destination: Destination) {
  const target = nodes[destination]
  return `M 435 300 C ${(435 + target.x) / 2} 300, ${(435 + target.x) / 2} ${target.y}, ${target.x} ${target.y}`
}

function questionPosition(question: QuestionSignal) {
  return {
    x: ((question.origin_lng + 180) / 360) * 880,
    y: ((90 - question.origin_lat) / 180) * 600,
  }
}

function questionLocation(question: QuestionSignal) {
  if (question.origin_city && question.origin_region) {
    return `${question.origin_city}, ${question.origin_region}`
  }
  return question.origin_city || question.origin_region || question.origin_country || "Approximate origin"
}

export default function ActivityTreeClient({
  roomKey,
  eventId,
  eventTitle,
}: {
  roomKey: string
  eventId: string | null
  eventTitle: string
}) {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [questionSignals, setQuestionSignals] = useState<QuestionSignal[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [paused, setPaused] = useState(false)
  const [range, setRange] = useState<"now" | "hour" | "day">("now")
  const [rangeMotionKey, setRangeMotionKey] = useState(0)

  const selectRange = useCallback((value: "now" | "hour" | "day") => {
    setRange(value)
    setRangeMotionKey((current) => current + 1)
  }, [])

  const cutoff = useCallback(() => {
    const age = range === "now" ? 45_000 : range === "hour" ? 3_600_000 : 86_400_000
    return new Date(Date.now() - age).toISOString()
  }, [range])

  const refresh = useCallback(async () => {
    if (paused) return
    const { data, error: queryError } = await supabase
      .from("attendee_activity")
      .select("room_key,session_id,user_email,current_path,updated_at")
      .eq("room_key", roomKey)
      .gte("updated_at", cutoff())
      .order("updated_at", { ascending: false })
      .limit(250)
    if (queryError) {
      setError(queryError.message)
      return
    }
    setError("")
    setRows((data ?? []) as ActivityRow[])
  }, [cutoff, paused, roomKey])

  const refreshQuestions = useCallback(async () => {
    if (paused || !eventId) return
    const response = await fetch(
      `/api/admin/activity/questions?event_id=${encodeURIComponent(eventId)}`,
      { cache: "no-store" }
    )
    const data = (await response.json().catch((): null => null)) as
      | { items?: QuestionSignal[]; error?: string }
      | null
    if (!response.ok) {
      setError(data?.error || "Unable to load question signals")
      return
    }
    setQuestionSignals(Array.isArray(data?.items) ? data.items : [])
  }, [eventId, paused])

  useEffect(() => {
    const initial = window.setTimeout(() => { void refresh() }, 0)
    const poll = window.setInterval(() => { void refresh() }, 10_000)
    const channel = supabase.channel(`activity-constellation-${roomKey}`).on("postgres_changes", {
      event: "*", schema: "public", table: "attendee_activity", filter: `room_key=eq.${roomKey}`,
    }, () => { void refresh() }).subscribe()
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [refresh, roomKey])

  useEffect(() => {
    const initial = window.setTimeout(() => { void refreshQuestions() }, 0)
    const poll = window.setInterval(() => { void refreshQuestions() }, 5_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(poll)
    }
  }, [refreshQuestions])

  const counts = useMemo(() => {
    const next = new Map<Destination, number>()
    rows.forEach((row) => {
      const destination = destinationFor(row.current_path)
      next.set(destination, (next.get(destination) ?? 0) + 1)
    })
    return next
  }, [rows])

  const liveTotal = new Set(rows.map((row) => row.session_id)).size
  const maxCount = Math.max(1, ...counts.values())

  return (
    <div className="global-editorial-page mx-auto max-w-[1440px]">
      <header className="flex flex-col gap-6 border-b border-white/10 pb-7 lg:flex-row lg:items-start lg:justify-between">
        <div><div className="text-[11px] font-semibold uppercase tracking-[.24em] text-white/36">Jupiter.events Admin</div><h1 className="mt-3 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Live Activity</h1><p className="mt-3 text-base text-white/58">See where audiences are gathering across every active event.</p></div>
        <div className="flex flex-wrap items-center gap-4"><div className="activity-range-control">{(["now", "hour", "day"] as const).map((value) => <button key={value} type="button" onClick={() => selectRange(value)} className={`activity-range-option ${range === value ? "is-selected" : ""}`} aria-pressed={range === value}>{value === "now" ? "Now" : value === "hour" ? "1 hour" : "24 hours"}</button>)}</div><button type="button" onClick={() => setPaused((current) => !current)} className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"><PauseCircle className="h-4 w-4" />{paused ? "Resume updates" : "Pause updates"}</button></div>
      </header>

      <div className="flex items-center gap-3 border-b border-white/10 py-6 text-lg text-white/72"><span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.55)]" /><strong className="font-semibold text-white">{liveTotal}</strong> people live across {liveTotal ? "1 event" : "the platform"}</div>
      {error ? <div className="border-b border-red-300/15 py-3 text-sm text-red-200">{error}</div> : null}

      <div className="grid min-h-[660px] border-b border-white/10 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,.7fr)]">
        <section className="relative min-h-[620px] overflow-hidden border-white/10 px-1 py-7 xl:border-r xl:pr-8">
          <h2 className="relative z-10 text-sm font-semibold">Activity constellation</h2>
          <svg viewBox="0 0 880 600" role="img" aria-label="Live audience activity constellation" className="absolute inset-x-0 bottom-3 h-[570px] w-full">
            <defs>
              <filter id="activity-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <filter id="range-orbit-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5" result="rangeBlur" /><feMerge><feMergeNode in="rangeBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <linearGradient id="range-history-gradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6fa8ff" stopOpacity=".08" /><stop offset=".45" stopColor="#8d74ff" stopOpacity=".9" /><stop offset="1" stopColor="#ffd486" stopOpacity=".95" /></linearGradient>
              <style>{`.constellation-path{stroke-dasharray:4 11;animation:constellation-flow 2.8s linear infinite}.question-ping{transform-box:fill-box;transform-origin:center;animation:question-ping 2.4s ease-out infinite}.range-history-path{stroke-dasharray:11 23;stroke-dashoffset:180;animation:range-path-arrive 1.25s cubic-bezier(.2,.75,.2,1) forwards,range-path-drift 3.2s linear 1.25s infinite}.range-orbit-sweep{stroke-dasharray:14 20;stroke-dashoffset:180;animation:range-sweep 1.1s cubic-bezier(.2,.8,.2,1) forwards}.range-pulse-ring{transform-box:fill-box;transform-origin:center;animation:range-ring 1.35s ease-out forwards}.range-node-ring{transform-box:fill-box;transform-origin:center;animation:range-node 1.1s ease-out forwards}.range-timeline{opacity:0;animation:range-fade .7s ease .35s forwards}@keyframes constellation-flow{to{stroke-dashoffset:-30}}@keyframes question-ping{0%{transform:scale(.45);opacity:.8}80%,100%{transform:scale(2.4);opacity:0}}@keyframes range-path-arrive{0%{stroke-dashoffset:180;opacity:0}20%{opacity:.9}100%{stroke-dashoffset:0;opacity:.9}}@keyframes range-path-drift{to{stroke-dashoffset:-68}}@keyframes range-sweep{0%{stroke-dashoffset:180;opacity:0}15%{opacity:1}100%{stroke-dashoffset:0;opacity:.85}}@keyframes range-ring{0%{transform:scale(.35);opacity:.9}100%{transform:scale(2.4);opacity:0}}@keyframes range-node{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.8);opacity:0}}@keyframes range-fade{to{opacity:1}}@media(prefers-reduced-motion:reduce){.constellation-path,.question-ping,.range-history-path,.range-orbit-sweep,.range-pulse-ring,.range-node-ring,.range-timeline{animation:none;opacity:.72}}`}</style>
            </defs>
            <g aria-hidden="true">{fieldStars.map(([x, y, radius], index) => <circle key={`${x}-${y}`} cx={`${x}%`} cy={`${y}%`} r={radius} fill={index % 6 === 0 ? "#ffd79c" : index % 4 === 0 ? "#a9c7ff" : "white"} opacity={.18 + (index % 4) * .08} />)}</g>
            {range !== "now" ? <g key={`range-history-${range}-${rangeMotionKey}`} aria-hidden="true">
              <g className="range-timeline">
                <path d="M 330 88 A 118 118 0 0 1 555 88" fill="none" stroke="rgba(141,116,255,.28)" strokeWidth="1" strokeDasharray="2 8" />
                <path className="range-orbit-sweep" d="M 330 88 A 118 118 0 0 1 555 88" fill="none" stroke="url(#range-history-gradient)" strokeWidth="2" filter="url(#range-orbit-glow)" />
                <text x="442" y="43" textAnchor="middle" fill="rgba(216,224,255,.76)" fontSize="10" fontWeight="650" letterSpacing="2">{range === "day" ? "24-HOUR ORBIT" : "1-HOUR ORBIT"}</text>
                <text x="330" y="106" textAnchor="middle" fill="rgba(255,255,255,.34)" fontSize="9">-{range === "day" ? "24h" : "60m"}</text>
                <text x="442" y="74" textAnchor="middle" fill="rgba(255,255,255,.34)" fontSize="9">-{range === "day" ? "12h" : "30m"}</text>
                <text x="555" y="106" textAnchor="middle" fill="rgba(255,255,255,.62)" fontSize="9">Now</text>
              </g>
              {(Object.keys(nodes) as Destination[]).map((destination, index) => <g key={`history-${destination}`}>
                <path d={pathBetween(destination)} fill="none" stroke="url(#range-history-gradient)" strokeOpacity={range === "day" ? .78 : .58} strokeWidth={range === "day" ? 1.8 : 1.45} className="range-history-path" style={{ animationDelay: `${index * 90}ms, ${1250 + index * 90}ms` }} filter="url(#range-orbit-glow)" />
                <circle cx={nodes[destination].x} cy={nodes[destination].y} r="17" fill="none" stroke={index % 2 ? "#ffd486" : "#83aaff"} strokeOpacity=".62" className="range-node-ring" style={{ animationDelay: `${420 + index * 100}ms` }} />
              </g>)}
              <circle cx="435" cy="300" r="18" fill="none" stroke="#ffd486" strokeWidth="1.4" className="range-pulse-ring" filter="url(#range-orbit-glow)" />
              <circle cx="435" cy="300" r="28" fill="none" stroke="#8d74ff" strokeWidth="1" className="range-pulse-ring" style={{ animationDelay: "140ms" }} />
            </g> : null}
            {(Object.keys(nodes) as Destination[]).map((destination) => {
              const count = counts.get(destination) ?? 0
              const intensity = count / maxCount
              return <g key={`path-${destination}`}><path d={pathBetween(destination)} fill="none" stroke="#f0bd6e" strokeOpacity={count ? .26 + intensity * .54 : .08} strokeWidth={count ? 1.3 + intensity * 1.6 : 1} className={count ? "constellation-path" : ""} filter={count ? "url(#activity-glow)" : undefined} /></g>
            })}
            <g transform="translate(435,300)"><circle r="30" fill="#f3bd69" opacity=".08" filter="url(#activity-glow)" /><circle r="9" fill="#ffd993" opacity=".7" filter="url(#activity-glow)" /><circle r="3.5" fill="#fff6df" /><text x="30" y="-5" fill="white" fontSize="17" fontWeight="600">{eventTitle}</text><text x="30" y="18" fill="#f0bd6e" fontSize="13">{liveTotal} live</text></g>
            {(Object.keys(nodes) as Destination[]).map((destination) => {
              const position = nodes[destination]
              const count = counts.get(destination) ?? 0
              return <g key={destination} transform={`translate(${position.x},${position.y})`}><circle r={count ? 18 : 11} fill={count ? "#f2bd70" : "#737b8c"} opacity={count ? .15 : .08} filter={count ? "url(#activity-glow)" : undefined} /><circle r={count ? 6 : 4} fill={count ? "#ffe3aa" : "#7c8495"} opacity={count ? .9 : .45} /><text x="22" y="5" fill={count ? "white" : "rgba(255,255,255,.42)"} fontSize="14" fontWeight="500">{destination} · {count}</text></g>
            })}
            {questionSignals.map((question) => {
              const position = questionPosition(question)
              const selected = selectedQuestionId === question.id
              const fill = question.status === "pending" ? "#7dd3fc" : "#86efac"
              return (
                <g
                  key={question.id}
                  transform={`translate(${position.x},${position.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Question from ${questionLocation(question)}`}
                  className="cursor-pointer outline-none"
                  onClick={() => setSelectedQuestionId(question.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setSelectedQuestionId(question.id)
                    }
                  }}
                >
                  <circle r={selected ? 20 : 15} fill={fill} opacity={selected ? .16 : .08} filter="url(#activity-glow)" />
                  <circle className="question-ping" r="8" fill="none" stroke={fill} strokeWidth="1.2" />
                  <circle r={selected ? 5 : 3.5} fill={fill} />
                  {selected ? (
                    <g transform="translate(12,-16)">
                      <rect width="170" height="40" rx="8" fill="#070d18" stroke="rgba(255,255,255,.16)" />
                      <text x="10" y="16" fill="white" fontSize="11" fontWeight="600">Question signal</text>
                      <text x="10" y="31" fill="rgba(255,255,255,.56)" fontSize="10">{questionLocation(question)}</text>
                    </g>
                  ) : null}
                </g>
              )
            })}
          </svg>
          <div className="absolute bottom-6 left-1 flex items-center gap-3 text-xs text-white/40"><span className="h-px w-9 bg-gradient-to-r from-amber-200 to-transparent shadow-[0_0_8px_rgba(253,230,138,.7)]" />Brighter paths indicate recent movement</div>
        </section>

        <aside className="px-0 py-7 xl:pl-8">
          {questionSignals.length ? (
            <section className="mb-8 border-b border-white/10 pb-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Question signals</h2>
                <span className="text-xs text-sky-200/58">{questionSignals.length} in 24 hours</span>
              </div>
              <div className="mt-4 space-y-2">
                {questionSignals.slice(0, 5).map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setSelectedQuestionId(question.id)}
                    className={`block w-full rounded-[10px] border px-3 py-3 text-left transition ${
                      selectedQuestionId === question.id
                        ? "border-sky-300/32 bg-sky-300/[.08]"
                        : "border-white/[.08] bg-white/[.025] hover:bg-white/[.045]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[.1em] text-white/38">
                      <span>{questionLocation(question)}</span>
                      <span>{question.status}</span>
                    </span>
                    <span className="mt-2 line-clamp-2 block text-sm leading-5 text-white/72">
                      {question.question}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          <h2 className="text-sm font-semibold">Live signals</h2>
          <div className="mt-7 divide-y divide-white/[.085]">
            {rows.slice(0, 7).map((row, index) => <div key={`${row.session_id}-${row.updated_at}-${index}`} className="grid grid-cols-[32px_1fr_auto] items-start gap-3 py-5"><span className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full border ${index === 0 ? "border-amber-200/20 bg-amber-300/[.08] text-amber-100" : "border-white/10 bg-white/[.035] text-white/55"}`}>{destinationFor(row.current_path).slice(0,1)}</span><div><div className="text-sm font-medium">{row.user_email || "Attendee"}</div><div className="mt-1 text-sm text-white/45">{shortPath(row.current_path)}</div></div><time className="pt-1 text-xs text-white/35">{new Date(row.updated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/New_York" })}</time></div>)}
            {rows.length === 0 ? <div className="py-10 text-sm leading-6 text-white/42">The constellation is quiet. New audience movement will appear here automatically.</div> : null}
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/38"><span>Showing latest signals</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />{paused ? "Paused" : "Live"}</span></div>
        </aside>
      </div>
    </div>
  )
}
