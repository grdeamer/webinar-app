"use client"
import { useCallback, useEffect, useState } from "react"
import { Mic, MicOff, Play, Square, Radio, MonitorUp, MonitorOff, Plus } from "lucide-react"
import type { ZoomRoom, ZoomAction } from "@/lib/zoom-bridge/types"
import ZoomSourcePanel from "./ZoomSourcePanel"
import SatelliteCard, { ioButton, ioField, reporting } from "./SatelliteCard"
import SatelliteEditor, { type SatelliteDraft } from "./SatelliteEditor"
export default function ZoomBridgeConsole() {
  const [rooms, setRooms] = useState<ZoomRoom[]>([])
  const [drafts, setDrafts] = useState<SatelliteDraft[]>([])
  const [count, setCount] = useState(2)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loaded, setLoaded] = useState(false)
  const refresh = useCallback(async (signal: AbortSignal) => {
    const response = await fetch("/api/admin/zoom-bridge", { cache: "no-store", signal })
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Unable to load satellites. Check your administrator session.")
    const data = await response.json()
    if (!signal.aborted) { setRooms(data.rooms); setLoaded(true) }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let polling = false
    async function tick() {
      if (polling) return
      polling = true
      try { await refresh(controller.signal) }
      catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Connection unavailable") }
      finally { polling = false }
    }
    void tick(); const timer = setInterval(() => { void tick() }, 3000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [refresh])
  async function mutate(method: string, body: object) {
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch("/api/admin/zoom-bridge", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Your session expired. Sign in again.")
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Request failed")
      setRooms(data.rooms); return true
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Request failed"); return false }
    finally { setBusy(false) }
  }
  function edit(room: ZoomRoom) {
    if (drafts.some(d => d.id === room.id)) return
    setDrafts(d => [...d, { key: room.id, id: room.id, name: room.name, meetingId: room.meetingId, passcode: "", publishMode: room.publishMode }])
  }
  function addProfiles() {
    const extra = Math.max(0, count - rooms.length - drafts.filter(d => !d.id).length)
    setDrafts(d => [...d, ...Array.from({ length: extra }, (_, i): SatelliteDraft => ({ key: crypto.randomUUID(), name: `Jupiter Satellite ${String(rooms.length + d.filter(x => !x.id).length + i + 1).padStart(2, "0")}`, meetingId: "", passcode: "", publishMode: "share" }))])
    if (!extra) setMessage("That many satellites are already set up. Disconnect and remove satellites individually to reduce the number.")
  }
  async function command(id: string, action: ZoomAction) {
    if (await mutate("POST", { id, action })) setMessage("Command sent. Reported state updates when the satellite responds.")
  }
  async function save(draft: SatelliteDraft) {
    if (await mutate("PUT", draft)) { setDrafts(d => d.filter(x => x.key !== draft.key)); setMessage("Satellite saved.") }
  }
  const joined = rooms.filter(r => reporting(r) && r.observed.status === "joined").length
  return <div className="mx-auto max-w-[1450px] space-y-6 text-white">
    <header className="relative overflow-hidden rounded-[28px] border border-blue-300/15 bg-[radial-gradient(ellipse_at_top_right,rgba(75,88,230,.25),transparent_60%)] p-8">
      <div className="text-[11px] font-semibold uppercase tracking-[.25em] text-blue-200/60">Cloud Broadcast Infrastructure</div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-semibold tracking-tight">Jupiter Io</h1><p className="mt-3 max-w-2xl text-white/55">One program. Every room. Manage your source and send picture and audio to your satellites.</p></div><div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-3"><Radio className="mb-2 text-blue-300" size={20} /><span className="text-xl font-semibold">{joined}</span><span className="ml-2 text-sm text-white/45">connected / {rooms.length} satellites</span></div></div>
    </header>
    <ZoomSourcePanel />
    <section className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Satellite fleet</h2><p className="mt-1 text-xs text-white/45">Current test server: 2 simultaneous satellites. Up to 21 destination profiles.</p></div><div className="flex items-end gap-3"><label className="text-xs text-white/65">Number of satellites<select value={count} onChange={e => setCount(Number(e.target.value))} className={`${ioField} w-28`}>{Array.from({ length: 21 }, (_, i) => <option key={i + 1} value={i + 1} className="bg-slate-950">{i + 1}</option>)}</select></label><button type="button" className={ioButton} disabled={busy || !loaded} onClick={addProfiles}><Plus size={16} />Set up</button></div></div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <button type="button" className={ioButton} disabled={busy || !rooms.length} onClick={() => { void command("all", "start") }}><Play size={16} />Connect all</button>
        <button type="button" className={ioButton} disabled={busy || !rooms.length} onClick={() => { void command("all", "stop") }}><Square size={16} />Disconnect all</button>
        {([['camera_on', 'Picture on', MonitorUp], ['camera_off', 'Picture off', MonitorOff], ['microphone_on', 'Unmute all', Mic], ['microphone_off', 'Mute all', MicOff]] as const).map(([action, label, Icon]) => <button type="button" key={action} className={ioButton} disabled={busy || !rooms.length} onClick={() => { void command("all", action) }}><Icon size={16} />{label}</button>)}
      </div><p className="mt-3 text-xs text-white/35">Picture controls each satellite’s selected output: camera or screen share. Audio controls the program microphone.</p>
    </section>
    {error ? <p role="alert" className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">{error}</p> : null}
    {message ? <p role="status" className="text-sm text-blue-200">{message}</p> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rooms.map(room => <SatelliteCard key={room.id} room={room} busy={busy} command={(id, action) => { void command(id, action) }} edit={edit} remove={r => { void mutate("DELETE", { id: r.id }) }} />)}</div>
    {!rooms.length && loaded && !drafts.length ? <p className="py-6 text-center text-white/45">Choose your satellite count above to create your first destinations.</p> : null}
    {drafts.map(draft => <SatelliteEditor key={draft.key} draft={draft} running={rooms.find(r => r.id === draft.id)?.running ?? false} busy={busy} change={changed => setDrafts(d => d.map(x => x.key === changed.key ? changed : x))} save={() => { void save(draft) }} cancel={() => setDrafts(d => d.filter(x => x.key !== draft.key))} />)}
    <p className="text-xs leading-5 text-white/35">New satellites start with picture and audio off. Saved controls are retained on reconnect. Destination host permissions apply. Submitted resolution describes the feed sent to Zoom; viewer quality may vary.</p>
  </div>
}
