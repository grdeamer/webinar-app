"use client"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Camera, X, Radio } from "lucide-react"
import type { ZoomRoom } from "@/lib/zoom-bridge/types"
import { ioButton } from "./SatelliteCard"
export default function SatellitePreview({ room }: { room: ZoomRoom }) {
  const [frame, setFrame] = useState<string | null>(null)
  const [captured, setCaptured] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("Request one snapshot of the incoming HDMI program.")
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [room.id])
  useEffect(() => {
    if (!frame) return
    const expiry = setTimeout(() => setFrame(null), 60000)
    return () => { clearTimeout(expiry); URL.revokeObjectURL(frame) }
  }, [frame])
  async function snapshot() {
    request.current?.abort()
    const controller = new AbortController(); request.current = controller
    setBusy(true); setFrame(null)
    try {
      const response = await fetch("/api/admin/zoom-bridge/snapshot", { method: "POST", cache: "no-store", signal: controller.signal })
      if (!response.ok || response.headers.get("content-type") !== "image/jpeg") throw new Error("No fresh program snapshot available. Check source reception.")
      const blob = await response.blob()
      if (blob.size > 1000000) throw new Error("Snapshot too large")
      if (controller.signal.aborted) return
      setFrame(URL.createObjectURL(blob)); setCaptured(new Date().toLocaleTimeString())
    } catch (error) { if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : "Snapshot unavailable") }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
    <div className="flex items-center justify-between gap-3 p-4"><h3 className="font-semibold">Program snapshot</h3><div className="flex gap-2"><button type="button" className={ioButton} disabled={busy} onClick={() => { void snapshot() }}><Camera size={16} />{busy ? "Capturing…" : "Take snapshot"}</button>{frame ? <button type="button" className={ioButton} onClick={() => setFrame(null)} aria-label="Clear snapshot"><X size={16} /></button> : null}</div></div>
    <div className="relative flex aspect-video items-center justify-center bg-black">{frame ? <><Image unoptimized src={frame} alt="On-demand incoming HDMI program snapshot" fill sizes="(max-width: 1024px) 100vw, 640px" className="object-contain" /><span className="absolute left-3 top-3 rounded bg-black/80 px-3 py-1 text-xs">Snapshot · {captured}</span></> : <div className="px-6 text-center text-sm text-white/45"><Radio className="mx-auto mb-3 text-blue-300/50" size={28} />{busy ? "Requesting one fresh frame…" : notice}</div>}</div>
    <p className="p-4 text-xs leading-5 text-white/40">Click-only still image of the program input, not destination Zoom playback. No automatic picture preview. Images bypass Supabase and transit Jupiter’s server without application storage or caching; cleared from this view after 60 seconds. Use receiving Zoom to verify delivery.</p>
  </section>
}
