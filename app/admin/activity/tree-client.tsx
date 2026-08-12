"use client"

import React from "react"
import { createClient } from "@supabase/supabase-js"

type ActivityRow = {
  room_key: string
  session_id: string
  user_email: string | null
  current_path: string
  updated_at: string
}

type NodeKey =
  | "Lobby"
  | "General Session"
  | "Q&A"
  | "Webinars"
  | "Webinar Detail"
  | "Admin"
  | "Login"
  | "Other"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function normalizePath(p: string): NodeKey {
  if (p.startsWith("/admin")) return "Admin"
  if (p.startsWith("/general-session/qa") || p.includes("/qa")) return "Q&A"
  if (p.startsWith("/general-session")) return "General Session"
  if (p.startsWith("/webinars/")) return "Webinar Detail"
  if (p.startsWith("/webinars")) return "Webinars"
  if (p.startsWith("/login")) return "Login"
  if (p === "/") return "Lobby"
  return "Other"
}

function initials(emailOrId: string) {
  const s = (emailOrId || "").trim()
  if (!s) return "?"
  if (s.includes("@")) {
    const [u] = s.split("@")
    const parts = u.split(/[._-]/g).filter(Boolean)
    const a = parts[0]?.[0] || u[0] || "?"
    const b = parts[1]?.[0] || u[1] || ""
    return (a + b).toUpperCase()
  }
  return s.slice(0, 2).toUpperCase()
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

const DEFAULT_NODES: { key: NodeKey; x: number; y: number }[] = [
  { key: "Lobby", x: 150, y: 300 },
  { key: "General Session", x: 430, y: 145 },
  { key: "Q&A", x: 790, y: 92 },
  { key: "Webinars", x: 470, y: 380 },
  { key: "Webinar Detail", x: 865, y: 390 },
  { key: "Other", x: 735, y: 545 },
]

const STAR_FIELD = [
  [3, 12, 1.2], [8, 41, .8], [12, 76, 1.5], [17, 24, .7], [22, 58, 1], [27, 9, .6],
  [31, 88, 1.3], [36, 34, .8], [41, 69, .6], [46, 16, 1.4], [51, 48, .7], [56, 84, 1],
  [61, 27, .7], [66, 61, 1.4], [71, 8, .8], [76, 43, 1.1], [81, 78, .7], [86, 20, 1.5],
  [91, 55, .8], [96, 90, 1.2], [6, 92, .7], [14, 4, 1], [24, 96, .8], [34, 3, 1.3],
  [44, 93, .6], [54, 5, 1], [64, 95, .7], [74, 2, 1.2], [84, 97, .8], [94, 6, 1.4],
  [2, 65, .6], [19, 83, 1.1], [29, 51, .7], [39, 22, 1.2], [49, 74, .8], [59, 38, 1],
  [69, 86, .6], [79, 57, 1.3], [89, 32, .7], [98, 71, 1],
] as const

const EDGES: [NodeKey, NodeKey][] = [
  ["Lobby", "General Session"],
  ["General Session", "Q&A"],
  ["Lobby", "Webinars"],
  ["Webinars", "Webinar Detail"],
  ["Lobby", "Other"],
]

function edgeId(a: string, b: string) {
  return `edge-${a.replace(/\W/g, "")}-${b.replace(/\W/g, "")}`
}

function routeColor(dest: string) {
  switch (dest) {
    case "General Session":
      return "#22d3ee"
    case "Q&A":
      return "#a78bfa"
    case "Webinars":
      return "#34d399"
    case "Webinar Detail":
      return "#fbbf24"
    case "Other":
      return "#94a3b8"
    default:
      return "#e5e7eb"
  }
}

type PosMap = Record<NodeKey, { x: number; y: number }>

function defaultPosMap(): PosMap {
  const m = {} as PosMap
  for (const n of DEFAULT_NODES) m[n.key] = { x: n.x, y: n.y }
  return m
}

export default function ActivityTreeClient({ roomKey }: { roomKey: string }) {
  const [rows, setRows] = React.useState<ActivityRow[]>([])
  const [status, setStatus] = React.useState("")
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null)

  const storageKey = `activityConstellationLayout:v2:${roomKey}`
  const [pos, setPos] = React.useState<PosMap>(() => {
    if (typeof window === "undefined") return defaultPosMap()
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return defaultPosMap()
      const parsed = JSON.parse(raw)
      const base = defaultPosMap()
      ;(Object.keys(base) as NodeKey[]).forEach((k) => {
        if (parsed?.[k]?.x != null && parsed?.[k]?.y != null) {
          base[k] = { x: Number(parsed[k].x), y: Number(parsed[k].y) }
        }
      })
      return base
    } catch {
      return defaultPosMap()
    }
  })

  React.useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(storageKey, JSON.stringify(pos))
  }, [pos, storageKey])

  const svgRef = React.useRef<SVGSVGElement | null>(null)
  const draggingRef = React.useRef<{
    key: NodeKey
    offsetX: number
    offsetY: number
  } | null>(null)

  function svgPointFromClient(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const inv = ctm.inverse()
    const p = pt.matrixTransform(inv)
    return { x: p.x, y: p.y }
  }

  function onNodePointerDown(e: React.PointerEvent, key: NodeKey) {
    if (e.button !== 0 && e.pointerType === "mouse") return
    e.preventDefault()
    e.stopPropagation()

    const p = svgPointFromClient(e.clientX, e.clientY)
    const current = pos[key]
    draggingRef.current = {
      key,
      offsetX: p.x - current.x,
      offsetY: p.y - current.y,
    }

    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }

  function onSvgPointerMove(e: React.PointerEvent) {
    const drag = draggingRef.current
    if (!drag) return

    e.preventDefault()

    const p = svgPointFromClient(e.clientX, e.clientY)
    const nx = p.x - drag.offsetX
    const ny = p.y - drag.offsetY

    const x = clamp(nx, 70, 1130)
    const y = clamp(ny, 60, 590)

    setPos((prev) => ({
      ...prev,
      [drag.key]: { x, y },
    }))
  }

  function endDrag() {
    draggingRef.current = null
  }

  const refresh = React.useCallback(async () => {
    const cutoff = new Date(Date.now() - 45_000).toISOString()

    const { data, error } = await supabase
      .from("attendee_activity")
      .select("room_key,session_id,user_email,current_path,updated_at")
      .eq("room_key", roomKey)
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false })

    if (error) {
      setStatus(error.message)
      return
    }
    setStatus("")
    setRows((data || []) as ActivityRow[])
  }, [roomKey])

  React.useEffect(() => {
    let mounted = true
    refresh()

    const poll = setInterval(() => {
      if (mounted) refresh()
    }, 10_000)

    const ch = supabase
      .channel(`activity-tree-${roomKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendee_activity",
          filter: `room_key=eq.${roomKey}`,
        },
        () => refresh()
      )
      .subscribe()

    return () => {
      mounted = false
      clearInterval(poll)
      supabase.removeChannel(ch)
    }
  }, [refresh, roomKey])

  const nodeCounts = React.useMemo(() => {
    const m = new Map<string, number>()
    rows.forEach((r) => {
      const n = normalizePath(r.current_path)
      m.set(n, (m.get(n) || 0) + 1)
    })
    return m
  }, [rows])

  const edgeCounts = React.useMemo(() => {
    const m = new Map<string, number>()

    rows.forEach((r) => {
      const dest = normalizePath(r.current_path)

      if (dest !== "Lobby" && dest !== "Admin" && dest !== "Login") {
        m.set(`Lobby->${dest}`, (m.get(`Lobby->${dest}`) || 0) + 1)
      }
      if (dest === "Q&A") {
        m.set("General Session->Q&A", (m.get("General Session->Q&A") || 0) + 1)
      }
      if (dest === "Webinar Detail") {
        m.set("Webinars->Webinar Detail", (m.get("Webinars->Webinar Detail") || 0) + 1)
      }
    })

    return m
  }, [rows])

  const maxNode = Math.max(1, ...Array.from(nodeCounts.values()))
  const maxEdge = Math.max(1, ...Array.from(edgeCounts.values()))

  const avatarsByNode = React.useMemo(() => {
    const m = new Map<string, { label: string; id: string }[]>()

    rows.forEach((r) => {
      const n = normalizePath(r.current_path)
      const label = r.user_email || r.session_id.slice(0, 8)
      const arr = m.get(n) || []
      arr.push({ label, id: r.session_id })
      m.set(n, arr)
    })

    for (const [k, v] of m.entries()) {
      const seen = new Set<string>()
      const dedup = v.filter((x) => {
        if (seen.has(x.id)) return false
        seen.add(x.id)
        return true
      })
      m.set(k, dedup)
    }

    return m
  }, [rows])

  const selectedRows = React.useMemo(() => {
    if (!selectedNode) return []
    return rows.filter((r) => normalizePath(r.current_path) === selectedNode)
  }, [rows, selectedNode])

  const liveTotal = rows.length

  function nodePos(key: NodeKey) {
    return pos[key] || { x: 100, y: 100 }
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[28px] border border-sky-200/[.12] bg-[#030713] shadow-[0_28px_100px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.05)]">
        <div className="relative z-10 flex flex-col gap-4 border-b border-white/[.07] bg-[linear-gradient(90deg,rgba(7,13,28,.96),rgba(9,12,28,.78))] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.22em] text-sky-200/45">Platform telemetry</div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-.02em]">Activity Constellation</h2>
            <p className="mt-1 text-xs text-white/45">Every star is a destination. Live audience movement illuminates the paths between them.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.07] px-3 py-2 text-xs font-semibold text-emerald-100/75"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-40" /><span className="relative h-2 w-2 rounded-full bg-emerald-300" /></span>{liveTotal} live {liveTotal === 1 ? "signal" : "signals"}</div>
            <button className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-semibold text-white/65 transition hover:bg-white/[.08] hover:text-white" onClick={() => setPos(defaultPosMap())} title="Reset star positions">Reset constellation</button>
          </div>
        </div>

        {status ? <div className="relative z-10 border-b border-rose-300/10 bg-rose-500/[.06] px-6 py-2 text-xs text-rose-200">{status}</div> : null}

        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_45%,rgba(14,165,233,.09),transparent_26%),radial-gradient(circle_at_73%_28%,rgba(139,92,246,.10),transparent_24%),radial-gradient(circle_at_82%_80%,rgba(244,63,94,.045),transparent_22%),linear-gradient(180deg,#030714,#02040b)]">
          <svg
            ref={svgRef}
            viewBox="0 0 1200 650"
            role="img"
            aria-label="Live platform activity constellation"
            className="block h-[560px] w-full touch-none xl:h-[650px]"
            onPointerMove={onSvgPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
          >
            <defs>
              <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <radialGradient id="constellationCore">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="35%" stopColor="#dbeafe" stopOpacity=".95" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity=".15" />
              </radialGradient>

              <style>{`
                .signal-path { stroke-dasharray: 3 13; animation: signalTravel 1.8s linear infinite; }
                .field-star { animation: starBreath 4.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                .active-star { animation: activeStar 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
                @keyframes signalTravel { to { stroke-dashoffset: -32; } }
                @keyframes starBreath { 0%,100% { opacity:.28; } 50% { opacity:.75; } }
                @keyframes activeStar { 0%,100% { opacity:.72; transform:scale(.92); } 50% { opacity:1; transform:scale(1.12); } }
                @media (prefers-reduced-motion: reduce) { .signal-path,.field-star,.active-star { animation:none; } }
              `}</style>
            </defs>

            <g aria-hidden="true">
              {STAR_FIELD.map(([x, y, radius], index) => <circle key={`${x}-${y}`} className="field-star" cx={`${x}%`} cy={`${y}%`} r={radius} fill="white" opacity={.22 + (index % 4) * .08} style={{ animationDelay: `${(index % 9) * .37}s` }} />)}
              <path d="M 65 535 C 260 455, 355 590, 570 510 S 925 465, 1145 555" fill="none" stroke="#60a5fa" strokeOpacity=".035" strokeWidth="38" />
              <path d="M 170 85 C 350 35, 670 115, 1050 58" fill="none" stroke="#a78bfa" strokeOpacity=".035" strokeWidth="28" />
            </g>

            <defs>
              {EDGES.map(([a, b]) => {
                const A = nodePos(a)
                const B = nodePos(b)
                const id = edgeId(a, b)
                const d = `M ${A.x} ${A.y} C ${(A.x + B.x) / 2} ${A.y}, ${(A.x + B.x) / 2} ${B.y}, ${B.x} ${B.y}`
                return <path key={id} id={id} d={d} />
              })}
            </defs>

            {EDGES.map(([a, b]) => {
              const key = `${a}->${b}`
              const count = edgeCounts.get(key) || 0
              const intensity = clamp(count / maxEdge, 0, 1)
              const active = count > 0

              const destColor = routeColor(b)
              const strokeOpacity = active ? 0.25 + intensity * 0.75 : 0.12
              const strokeWidth = active ? 2.2 + intensity * 2.8 : 2

              return (
                <g key={key}>
                  <use
                    href={`#${edgeId(a, b)}`}
                    fill="none"
                    stroke="white"
                    strokeOpacity="0.08"
                    strokeWidth="2"
                  />

                  <use
                    href={`#${edgeId(a, b)}`}
                    fill="none"
                    stroke={destColor}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={strokeWidth}
                    className={active ? "signal-path" : ""}
                    filter={active ? "url(#softGlow)" : undefined}
                  />

                  {active
                    ? Array.from({ length: Math.min(7, Math.max(2, count)) }).map((_, i) => {
                        const dur = clamp(2.8 - intensity * 1.6, 1.1, 2.8)
                        const begin = `${i * 0.22}s`
                        const r = 2.2 + intensity * 1.6

                        return (
                          <circle
                            key={`${key}-pkt-${i}`}
                            r={r}
                            fill="white"
                            opacity={0.65}
                            filter="url(#softGlow)"
                          >
                            <animateMotion
                              dur={`${dur}s`}
                              repeatCount="indefinite"
                              begin={begin}
                              rotate="auto"
                            >
                              <mpath href={`#${edgeId(a, b)}`} />
                            </animateMotion>
                          </circle>
                        )
                      })
                    : null}
                </g>
              )
            })}

            {(Object.keys(pos) as NodeKey[]).map((k) => {
              const p = nodePos(k)
              const c = nodeCounts.get(k) || 0
              const intensity = clamp(c / maxNode, 0, 1)
              const active = c > 0

              const stroke = active ? routeColor(k) : "rgba(255,255,255,0.18)"
              const starRadius = active ? 13 + intensity * 8 : 9

              const av = avatarsByNode.get(k) || []
              const top = av.slice(0, 6)
              const isSelected = selectedNode === k

              return (
                <g
                  key={k}
                  transform={`translate(${p.x}, ${p.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${k}, ${c} live`}
                  onClick={() => setSelectedNode(k)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedNode(k) }}
                  onPointerDown={(e) => onNodePointerDown(e, k)}
                  style={{ cursor: "grab" }}
                >
                  {isSelected ? <circle r={starRadius + 16} fill="none" stroke={stroke} strokeOpacity=".5" strokeWidth="1" strokeDasharray="3 6" /> : null}
                  {active ? <><circle className="active-star" r={starRadius + 18} fill={routeColor(k)} opacity={.08 + intensity * .08} filter="url(#softGlow)" /><circle r={starRadius + 9} fill="none" stroke={routeColor(k)} strokeOpacity={.18 + intensity * .28} strokeWidth="1" /></> : null}
                  <circle r={starRadius} fill={active ? routeColor(k) : "#94a3b8"} opacity={active ? .30 + intensity * .28 : .16} filter={active ? "url(#softGlow)" : undefined} />
                  <circle r={Math.max(3.5, starRadius * .42)} fill="url(#constellationCore)" />
                  <circle r="2.2" fill="white" />

                  <g transform="translate(22,-14)">
                    <rect x="0" y="0" width={k.length > 13 ? 154 : 132} height="49" rx="12" fill="rgba(5,9,20,.78)" stroke={stroke} strokeOpacity={active ? .32 : .13} />
                    <text x="12" y="20" fontSize="12" fill="rgba(255,255,255,.92)" fontWeight="700">
                    {k}
                    </text>
                    <text x="12" y="37" fontSize="10" fill={active ? routeColor(k) : "rgba(255,255,255,.42)"} fontWeight="600">{c} LIVE {c === 1 ? "SIGNAL" : "SIGNALS"}</text>
                  </g>

                  <g>
                    {top.map((a, i) => {
                      const angle = (Math.PI * 2 * i) / Math.max(top.length, 1) - Math.PI / 2
                      const orbit = starRadius + 12
                      const x = Math.cos(angle) * orbit
                      const y = Math.sin(angle) * orbit
                      const lab = initials(a.label)
                      return (
                        <g key={a.id} transform={`translate(${x},${y})`}>
                          <circle r="5.5" fill="rgba(6,11,24,.95)" stroke={routeColor(k)} strokeOpacity=".75" />
                          <text x="0" y="2.5" textAnchor="middle" fontSize="4.8" fill="white" fontWeight="700">{lab}</text>
                        </g>
                      )
                    })}
                  </g>
                </g>
              )
            })}
          </svg>
          <div className="pointer-events-none absolute bottom-5 left-6 rounded-full border border-white/[.07] bg-black/25 px-3 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-white/35 backdrop-blur-md">Drag stars to arrange · Select to inspect</div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-sky-100/35">Incoming signals</div><div className="mt-2 text-sm font-semibold">Live attendees across Jupiter</div></div><div className="text-xs text-white/45">{liveTotal} active</div></div>
          <div className="mt-4 max-h-[280px] overflow-auto rounded-xl border border-white/[.07] bg-black/20">
            {rows.length === 0 ? <div className="p-5 text-sm text-white/45">The constellation is quiet. Live attendee signals will appear here.</div> : <div className="grid divide-y divide-white/[.06] md:grid-cols-2 md:divide-x md:divide-y-0">{rows.map((row) => { const node = normalizePath(row.current_path); return <button key={row.session_id} className="flex items-center gap-3 p-3 text-left transition hover:bg-white/[.05]" onClick={() => setSelectedNode(node)}><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: routeColor(node), boxShadow: `0 0 12px ${routeColor(node)}` }} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{row.user_email || `Session ${row.session_id.slice(0, 8)}`}</span><span className="mt-1 block truncate text-xs text-white/40">{node} · {row.current_path}</span></span><span className="rounded-full border border-white/[.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/40">live</span></button>})}</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="flex items-center justify-between gap-3">
            <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-100/35">Star detail</div><div className="mt-2 text-sm font-semibold">{selectedNode || "Select a destination star"}</div></div>

            {selectedNode ? (
              <button
                onClick={() => setSelectedNode(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
              >
                Clear
              </button>
            ) : null}
          </div>

          {selectedNode ? <>
              <div className="mt-3 text-xs text-white/50">
                {selectedRows.length} live attendee{selectedRows.length === 1 ? "" : "s"} here
              </div>

              <div className="mt-3 max-h-[210px] overflow-auto rounded-xl border border-white/[.07] bg-black/15">
                {selectedRows.length === 0 ? (
                  <div className="p-4 text-sm text-white/45">No live signals at this star right now.</div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {selectedRows.map((r) => {
                      const label = r.user_email || `Session ${r.session_id.slice(0, 8)}`
                      return (
                        <div key={r.session_id} className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="truncate">
                              <div className="text-sm font-medium truncate">{label}</div>
                              <div className="mt-1 text-xs text-white/60 truncate">
                                <span className="text-white/40">Path:</span>{" "}
                                <span className="text-white/70">{r.current_path}</span>
                              </div>
                            </div>
                            <span className="text-[11px] text-white/50 font-mono">
                              {r.session_id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </> : <div className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-sm leading-6 text-white/40">Select any star to inspect the people currently active at that destination. Your constellation layout saves automatically.</div>}
        </div>
      </section>
    </div>
  )
}
