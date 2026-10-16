"use client"
import { useCallback, useEffect, useState } from "react"
import "./jupiter-io.css"
import { Mic, MicOff, Play, Square, MonitorUp, MonitorOff, Plus } from "lucide-react"
import type { ZoomRoom, ZoomAction } from "@/lib/zoom-bridge/types"
import { newSatelliteNames } from "@/lib/zoom-bridge/new-satellites"
import { orderRooms } from "@/lib/zoom-bridge/room-order"
import ZoomSourcePanel from "./ZoomSourcePanel"
import SatelliteCard, { ioButton, ioField, reporting } from "./SatelliteCard"
import SatelliteDetail from "./SatelliteDetail"
import SatelliteEditor, { type SatelliteDraft } from "./SatelliteEditor"
import SatelliteMatrix from "./SatelliteMatrix"
import SatelliteMultiview from "./SatelliteMultiview"
import IoGuideDialog from "./IoGuideDialog"
import IoSetupHelp from "./IoSetupHelp"
import SatelliteEditDialog from "./SatelliteEditDialog"
export default function ZoomBridgeConsole() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [rooms, setRooms] = useState<ZoomRoom[]>([])
  const [drafts, setDrafts] = useState<SatelliteDraft[]>([])
  const [addCount, setAddCount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loaded, setLoaded] = useState(false)
  const refresh = useCallback(async (signal: AbortSignal) => {
    const response = await fetch("/api/admin/zoom-bridge", { cache: "no-store", signal })
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Unable to load satellites. Check your administrator session.")
    const data = await response.json()
    if (!signal.aborted) {
      const nextRooms: ZoomRoom[] = orderRooms(data.rooms as ZoomRoom[])
      setRooms(nextRooms)
      setSelectedId(current => nextRooms.some(room => room.id === current) ? current : nextRooms[0]?.id ?? null)
      setLoaded(true)
    }
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
      setRooms(orderRooms(data.rooms as ZoomRoom[])); return true
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Request failed"); return false }
    finally { setBusy(false) }
  }
  function edit(room: ZoomRoom) {
    setError("")
    setMessage("")
    setEditingId(room.id)
  }
  const remainingSlots = Math.max(0, 50 - rooms.length - drafts.filter(draft => !draft.id).length)
  const quantityToAdd = Math.min(addCount, remainingSlots)
  function addProfiles() {
    setDrafts(current => {
      const existing = [...rooms.map(room => room.name), ...current.filter(draft => !draft.id).map(draft => draft.name)]
      return [...current, ...newSatelliteNames(existing, quantityToAdd).map(name => ({ key: crypto.randomUUID(), name, meetingId: "", passcode: "", publishMode: "share" as const }))]
    })
  }
  async function command(id: string, action: ZoomAction) {
    if (await mutate("POST", { id, action })) setMessage("Command sent. Reported state updates when the satellite responds.")
  }
  async function save(draft: SatelliteDraft) {
    if (await mutate("PUT", draft)) { setDrafts(d => d.filter(x => x.key !== draft.key)); setMessage("Satellite saved.") }
  }
  const joined = rooms.filter(r => reporting(r) && r.observed.status === "joined").length
  const selected = rooms.find(r => r.id === selectedId) || rooms.find(r => reporting(r) && r.observed.status === "joined") || rooms[0]
  const editing = rooms.find(room => room.id === editingId)
  return <div className="io-console space-y-3 text-white">
    <header className="io-header flex flex-wrap items-center justify-between gap-4 px-3 py-2">
      <div><h1 className="text-4xl font-semibold tracking-tight">Jupiter Io</h1><p className="mt-2 text-lg tracking-wide text-slate-300">Route your program feed to multiple Zoom rooms.</p></div>
      <div className="flex flex-wrap items-center gap-3"><IoGuideDialog /><div className="flex items-center gap-2 rounded-full border border-slate-500/30 bg-[#07111b]/80 px-4 py-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${joined ? "bg-emerald-400" : "bg-slate-500"}`} />{joined} satellite{joined === 1 ? "" : "s"} connected</div></div>
    </header>
    <div className="io-workspace-grid">
    <div className="io-source-column"><IoSetupHelp /><ZoomSourcePanel /></div>
    <div className="io-destination-column">
    <section data-io-tour="fleet" className="io-panel io-fleet p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Satellites</h2><p className="mt-1 text-xs text-white/45">Up to 50 satellite profiles</p></div><div className="flex items-end gap-3"><label className="text-xs text-white/65">Quantity to add<select aria-label="Quantity to add" disabled={busy || !loaded || !remainingSlots} value={quantityToAdd || 1} onChange={e => setAddCount(Number(e.target.value))} className={`${ioField} w-28`}>{Array.from({ length: Math.max(1, remainingSlots) }, (_, i) => <option key={i + 1} value={i + 1} className="bg-slate-950">{i + 1}</option>)}</select></label><button type="button" className={ioButton} disabled={busy || !loaded || !remainingSlots} onClick={addProfiles}><Plus size={16} />{quantityToAdd > 1 ? `Add ${quantityToAdd} satellites` : "Add satellite"}</button></div></div>
      <div className="io-master flex flex-wrap gap-2">
        <SatelliteMultiview rooms={rooms} />
        <SatelliteMatrix rooms={rooms} selectedId={selected?.id} select={setSelectedId} busy={busy} command={command}/>
        {([['camera_on', 'Picture on', MonitorUp], ['microphone_off', 'Mute all', MicOff], ['original_sound_on', 'Original Sound on all', Mic]] as const).map(([action, label, Icon]) => <button type="button" key={action} className={ioButton} disabled={busy || !rooms.length} onClick={() => { void command("all", action) }}><Icon size={16} />{label}</button>)}
        <details className="relative"><summary className={`${ioButton} cursor-pointer`}>More controls</summary><div className="absolute right-0 top-full z-20 mt-2 flex w-56 flex-col gap-2 rounded-lg border border-slate-600 bg-[#081321] p-3">
          {([['start', 'Connect all', Play], ['stop', 'Disconnect all', Square], ['camera_off', 'Picture off', MonitorOff], ['microphone_on', 'Unmute all', Mic], ['original_sound_off', 'Original Sound off all', MicOff]] as const).map(([action, label, Icon]) => <button type="button" key={action} className={ioButton} disabled={busy || !rooms.length} onClick={() => { void command("all", action) }}><Icon size={16} />{label}</button>)}
        </div></details>
      </div>
      {!remainingSlots ? <p className="col-span-full mt-3 text-xs text-white/60">All 50 satellite slots are in use, including unsaved profiles.</p> : null}
      <div className="io-fleet-grid mt-4">{rooms.map(room => <SatelliteCard compact selected={selected?.id === room.id} open={() => setSelectedId(room.id)} key={room.id} room={room} busy={busy} command={(id, action) => { void command(id, action) }} edit={edit} remove={r => { void mutate("DELETE", { id: r.id }) }} />)}</div>
    </section>
    {error ? <p role="alert" className="rounded-xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-200">{error}</p> : null}
    {message ? <p role="status" className="text-sm text-blue-200">{message}</p> : null}
    <div className="io-selected-satellite">{selected ? <SatelliteDetail inline room={selected} busy={busy} close={() => setSelectedId(null)} command={(id, action) => { void command(id, action) }} edit={edit} remove={async room => { if (await mutate("DELETE", { id: room.id })) setSelectedId(null) }} /> : null}</div>
    {editing ? <SatelliteEditDialog key={editing.id} room={editing} busy={busy} errorMessage={error} close={() => setEditingId(null)} save={async draft => { const saved = await mutate("PUT", draft); if (saved) setMessage("Satellite saved."); return saved }} /> : null}
    {!rooms.length && loaded && !drafts.length ? <p className="py-6 text-center text-white/45">Click Add satellite to create your first destination. Use Quantity to add for several.</p> : null}
    {drafts.map(draft => <SatelliteEditor key={draft.key} draft={draft} running={rooms.find(r => r.id === draft.id)?.running ?? false} busy={busy} change={changed => setDrafts(d => d.map(x => x.key === changed.key ? changed : x))} save={() => { void save(draft) }} cancel={() => setDrafts(d => d.filter(x => x.key !== draft.key))} />)}
    </div></div>
    <p className="text-xs leading-5 text-white/35">New satellites start with picture and audio off. Saved controls are retained on reconnect. Destination host permissions apply. Submitted resolution describes the feed sent to Zoom; viewer quality may vary.</p>
  </div>
}
