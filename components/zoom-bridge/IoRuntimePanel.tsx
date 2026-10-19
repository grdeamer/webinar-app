"use client"
import { useCallback, useEffect, useState } from "react"
import { Power, Server, Square } from "lucide-react"
import { ioButton, ioField } from "./SatelliteCard"
type Status = { configured: boolean; state?: string; stopAt?: string | null; capacity?: number; hourlyComputeUsd?: number }
export default function IoRuntimePanel() {
  const [status, setStatus] = useState<Status | null>(null)
  const [minutes, setMinutes] = useState(120)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [confirmStop, setConfirmStop] = useState(false)
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/zoom-bridge/runtime", { cache: "no-store", signal })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || "Server status unavailable.")
    setStatus(data)
  }, [])
  useEffect(() => {
    const abort = new AbortController()
    let polling = false
    async function tick() {
      if (polling) return
      polling = true
      try { await refresh(abort.signal) }
      catch { if (!abort.signal.aborted) setError("Server status unavailable. Refresh before starting a broadcast.") }
      finally { polling = false }
    }
    void tick(); const timer = setInterval(() => { void tick() }, 15000)
    return () => { abort.abort(); clearInterval(timer) }
  }, [refresh])
  async function act(action: "start" | "stop") {
    setBusy(true); setError("")
    try {
      const response = await fetch("/api/admin/zoom-bridge/runtime", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, minutes, confirm: action === "stop" }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Server action unconfirmed.")
      setStatus(data); setConfirmStop(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Server action unconfirmed.") }
    finally { setBusy(false) }
  }
  if (status?.configured === false) return null
  const active = status?.state === "running" || status?.state === "pending"
  return <section data-io-tour="runtime" className="io-panel p-5" aria-label="Broadcast server">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Server size={18} className="text-blue-300" />Broadcast server</h2><p className="mt-1 text-sm text-slate-300" role="status">{status?.state === "running" ? "Online" : status?.state === "pending" ? "Starting — allow a few minutes" : status?.state === "stopped" ? "Offline · compute charges stopped" : status?.state === "stopping" ? "Stopping" : "Checking status…"}</p></div>
      {!active ? <div className="flex flex-wrap items-end gap-3"><label className="text-xs text-slate-300">Automatic stop<select className={`${ioField} w-32`} value={minutes} onChange={event => setMinutes(Number(event.target.value))} disabled={busy}>{[60,120,240,480].map(value => <option key={value} value={value}>{value / 60} hour{value === 60 ? "" : "s"}</option>)}</select></label><button type="button" className={ioButton} disabled={busy || status?.state !== "stopped"} onClick={() => { void act("start") }}><Power size={16} />Start server</button></div> : <button type="button" className={ioButton} disabled={busy} onClick={() => setConfirmStop(true)}><Square size={16} />Stop server</button>}
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-400">Ten-room capacity target · Full HD delivery remains subject to load testing and Zoom negotiation. Compute is approximately $1.43 per running hour; bandwidth, retained storage and IP charges are additional. Start before rehearsals, then connect the source and satellites. An unused server stops after 15 minutes without an active feed or satellite.</p>
    {active && status?.stopAt ? <p className="mt-2 text-sm text-blue-200">Automatic stop: {new Date(status.stopAt).toLocaleString()}. All feeds end at that time.</p> : null}
    {confirmStop ? <div className="mt-4 rounded-lg border border-amber-300/30 p-4"><p className="text-sm">Stop the server and end every source and satellite connection?</p><div className="mt-3 flex gap-2"><button type="button" className={ioButton} disabled={busy} onClick={() => { void act("stop") }}>Stop all feeds and server</button><button type="button" className={ioButton} disabled={busy} onClick={() => setConfirmStop(false)}>Cancel</button></div></div> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-200">{error}</p> : null}
  </section>
}
