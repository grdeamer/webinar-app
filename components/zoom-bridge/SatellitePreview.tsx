"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import { Eye, EyeOff, Radio } from "lucide-react"
import type { ZoomRoom } from "@/lib/zoom-bridge/types"
import { ioButton, reporting } from "./SatelliteCard"
export default function SatellitePreview({ room, autoWatch = false }: { room: ZoomRoom; autoWatch?: boolean }) {
  const [watch, setWatch] = useState(autoWatch)
  const [frame, setFrame] = useState<{ jpeg: string; sentAt: number } | null>(null)
  const [notice, setNotice] = useState("Connecting preview…")
  const [now, setNow] = useState(Date.now())
  const sending = reporting(room) && room.observed.status === "joined" && room.observed.camera === true
  useEffect(() => {
    if (!watch || !sending) return
    const abort = new AbortController()
    let events: EventSource | null = null, renewing = false
    async function lease() {
      if (renewing) return false
      renewing = true
      try {
        const response = await fetch(`/api/admin/zoom-bridge/preview?id=${room.id}`, { method: "POST", signal: abort.signal })
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Preview unavailable. Check your administrator session.")
        return true
      } catch (error) { if (!abort.signal.aborted) setNotice(error instanceof Error ? error.message : "Preview unavailable"); return false }
      finally { renewing = false }
    }
    void lease().then(ok => {
      if (!ok || abort.signal.aborted) return
      events = new EventSource(`/api/admin/zoom-bridge/preview?id=${room.id}`)
      events.addEventListener("ready", () => setNotice("Waiting for the satellite’s next frame…"))
      events.addEventListener("unavailable", () => setNotice("Preview transport unavailable. Retrying…"))
      events.addEventListener("frame", event => {
        try {
          const next = JSON.parse((event as MessageEvent).data)
          if (typeof next.jpeg === "string" && next.jpeg.length < 240000 && /^[A-Za-z0-9+/=]+$/.test(next.jpeg) && Number.isFinite(next.sentAt)) { setFrame(next); setNotice("Preview interrupted. Waiting for fresh frames…") }
        } catch { setNotice("Invalid preview frame") }
      })
      events.onerror = () => setNotice("Preview reconnecting…")
    })
    const renewal = setInterval(() => { void lease() }, 20000)
    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => { abort.abort(); events?.close(); clearInterval(renewal); clearInterval(clock) }
  }, [room.id, watch, sending])
  const live = sending && watch && frame && now - frame.sentAt < 7000
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
    <div className="flex items-center justify-between gap-3 p-4"><h3 className="font-semibold">Live program send</h3><button type="button" className={ioButton} onClick={() => { setWatch(!watch); setFrame(null); setNow(Date.now()) }}>{watch ? <EyeOff size={16} /> : <Eye size={16} />}{watch ? "Hide preview" : "View live program"}</button></div>
    <div className="relative flex aspect-video items-center justify-center bg-black">
      {live ? <Image unoptimized src={`data:image/jpeg;base64,${frame.jpeg}`} alt={`Outgoing program submitted by ${room.name}`} fill sizes="(max-width: 1024px) 100vw, 640px" className="object-contain" /> : <div className="px-6 text-center text-sm text-white/45"><Radio className="mx-auto mb-3 text-blue-300/50" size={28} />{!watch ? "Open a live confidence preview of this satellite’s outgoing picture." : !sending ? "This satellite is not sending picture." : notice}</div>}
      {live ? <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Live · outgoing feed</span> : null}
    </div>
    <p className="p-4 text-xs leading-5 text-white/40">Live picture confidence monitor · approximately one update every 2 seconds. Preview audio is silent; the satellite’s audio state is shown alongside. Frames are relayed in memory and are not saved. Zoom’s received quality and delay may differ.</p>
  </section>
}
