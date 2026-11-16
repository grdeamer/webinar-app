"use client"

import { useEffect, useRef, useState } from "react"
import type { ZoomRoom } from "@/lib/zoom-bridge/types"
import { meetingJoinLink } from "@/lib/zoom-bridge/meeting-link"
import { ioButton } from "./SatelliteCard"

function ReturnTile({ room, index, listening, onListen }: {
  room?: ZoomRoom; index: number; listening: boolean; onListen: () => void
}) {
  const [name, setName] = useState(room?.name ?? `Meeting ${index + 1}`)
  const [input, setInput] = useState(room?.meetingId ?? "")
  const [link, setLink] = useState(room ? meetingJoinLink(room.meetingId) : "")
  const [live, setLive] = useState(false)
  const [pending, setPending] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const [error, setError] = useState("")
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const mounted = useRef(false)
  const request = useRef(0)

  function stop() {
    request.current += 1
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setLive(false)
    setHasAudio(false)
    setPending(false)
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      request.current += 1
      stream.current?.getTracks().forEach(track => track.stop())
      stream.current = null
    }
  }, [])

  async function capture() {
    setError("")
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Window capture needs a supported desktop browser on HTTPS or localhost.")
      return
    }
    const token = ++request.current
    setPending(true)
    try {
      const next = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 10, max: 15 } }, audio: true,
      })
      if (!mounted.current || token !== request.current) {
        next.getTracks().forEach(track => track.stop())
        return
      }
      stream.current?.getTracks().forEach(track => track.stop())
      stream.current = next
      const picture = next.getVideoTracks()[0]
      if (!picture) { stop(); setError("The selected source has no video."); return }
      picture.addEventListener("ended", () => {
        if (mounted.current && stream.current === next) stop()
      }, { once: true })
      if (video.current) {
        video.current.srcObject = next
        void video.current.play().catch(() => {
          if (mounted.current) setError("Playback was blocked. Try selecting the window again.")
        })
      }
      setHasAudio(next.getAudioTracks().length > 0)
      setLive(true)
    } catch (cause) {
      if (mounted.current && token === request.current) {
        setError(cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Window selection was cancelled or permission was denied. You can try again."
          : "Could not capture this window. Check browser and screen capture permissions.")
      }
    } finally {
      if (mounted.current && token === request.current) setPending(false)
    }
  }

  useEffect(() => {
    if (video.current) video.current.muted = !listening || !hasAudio
  }, [listening, hasAudio, live])

  return <section className="overflow-hidden rounded-xl border border-white/15 bg-black/30">
    <div className="space-y-2 p-3">
      <label className="block text-xs text-white/70">Room name
        <input className="mt-1 w-full rounded border border-white/20 bg-black/30 p-2 text-sm text-white" value={name} maxLength={100} onChange={e => setName(e.target.value)} />
      </label>
      <form className="flex flex-wrap gap-2" onSubmit={e => {
        e.preventDefault()
        try { setLink(meetingJoinLink(input)); setError("") } catch (cause) {
          setLink(""); setError(cause instanceof Error ? cause.message : "Invalid meeting link.")
        }
      }}>
        <label className="min-w-0 flex-1 text-xs text-white/70">Zoom join link or meeting ID
          <input className="mt-1 w-full rounded border border-white/20 bg-black/30 p-2 text-sm text-white" value={input} maxLength={2048} autoComplete="off" onChange={e => { setInput(e.target.value); setLink("") }} />
        </label>
        <button type="submit" className={ioButton}>Set link</button>
      </form>
    </div>
    <div className="relative aspect-video bg-black">
      <video ref={video} autoPlay playsInline muted={!listening || !hasAudio} className="h-full w-full object-contain" aria-label={`${name} Zoom window return`} />
      {!live ? <div className="pointer-events-none absolute inset-0 grid place-content-center px-5 text-center text-sm text-white/50">Select this meeting’s Zoom window to see its actual return.</div> : null}
      {link ? <a href={link} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="absolute inset-0 flex items-end justify-end p-3 focus-visible:outline-2 focus-visible:outline-blue-300" aria-label={`Open ${name} in Zoom`}><span className="rounded bg-black/80 px-3 py-2 text-xs text-white">Open in Zoom ↗</span></a> : null}
    </div>
    <div className="flex flex-wrap items-center gap-2 p-3">
      <span role="status" className="mr-auto text-xs text-white/60">{live ? "● Local window return" : "No return connected"}</span>
      <button className={ioButton} disabled={pending} onClick={() => void capture()}>{pending ? "Choosing…" : live ? "Change window" : "Select Zoom window"}</button>
      {live ? <><button className={ioButton} disabled={!hasAudio} aria-pressed={listening && hasAudio} onClick={onListen}>{listening && hasAudio ? "Mute" : "Listen"}</button><button className={ioButton} onClick={stop}>Stop</button></> : null}
    </div>
    {live && !hasAudio ? <p className="px-3 pb-3 text-xs text-white/50">This capture has no audio track. Window audio depends on your browser and operating system.</p> : null}
    {error ? <p role="alert" className="px-3 pb-3 text-sm text-amber-300">{error}</p> : null}
  </section>
}

export default function MeetingReturnMonitor({ rooms }: { rooms: ZoomRoom[] }) {
  const [listening, setListening] = useState<number | null>(null)
  // Snapshot initial profiles; monitoring is independent of sender status and polling updates.
  const [initial] = useState(() => rooms.slice(0, 2))
  return <div className="space-y-4">
    <p className="text-sm text-white/70">Local two-room prototype. Open both meetings on this computer, then select each Zoom window below. Click a preview to open its saved meeting link in Zoom’s normal join flow.</p>
    <div className="grid gap-4 md:grid-cols-2">{[0, 1].map(index => <ReturnTile key={index} index={index} room={initial[index]} listening={listening === index} onListen={() => setListening(value => value === index ? null : index)} />)}</div>
    <p className="text-xs leading-5 text-white/50">No sender worker is required. Windows must remain open on this computer; minimized or hidden windows may stop updating. Capture stays local in this browser and stops when this view closes. No recording or upload. Meeting links are held only for this session; passcodes may be requested by Zoom. This is not unattended server monitoring.</p>
  </div>
}
