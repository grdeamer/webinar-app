"use client"

import { useEffect, useRef, useState } from "react"
import { meetingJoinLink } from "@/lib/zoom-bridge/meeting-link"
import { ioButton, ioField } from "./SatelliteCard"

const endpoint = "/api/admin/zoom-bridge/meeting-return"
const labels: Record<string, string> = {
  blocked_by_zoom: "Zoom rejected automated access. An approved Zoom app authorization is required.",
  starting: "Starting server receiver…", joining: "Joining Zoom…", connected: "Connected · live Zoom return",
  waiting_room: "Waiting for the host to admit Jupiter Monitor", waiting_for_host: "Waiting for the host to start the meeting",
  needs_consent: "Zoom requires your authorization to accept its terms before joining.",
  needs_attention: "Zoom requires sign-in, verification or acceptance. The monitor has paused joining.",
  expired: "Monitor expired", ended: "Meeting ended", failed: "Receiver failed", stopped: "Monitor stopped",
}
export default function ServerMeetingMonitor({ configured }: { configured: boolean }) {
  const [input, setInput] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [joinLink, setJoinLink] = useState("")
  const [session, setSession] = useState<string | null>(null)
  const [state, setState] = useState("stopped")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [picture, setPicture] = useState<string | null>(null)
  const [remaining, setRemaining] = useState(0)
  const sessionRef = useRef<string | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (sessionRef.current) void fetch(endpoint, { method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop", sessionId: sessionRef.current }) }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!session) return
    const abort = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let currentUrl: string | null = null
    async function poll() {
      try {
        const response = await fetch(`${endpoint}?sessionId=${session}`, { cache: "no-store", signal: abort.signal })
        if (abort.signal.aborted) return
        if (response.headers.get("content-type")?.startsWith("image/jpeg")) {
          const blob = await response.blob()
          if (abort.signal.aborted) return
          const next = URL.createObjectURL(blob), previous = currentUrl
          currentUrl = next
          setPicture(next); setState(response.headers.get("x-return-state") ?? "joining")
          setRemaining(Number(response.headers.get("x-return-remaining") ?? 0)); setError("")
          if (previous) URL.revokeObjectURL(previous)
        } else {
          const result = await response.json()
          if (abort.signal.aborted) return
          setPicture(null)
          if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null }
          setState(result.state ?? "failed"); setRemaining(result.remainingSeconds ?? 0)
          setError(result.error ?? "")
          if (["stopped", "expired", "ended", "failed"].includes(result.state)) return
        }
      } catch {
        if (abort.signal.aborted) return
        setPicture(null); setError("Return connection lost. Check the server before starting another session.")
      }
      if (!abort.signal.aborted) timer = setTimeout(() => void poll(), 1000)
    }
    void poll()
    return () => { abort.abort(); clearTimeout(timer); if (currentUrl) URL.revokeObjectURL(currentUrl) }
  }, [session])

  async function start() {
    setError("")
    let link: string
    try { link = meetingJoinLink(input) } catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid Zoom link"); return }
    const identity = crypto.randomUUID()
    sessionRef.current = identity
    setBusy(true)
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", sessionId: identity, joinUrl: link, termsAccepted }) })
      const result = await response.json()
      if (!response.ok || result.error) throw new Error(result.error ?? "Receiver could not start")
      if (mounted.current) { setJoinLink(link); setState(result.state); setSession(identity) }
      else void fetch(endpoint, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop", sessionId: identity }) }).catch(() => {})
    } catch (cause) {
      // Keep the identity available for Stop if a start response was lost.
      if (mounted.current) { setSession(identity); setError(cause instanceof Error ? cause.message : "Monitor start was not confirmed") }
    } finally { if (mounted.current) setBusy(false) }
  }

  async function stop() {
    if (!sessionRef.current) return
    setBusy(true)
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop", sessionId: sessionRef.current }) })
      if (!response.ok) throw new Error("Stop was not confirmed. The receiver lease will expire automatically.")
      sessionRef.current = null; setSession(null); setPicture(null); setState("stopped"); setError("")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Stop failed") }
    finally { setBusy(false) }
  }

  return <section className="space-y-4">
    <p className="text-sm text-white/70">Jupiter Monitor joins on the server. No local Zoom window is needed. First test: one meeting, visual return only.</p>
    {!configured ? <p role="status" className="rounded-xl border border-amber-300/30 p-4 text-sm text-amber-200">Server monitoring is paused. Receiver setup and Zoom-authorized access must be verified before joining.</p> : null}
    <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void start() }}>
      <label className="min-w-0 flex-1 text-sm text-white/70">Zoom meeting link<input className={ioField} value={input} disabled={busy || Boolean(session)} autoComplete="off" maxLength={2048} onChange={e => { setInput(e.target.value); setTermsAccepted(false) }} /></label>
      <button className={ioButton} disabled={!configured || busy || Boolean(session) || !termsAccepted} type="submit">Join & monitor</button>
      {session ? <button className={ioButton} type="button" disabled={busy} onClick={() => void stop()}>Stop monitor</button> : null}
    </form>
    <label className="flex items-start gap-2 text-sm text-white/70"><input type="checkbox" checked={termsAccepted} disabled={busy || Boolean(session)} onChange={e => setTermsAccepted(e.target.checked)} className="mt-1" />I authorize Jupiter Monitor to accept Zoom’s Terms of Service and Privacy Statement and join this meeting.</label>
    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/15 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element -- transient in-memory JPEG return, never an optimized/persisted asset */}
      {picture ? <img src={picture} alt="Received Zoom meeting view from the server" className="h-full w-full object-contain" /> : <div className="absolute inset-0 grid place-content-center px-6 text-center text-sm text-white/50">{session ? labels[state] ?? "Waiting for server return" : "Join a meeting to see its server return"}</div>}
      {joinLink && session ? <a href={joinLink} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label="Open monitored meeting in Zoom" className="absolute inset-0 flex items-end justify-end p-4 focus-visible:outline-2 focus-visible:outline-blue-300"><span className="rounded bg-black/80 px-3 py-2 text-sm">Open in Zoom ↗</span></a> : null}
    </div>
    <p role="status" className="text-sm text-white/70">{labels[state] ?? state}{session && remaining > 0 ? ` · ${Math.ceil(remaining / 60)} min remaining` : ""}</p>
    {error ? <p role="alert" className="text-sm text-amber-200">{error}</p> : null}
    <p className="text-xs leading-5 text-white/50">Camera, microphone and recording are off. The receiver leaves after 15 minutes or when this page stops requesting previews for 30 seconds. Waiting rooms and host admission apply. Sign-in, verification and explicit terms acceptance require attention. Server audio monitoring is not included in this first test.</p>
  </section>
}
