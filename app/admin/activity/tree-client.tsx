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

export default function ActivityTreeClient({ roomKey, eventTitle }: { roomKey: string; eventTitle: string }) {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [error, setError] = useState("")
  const [paused, setPaused] = useState(false)
  const [range, setRange] = useState<"now" | "hour" | "day">("now")

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
        <div className="flex flex-wrap items-center gap-4"><div className="inline-flex overflow-hidden rounded-xl border border-white/12">{(["now", "hour", "day"] as const).map((value) => <button key={value} type="button" onClick={() => setRange(value)} className={`min-w-20 px-4 py-2.5 text-sm transition ${range === value ? "bg-white/[.09] text-white" : "text-white/48 hover:bg-white/[.04]"}`}>{value === "now" ? "Now" : value === "hour" ? "1 hour" : "24 hours"}</button>)}</div><button type="button" onClick={() => setPaused((current) => !current)} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><PauseCircle className="h-4 w-4" />{paused ? "Resume updates" : "Pause updates"}</button></div>
      </header>

      <div className="flex items-center gap-3 border-b border-white/10 py-6 text-lg text-white/72"><span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.55)]" /><strong className="font-semibold text-white">{liveTotal}</strong> people live across {liveTotal ? "1 event" : "the platform"}</div>
      {error ? <div className="border-b border-red-300/15 py-3 text-sm text-red-200">{error}</div> : null}

      <div className="grid min-h-[660px] border-b border-white/10 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,.7fr)]">
        <section className="relative min-h-[620px] overflow-hidden border-white/10 px-1 py-7 xl:border-r xl:pr-8">
          <h2 className="relative z-10 text-sm font-semibold">Activity constellation</h2>
          <svg viewBox="0 0 880 600" role="img" aria-label="Live audience activity constellation" className="absolute inset-x-0 bottom-3 h-[570px] w-full">
            <defs>
              <filter id="activity-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <style>{`.constellation-path{stroke-dasharray:4 11;animation:constellation-flow 2.8s linear infinite}@keyframes constellation-flow{to{stroke-dashoffset:-30}}@media(prefers-reduced-motion:reduce){.constellation-path{animation:none}}`}</style>
            </defs>
            <g aria-hidden="true">{fieldStars.map(([x, y, radius], index) => <circle key={`${x}-${y}`} cx={`${x}%`} cy={`${y}%`} r={radius} fill={index % 6 === 0 ? "#ffd79c" : index % 4 === 0 ? "#a9c7ff" : "white"} opacity={.18 + (index % 4) * .08} />)}</g>
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
          </svg>
          <div className="absolute bottom-6 left-1 flex items-center gap-3 text-xs text-white/40"><span className="h-px w-9 bg-gradient-to-r from-amber-200 to-transparent shadow-[0_0_8px_rgba(253,230,138,.7)]" />Brighter paths indicate recent movement</div>
        </section>

        <aside className="px-0 py-7 xl:pl-8">
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
