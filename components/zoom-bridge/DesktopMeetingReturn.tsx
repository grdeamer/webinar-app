"use client"
import { useEffect, useRef, useState } from "react"
import { ioButton } from "./SatelliteCard"

const endpoint = "/api/admin/zoom-bridge/desktop-return"
const active = ["starting", "desktop_ready"]
const labels: Record<string, string> = { starting: "Starting the dedicated Zoom desktop", desktop_ready: "Live server desktop · verify the Zoom meeting view", stopped: "Server monitor stopped", failed: "Server desktop failed", expired: "Server test expired" }

export default function DesktopMeetingReturn({ joinUrl }: { joinUrl?: string }) {
  const [configured, setConfigured] = useState(false)
  const [session, setSession] = useState<string | null>(null)
  const [state, setState] = useState("stopped")
  const [picture, setPicture] = useState<string | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const abort = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function status() {
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: abort.signal })
        const result = await response.json()
        if (abort.signal.aborted) return
        if (!response.ok) throw new Error("Server desktop is not reachable")
        setConfigured(result.configured === true)
        setState(result.state ?? "stopped")
        if (!result.configured) setError("")
        const expectedMeeting = joinUrl ? new URL(joinUrl).pathname.split("/")[2] : null
        if (active.includes(result.state) && expectedMeeting && result.meetingId !== expectedMeeting) {
          setSession(null); setPicture(null); setError("The shared desktop is assigned to another meeting. Use Open shared viewer to inspect it.")
        }
        else if (active.includes(result.state) && result.sessionId) setSession(result.sessionId)
        else { setSession(null); setPicture(null); setRemaining(0) }
      } catch {
        if (!abort.signal.aborted) setError("Server desktop is not reachable. Check the shared server.")
      }
      if (!abort.signal.aborted) timer = setTimeout(() => void status(), 3000)
    }
    void status()
    // Other viewers may still be watching: closing one browser never stops all.
    return () => { mounted.current = false; abort.abort(); clearTimeout(timer) }
  }, [joinUrl])

  useEffect(() => {
    if (!session) return
    const abort = new AbortController()
    let url: string | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    async function frame() {
      try {
        const response = await fetch(`${endpoint}?sessionId=${session}`, { cache: "no-store", signal: abort.signal })
        if (!response.ok) throw new Error("Desktop picture unavailable")
        const jpeg = response.headers.get("content-type")?.startsWith("image/jpeg")
        const blob = jpeg ? await response.blob() : null
        const result = jpeg ? null : await response.json()
        if (abort.signal.aborted) return
        if (url) URL.revokeObjectURL(url)
        url = blob ? URL.createObjectURL(blob) : null
        setPicture(url); setState(result?.state ?? response.headers.get("x-return-state") ?? "desktop_ready")
        setRemaining(result?.remainingSeconds ?? Number(response.headers.get("x-return-remaining") ?? 0))
        setError("")
        if (result && !active.includes(result.state)) { setSession(null); return }
      } catch {
        if (abort.signal.aborted) return
        if (url) URL.revokeObjectURL(url)
        url = null; setPicture(null); setError("Server picture lost. No old image is shown as live.")
      }
      if (!abort.signal.aborted) timer = setTimeout(() => void frame(), 1000)
    }
    void frame()
    return () => { abort.abort(); clearTimeout(timer); if (url) URL.revokeObjectURL(url) }
  }, [session])

  async function control(action: "start" | "stop") {
    const id = action === "start" ? crypto.randomUUID() : session
    if (!id) return
    setBusy(true); setError("")
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, sessionId: id, ...(action === "start" ? { joinUrl } : {}) }) })
      const result = await response.json()
      if (!response.ok || result.error) throw new Error(result.error ?? "Desktop request failed")
      if (mounted.current) { setState(result.state); setSession(action === "start" ? id : null); setPicture(null) }
    } catch {
      if (mounted.current) setError("Desktop request was not confirmed. Check status before retrying.")
    } finally { if (mounted.current) setBusy(false) }
  }

  return <div className="space-y-3 pb-3">
    <div className="relative aspect-video bg-[#14283d]">
      {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral, authenticated server frame */}
      {picture ? <img src={picture} alt="Live Zoom desktop on the Jupiter server" className="h-full w-full object-contain" /> : <div className="absolute inset-0 grid place-content-center px-5 text-center text-sm text-slate-300">{labels[state] ?? state}</div>}
    </div>
    <div className="flex flex-wrap gap-2 px-3">
      {joinUrl && !session ? <button type="button" className={ioButton} disabled={!configured || busy} onClick={() => void control("start")}>Start server desktop</button> : null}
      {session ? <button type="button" className={ioButton} disabled={busy} onClick={() => void control("stop")}>Stop monitor for all viewers</button> : null}
      <a href="/admin/jupiter-io/server-return" target="_blank" rel="noopener noreferrer" className={ioButton}>Open shared viewer</a>
    </div>
    <p role="status" className="px-3 text-sm text-slate-300">{!configured ? "Server desktop setup pending" : labels[state] ?? state}{session && remaining > 0 ? ` · ${Math.ceil(remaining / 60)} min remaining` : ""}</p>
    <p className="px-3 text-sm leading-5 text-slate-400">One dedicated server desktop. The pilot requires an operator to join and verify Zoom through its private console. Other computers can view this page after signing in as a Jupiter administrator. No local Zoom window is captured. Camera devices are unavailable; microphone input is a muted silent source. No captured audio or recording. Hard 15-minute test; expires after 30 seconds without viewers.</p>
    {error ? <p role="alert" className="px-3 text-sm text-amber-200">{error}</p> : null}
  </div>
}
