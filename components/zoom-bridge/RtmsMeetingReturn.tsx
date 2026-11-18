"use client"
import { useEffect, useRef, useState } from "react"
import { ioButton } from "./SatelliteCard"
const endpoint = "/api/admin/zoom-bridge/rtms-return"
const terminal = ["failed", "stopped", "expired", "ended", "interrupted"]
const labels: Record<string, string> = { waiting: "Waiting for authorized Zoom media", connecting: "Connecting to Zoom media", receiving: "Receiving Zoom media", failed: "Receiver failed", stopped: "Receiver stopped", expired: "Test expired", ended: "Meeting stream ended", interrupted: "Zoom stream interrupted" }

export default function RtmsMeetingReturn({ joinUrl }: { joinUrl: string }) {
  const [configured, setConfigured] = useState(false)
  const [appReady, setAppReady] = useState(false)
  const [session, setSession] = useState<string | null>(null)
  const [state, setState] = useState("stopped")
  const [pictures, setPictures] = useState<{ video?: string; share?: string }>({})
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const identity = useRef<string | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const abort = new AbortController()
    void fetch(`${endpoint}?config=1`, { signal: abort.signal, cache: "no-store" }).then(r => r.ok ? r.json() : null).then(result => { if (!abort.signal.aborted) { setConfigured(result?.configured === true); setAppReady(result?.appReady === true) } }).catch(() => {})
    return () => {
      mounted.current = false; abort.abort()
      if (identity.current) void fetch(endpoint, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop", sessionId: identity.current }) }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!session) return
    const abort = new AbortController()
    const urls: { video?: string; share?: string } = {}
    let timer: ReturnType<typeof setTimeout> | undefined
    async function poll() {
      try {
        const results = await Promise.all((["video", "share"] as const).map(async kind => {
          const response = await fetch(`${endpoint}?sessionId=${session}&kind=${kind}`, { signal: abort.signal, cache: "no-store" })
          if (!response.ok) throw new Error("Receiver connection lost")
          if (response.headers.get("content-type")?.startsWith("image/jpeg")) return { kind, blob: await response.blob(), state: response.headers.get("x-return-state") ?? "receiving" }
          const status = await response.json()
          return { kind, blob: null as Blob | null, state: status.state ?? "failed" }
        }))
        if (abort.signal.aborted) return
        for (const result of results) {
          if (urls[result.kind]) URL.revokeObjectURL(urls[result.kind]!)
          urls[result.kind] = result.blob ? URL.createObjectURL(result.blob) : undefined
        }
        setPictures({ ...urls }); setState(results[0].state); setError("")
        if (results.some(result => terminal.includes(result.state))) return
      } catch {
        if (abort.signal.aborted) return
        for (const kind of ["video", "share"] as const) { if (urls[kind]) URL.revokeObjectURL(urls[kind]!); urls[kind] = undefined }
        setPictures({}); setError("Receiver connection lost. Stop this test before trying again.")
      }
      if (!abort.signal.aborted) timer = setTimeout(() => void poll(), 1000)
    }
    void poll()
    return () => { abort.abort(); clearTimeout(timer); for (const url of Object.values(urls)) if (url) URL.revokeObjectURL(url) }
  }, [session])

  async function control(action: "arm" | "stop") {
    const id = action === "arm" ? crypto.randomUUID() : identity.current
    if (!id) return
    identity.current = id
    setBusy(true); setError("")
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, sessionId: id, joinUrl }) })
      const result = await response.json()
      if (!response.ok || result.error) throw new Error(result.error ?? "Receiver request failed")
      if (!mounted.current) {
        if (action === "arm") void fetch(endpoint, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop", sessionId: id }) }).catch(() => {})
        return
      }
      setState(result.state)
      if (action === "stop") { identity.current = null; setSession(null); setPictures({}) }
      else setSession(id)
    } catch (cause) {
      if (mounted.current) { setSession(id); setError(cause instanceof Error ? cause.message : "Receiver request failed") }
    } finally { if (mounted.current) setBusy(false) }
  }

  return <div className="space-y-2">
    <div className="relative aspect-video bg-[#14283d]">
      {/* eslint-disable-next-line @next/next/no-img-element -- private, transient in-memory media */}
      {pictures.share || pictures.video ? <img src={pictures.share ?? pictures.video} alt={pictures.share ? "Live shared presentation" : "Live active speaker"} className="h-full w-full object-contain" /> : <div className="absolute inset-0 grid place-content-center px-3 text-center text-xs text-slate-400">{session ? labels[state] ?? state : "Presentation and active-speaker test"}</div>}
    </div>
    <div className="grid grid-cols-4 gap-1 px-1">
      <div className="relative aspect-[4/3] bg-[#1b2938]">
        {/* eslint-disable-next-line @next/next/no-img-element -- transient JPEG, no image optimizer */}
        {pictures.video ? <img src={pictures.video} alt="Active speaker" className="h-full w-full object-contain" /> : <span className="absolute inset-0 grid place-content-center text-center text-[11px] text-slate-400">Active speaker</span>}
      </div>
      <div className="col-span-3 flex items-center px-2 text-[11px] text-slate-400">Additional live thumbnails require Zoom multi-video enablement.</div>
    </div>
    <div className="space-y-2 px-2 pb-2">
      <button type="button" className={ioButton} disabled={busy || (!session && !configured)} onClick={() => void control(session ? "stop" : "arm")}>{session ? "Stop test" : "Test server return"}</button>
      {appReady && !session ? <form action="/api/admin/zoom-bridge/rtms-connect" method="post"><button type="submit" className={ioButton}>Authorize Zoom app</button></form> : null}
      <p role="status" className="text-xs text-slate-400">{!configured ? "RTMS setup pending" : session ? labels[state] ?? state : "One meeting · 15-minute maximum · visual only"}</p>
      {error ? <p role="alert" className="text-xs text-amber-200">{error}</p> : null}
    </div>
  </div>
}
