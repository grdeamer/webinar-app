"use client"
import { useEffect, useState } from "react"
import { Grid2X2, ArrowLeft, Volume2, VolumeX, Square, Play } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { ZoomRoom } from "@/lib/zoom-bridge/types"
import { monitorPage } from "@/lib/zoom-bridge/multiview"
import { orderRooms } from "@/lib/zoom-bridge/room-order"
import { ioButton, reporting } from "./SatelliteCard"
import OutgoingStream from "./OutgoingStream"
function Monitor({ rooms }: { rooms: ZoomRoom[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [audio, setAudio] = useState(false)
  const [page, setPage] = useState(0)
  const [remaining, setRemaining] = useState(120)
  const [running, setRunning] = useState(true)
  const [session, setSession] = useState(0)
  const ordered = orderRooms(rooms)
  const { pages, page: currentPage, items: visible } = monitorPage(ordered, page)
  const selected = expanded ? ordered.find(room => room.id === expanded) : undefined
  const ids = selected ? [selected.id] : visible.map(room => room.id)
  const cols = Math.min(3, visible.length), rows = Math.ceil(visible.length / Math.max(1, cols))
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    const expiry = setTimeout(() => { setRunning(false); setAudio(false) }, 120000)
    function hide() { if (document.hidden) { setRunning(false); setAudio(false) } }
    document.addEventListener("visibilitychange", hide)
    return () => { clearInterval(timer); clearTimeout(expiry); document.removeEventListener("visibilitychange", hide) }
  }, [running, session])
  return <>
    <div className="flex flex-wrap items-center gap-2">
      {selected ? <button className={ioButton} onClick={() => { setExpanded(null); setAudio(false) }}><ArrowLeft size={16} />Back to grid</button> : <span className="mr-auto text-sm text-white/60">Grid · 640 × 360 per feed · 2 fps · audio muted</span>}
      {selected ? <><span className="mr-auto text-sm">{selected.name} · Outgoing feed · 720p · 10 fps</span><button className={ioButton} aria-pressed={audio} disabled={!running} onClick={() => setAudio(value => !value)}>{audio ? <VolumeX size={16} /> : <Volume2 size={16} />}{audio ? "Mute preview" : "Listen to preview"}</button></> : null}
      <span role="status" className="text-xs tabular-nums text-white/60">{running ? `Expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Preview stopped"}</span>
      <button className={ioButton} onClick={() => { setAudio(false); if (running) setRunning(false); else { setRemaining(120); setSession(value => value + 1); setRunning(true) } }}>{running ? <Square size={14} /> : <Play size={14} />}{running ? "Stop multiview" : "Start multiview"}</button>
    </div>
    <div className="relative overflow-hidden rounded-xl border border-white/15 bg-black" style={{ aspectRatio: selected ? "16 / 9" : `${Math.max(1, cols) * 256} / ${Math.max(1, rows) * 144}` }}>
      {running && ids.length ? <OutgoingStream key={`${session}:${selected?.id ?? `grid-${page}`}`} ids={ids} expanded={Boolean(selected)} audio={Boolean(selected) && audio} /> : <div className="absolute inset-0 grid place-content-center text-sm text-white/50">{ids.length ? "Preview stopped. Start Multiview when needed." : "No satellite profiles yet."}</div>}
      {!selected ? <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, cols)}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.max(1, rows)}, minmax(0, 1fr))` }}>{visible.map(room => {
        const joined = reporting(room) && room.observed.status === "joined"
        return <button key={room.id} className="relative z-20 border border-white/15 text-left outline-offset-[-3px] transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-blue-300" aria-label={`Expand outgoing feed for ${room.name}`} onClick={() => { setExpanded(room.id); setAudio(false) }}>
          <span className="absolute left-2 top-2 z-10 rounded bg-black/80 px-2 py-1 text-xs">{room.name} · Outgoing feed</span>
          {!joined || !room.observed.camera ? <span className="absolute inset-0 grid place-content-center bg-black/85 text-sm text-white/50">{!joined ? room.observed.status || "Disconnected" : "Picture off"}</span> : null}
          <span className="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-1 text-[11px] text-white/70">{joined ? "● Connected" : "○ Not connected"} · {room.observed.videoResolution || "No video"} · {room.observed.microphone ? "Audio on" : "Audio muted"}</span>
        </button>
      })}</div> : <div className="pointer-events-none absolute left-3 top-3 z-20 rounded bg-black/80 px-3 py-1 text-xs">Outgoing feed · {selected.observed.videoResolution || "No video"} · {selected.observed.microphone ? "Audio on" : "Audio muted"}</div>}
      {selected && (!reporting(selected) || selected.observed.status !== "joined" || !selected.observed.camera) ? <div className="pointer-events-none absolute inset-0 z-30 grid place-content-center bg-black/80 text-sm text-white/50">{selected.observed.status !== "joined" ? selected.observed.status || "Disconnected" : "Picture off"}</div> : null}
    </div>
    {!selected && pages > 1 ? <div className="flex items-center justify-center gap-3"><button className={ioButton} disabled={currentPage === 0} onClick={() => { setPage(Math.max(0, currentPage - 1)); setAudio(false) }}>Previous</button><span className="text-xs text-white/60">Page {currentPage + 1} of {pages} · 9 feeds per page</span><button className={ioButton} disabled={currentPage >= pages - 1} onClick={() => { setPage(currentPage + 1); setAudio(false) }}>Next</button></div> : null}
    <p className="text-xs leading-5 text-white/45">Outgoing feed shows frames accepted by each satellite’s Zoom sender, before destination playback. It is not a return feed from the receiving Zoom room. Only the visible page is monitored. Grid audio is off; expanded audio is local and follows the satellite’s outgoing mute state. Stops after two minutes, on close, or when leaving this tab. Temporary memory buffers only; no recording or persistent media storage. Monitoring does not connect satellites or change their picture/audio controls.</p>
  </>
}
export default function SatelliteMultiview({ rooms }: { rooms: ZoomRoom[] }) {
  const [open, setOpen] = useState(false)
  return <><button className={ioButton} onClick={() => setOpen(true)}><Grid2X2 size={16} />Multiview</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[95dvh] overflow-y-auto border-slate-600 bg-[#07111b] text-white sm:max-w-[min(1400px,96vw)]"><DialogTitle>Satellite multiview</DialogTitle><DialogDescription className="text-slate-300">Outgoing feeds at low frame rate. Click a tile for smoother video and optional local audio.</DialogDescription>{open ? <Monitor rooms={rooms} /> : null}</DialogContent></Dialog></>
}
