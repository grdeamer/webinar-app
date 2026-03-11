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
  { key: "Lobby", x: 110, y: 150 },
  { key: "General Session", x: 370, y: 95 },
  { key: "Q&A", x: 655, y: 75 },
  { key: "Webinars", x: 370, y: 235 },
  { key: "Webinar Detail", x: 655, y: 255 },
  { key: "Other", x: 370, y: 335 },
]

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

  const storageKey = `activityTreeLayout:${roomKey}`
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

    const x = clamp(nx, 60, 740)
    const y = clamp(ny, 50, 380)

    setPos((prev) => ({
      ...prev,
      [drag.key]: { x, y },
    }))
  }

  function endDrag() {
    draggingRef.current = null
  }

  async function refresh() {
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
  }

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
  }, [roomKey])

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
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Live attendees</div>
          <div className="text-xs text-white/60">{liveTotal} active</div>
        </div>

        {status ? <div className="mt-2 text-xs text-rose-200">{status}</div> : null}

        <div className="mt-3 max-h-[520px] overflow-auto rounded-xl border border-white/10 bg-black/20">
          {rows.length === 0 ? (
            <div className="p-4 text-sm text-white/60">No live attendees yet.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {rows.map((r) => {
                const node = normalizePath(r.current_path)
                return (
                  <button
                    key={r.session_id}
                    className="w-full text-left p-3 hover:bg-white/5 transition"
                    onClick={() => setSelectedNode(node)}
                    title="Click to jump to node"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">
                          {r.user_email || `Session ${r.session_id.slice(0, 8)}`}
                        </div>
                        <div className="mt-1 text-xs text-white/60 truncate">
                          {node} <span className="text-white/30">•</span>{" "}
                          <span className="text-white/40">{r.current_path}</span>
                        </div>
                      </div>

                      <span
                        className="shrink-0 rounded-full px-2 py-1 text-[11px] border"
                        style={{
                          borderColor: "rgba(255,255,255,0.12)",
                          backgroundColor: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.75)",
                        }}
                      >
                        live
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
            onClick={() => setPos(defaultPosMap())}
            title="Reset node positions"
          >
            Reset layout
          </button>
          <div className="text-xs text-white/50 self-center">
            Drag nodes on the map → layout saves automatically.
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Routing map</div>
            <div className="mt-1 text-xs text-white/60">
              Drag a node to reposition. Click a node to drill in.
            </div>
          </div>

          <div className="text-xs text-white/60">
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white/70" />
              </span>
              Live
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
          <svg
            ref={svgRef}
            viewBox="0 0 800 420"
            className="block w-full h-[420px]"
            onPointerMove={onSvgPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
          >
            <defs>
              <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <style>{`
                .dash { stroke-dasharray: 7 8; animation: dashMove 1.2s linear infinite; }
                @keyframes dashMove { to { stroke-dashoffset: -30; } }
              `}</style>
            </defs>

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
                    className={active ? "dash" : ""}
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

              const fill = active
                ? `rgba(255,255,255,${0.07 + intensity * 0.10})`
                : "rgba(255,255,255,0.05)"

              const stroke = active ? routeColor(k) : "rgba(255,255,255,0.18)"
              const strokeOpacity = active ? 0.25 + intensity * 0.75 : 0.2

              const av = avatarsByNode.get(k) || []
              const top = av.slice(0, 5)

              return (
                <g
                  key={k}
                  transform={`translate(${p.x - 110}, ${p.y - 30})`}
                  onClick={() => setSelectedNode(k)}
                  onPointerDown={(e) => onNodePointerDown(e, k)}
                  style={{ cursor: "grab" }}
                >
                  {active ? (
                    <rect
                      x="0"
                      y="0"
                      rx="18"
                      ry="18"
                      width="220"
                      height="60"
                      fill={routeColor(k)}
                      opacity={0.06 + intensity * 0.10}
                      filter="url(#softGlow)"
                    />
                  ) : null}

                  <rect
                    x="0"
                    y="0"
                    rx="18"
                    ry="18"
                    width="220"
                    height="60"
                    fill={fill}
                    stroke={stroke}
                    strokeOpacity={strokeOpacity}
                    strokeWidth={active ? 2 : 1.2}
                  />

                  <text x="16" y="25" fontSize="13" fill="rgba(255,255,255,0.92)" fontWeight="700">
                    {k}
                  </text>

                  <text x="16" y="44" fontSize="12" fill="rgba(255,255,255,0.58)">
                    {c} live
                  </text>

                  <g transform="translate(170, 14)">
                    <rect
                      x="0"
                      y="0"
                      width="38"
                      height="24"
                      rx="12"
                      fill={active ? routeColor(k) : "rgba(255,255,255,0.10)"}
                      opacity={active ? 0.22 + intensity * 0.25 : 1}
                    />
                    <text
                      x="19"
                      y="16"
                      textAnchor="middle"
                      fontSize="12"
                      fill="rgba(255,255,255,0.90)"
                      fontWeight="700"
                    >
                      {c}
                    </text>
                  </g>

                  <g transform="translate(118, 34)">
                    {top.map((a, i) => {
                      const x = i * 18
                      const lab = initials(a.label)
                      return (
                        <g key={a.id} transform={`translate(${x}, 0)`}>
                          <circle
                            cx="0"
                            cy="0"
                            r="10"
                            fill="rgba(255,255,255,0.10)"
                            stroke="rgba(255,255,255,0.25)"
                          />
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fontSize="9"
                            fill="rgba(255,255,255,0.85)"
                            fontWeight="700"
                          >
                            {lab}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">
              {selectedNode ? `Node: ${selectedNode}` : "Click a node to drill in"}
            </div>

            {selectedNode ? (
              <button
                onClick={() => setSelectedNode(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
              >
                Clear
              </button>
            ) : null}
          </div>

          {selectedNode ? (
            <>
              <div className="mt-2 text-xs text-white/60">
                {selectedRows.length} live attendee{selectedRows.length === 1 ? "" : "s"} here
              </div>

              <div className="mt-3 max-h-[180px] overflow-auto rounded-xl border border-white/10">
                {selectedRows.length === 0 ? (
                  <div className="p-3 text-sm text-white/60">Nobody here right now.</div>
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
            </>
          ) : (
            <div className="mt-2 text-sm text-white/60">
              Tip: drag nodes to rearrange your layout; it saves automatically.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}