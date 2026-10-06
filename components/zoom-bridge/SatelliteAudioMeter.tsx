"use client"
import { useEffect, useState } from "react"
import type { ZoomRoom } from "@/lib/zoom-bridge/types"
import { meterDb, validAudioMeter } from "@/lib/zoom-bridge/audio-meter"
import { reporting } from "./SatelliteCard"
type Level = { peak: number; rms: number; muted: boolean; sentAt: number }
export default function SatelliteAudioMeter({ room }: { room: ZoomRoom }) {
  const [level, setLevel] = useState<Level | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const joined = reporting(room) && room.observed.status === "joined"
  useEffect(() => {
    if (!joined) return
    const abort = new AbortController()
    let events: EventSource | null = null
    async function lease() {
      try { return (await fetch(`/api/admin/zoom-bridge/preview?id=${room.id}`, { method: "POST", signal: abort.signal })).ok }
      catch { return false }
    }
    void lease().then(ok => {
      if (!ok || abort.signal.aborted) return
      events = new EventSource(`/api/admin/zoom-bridge/preview?id=${room.id}`)
      events.addEventListener("audio", event => {
        try { const next: unknown = JSON.parse((event as MessageEvent).data); if (validAudioMeter(next)) { setLevel(next); setNow(Date.now()) } } catch { /* Ignore malformed telemetry. */ }
      })
    })
    const renew = setInterval(() => { void lease() }, 20000)
    const clock = setInterval(() => setNow(Date.now()), 500)
    return () => { abort.abort(); events?.close(); clearInterval(renew); clearInterval(clock) }
  }, [room.id, joined])
  const fresh = joined && level && now - level.sentAt >= -1000 && now - level.sentAt < 4000
  const muted = fresh ? level.muted : !room.observed.microphone
  const peak = fresh ? meterDb(level.peak) : -60
  const rms = fresh ? meterDb(level.rms) : -60
  return <section className="rounded-2xl border border-white/10 bg-black/20 p-4" aria-label="Live program audio meter">
    <div className="flex items-center justify-between text-sm"><h3 className="font-semibold">Program audio</h3><span className={muted ? "text-white/40" : "text-emerald-200"}>{joined ? muted ? "Muted" : "Unmuted" : "Disconnected"}</span></div>
    <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3">
      <div><div className="relative flex h-5 gap-[3px]" role="meter" aria-label="Program input peak" aria-valuemin={-60} aria-valuemax={0} aria-valuenow={peak} aria-valuetext={fresh ? `${peak.toFixed(1)} dBFS input${muted ? ', output muted' : ''}` : "Waiting for signal"}>
        {Array.from({ length: 30 }, (_, i) => { const db = -60 + (i + 1) * 2; const lit = db <= peak; return <span key={i} className="flex-1 rounded-[2px] transition-colors duration-150" style={{ backgroundColor: !lit ? "rgba(255,255,255,.07)" : muted ? "#8b929f" : db >= -6 ? "#f87171" : db >= -18 ? "#facc15" : "#34d399" }} /> })}
        {fresh && rms > -60 ? <span className={`absolute -bottom-1 h-7 w-[2px] ${muted ? "bg-white/50" : "bg-white"}`} style={{ left: `${(rms + 60) / 60 * 100}%` }} title="RMS level" /> : null}
      </div><div className="mt-2 flex justify-between font-mono text-[10px] text-white/35">{[-60, -48, -36, -24, -12, 0].map(db => <span key={db}>{db}</span>)}</div></div>
      <span className="w-14 text-right font-mono text-xs text-white/65">{fresh ? peak <= -60 ? "−∞" : peak.toFixed(1) : "—"}<span className="mt-1 block text-[10px] text-white/35">dBFS</span></span>
    </div>
    <p className="mt-3 text-[11px] text-white/40">{fresh ? muted ? "Input is monitored; Zoom output is muted." : "Live input peak · white marker shows RMS." : "Waiting for fresh audio telemetry."} Mono · updates approximately twice per second.</p>
  </section>
}
