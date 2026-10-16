"use client"
import { useEffect, useRef, useState } from "react"
import { ioButton } from "./SatelliteCard"
const MIME = 'video/mp4; codecs="avc1.42C01F, mp4a.40.2"'
export default function LiveProgramPreview() {
  const video = useRef<HTMLVideoElement>(null)
  const session = useRef<AbortController | null>(null)
  const [active, setActive] = useState(false)
  const [audio, setAudio] = useState(false)
  const [remaining, setRemaining] = useState(120)
  const [notice, setNotice] = useState("")
  function stop() {
    session.current?.abort(); session.current = null
    if (video.current) { video.current.pause(); video.current.removeAttribute("src"); video.current.load() }
    setActive(false); setAudio(false)
  }
  useEffect(() => () => session.current?.abort(), [])
  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    const expiry = setTimeout(() => { stop(); setNotice("Preview expired. Start again when needed.") }, 120000)
    const hidden = () => { if (document.hidden) stop() }
    document.addEventListener("visibilitychange", hidden)
    return () => { clearInterval(interval); clearTimeout(expiry); document.removeEventListener("visibilitychange", hidden) }
  }, [active])
  async function start() {
    if (!window.MediaSource || !MediaSource.isTypeSupported(MIME)) { setNotice("Live preview is unavailable in this browser. Try current Chrome or Edge."); return }
    stop()
    const abort = new AbortController(); session.current = abort
    setActive(true); setRemaining(120); setNotice("Connecting to incoming program…")
    const media = new MediaSource(); const url = URL.createObjectURL(media)
    try {
      const opened = new Promise<void>((resolve, reject) => {
        media.addEventListener("sourceopen", () => resolve(), { once: true })
        abort.signal.addEventListener("abort", () => reject(new Error("Stopped")), { once: true })
      })
      // Wait for React to mount the video element.
      await new Promise(resolve => requestAnimationFrame(resolve))
      const player = video.current
      if (!player || abort.signal.aborted) return
      player.src = url; player.muted = true
      await opened
      const buffer = media.addSourceBuffer(MIME)
      const response = await fetch("/api/admin/zoom-bridge/live-preview", { method: "POST", cache: "no-store", signal: abort.signal })
      if (!response.ok || !response.body) throw new Error("No live input available. Check source reception.")
      const reader = response.body.getReader()
      async function update(action: () => void) {
        await new Promise<void>((resolve, reject) => {
          const done = () => { clean(); resolve() }
          const failed = () => { clean(); reject(new Error("Preview interrupted")) }
          const clean = () => { buffer.removeEventListener("updateend", done); buffer.removeEventListener("error", failed); abort.signal.removeEventListener("abort", failed) }
          buffer.addEventListener("updateend", done, { once: true }); buffer.addEventListener("error", failed, { once: true }); abort.signal.addEventListener("abort", failed, { once: true })
          try { action() } catch { failed() }
        })
      }
      while (!abort.signal.aborted) {
        const { value, done } = await reader.read()
        if (done) break
        await update(() => buffer.appendBuffer(new Uint8Array(value)))
        if (buffer.buffered.length) {
          const end = buffer.buffered.end(buffer.buffered.length - 1)
          if (end - player.currentTime > 4) player.currentTime = Math.max(0, end - 1.5)
          if (player.currentTime > 8) await update(() => buffer.remove(0, player.currentTime - 5))
          if (player.paused) await player.play()
          setNotice("")
        }
      }
      if (!abort.signal.aborted) setNotice("Preview ended. Start again to reconnect.")
    } catch { if (!abort.signal.aborted) setNotice("Preview unavailable or interrupted. Check input and try again.") }
    finally {
      URL.revokeObjectURL(url)
      if (session.current === abort) stop()
    }
  }
  return <div className="border-b border-white/10 p-4">
    <div className="flex flex-wrap items-center gap-2"><button type="button" className={ioButton} onClick={() => active ? stop() : void start()}>{active ? "Stop preview" : "Live preview"}</button>{active && <><span className="text-xs text-white/60">Expires in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span><button type="button" className={ioButton} aria-pressed={audio} onClick={() => { const next = !audio; setAudio(next); if (video.current) video.current.muted = !next }}>{audio ? "Mute preview audio" : "Listen to preview"}</button></>}</div>
    {active && <video ref={video} autoPlay muted playsInline disablePictureInPicture disableRemotePlayback className="mt-3 aspect-video w-full bg-black" />}
    {notice && <p role="status" className="mt-2 text-sm text-white/60">{notice}</p>}
    <p className="mt-2 text-xs text-white/45">Incoming program only. Stops after two minutes or when you leave this tab. Audio starts muted. Memory buffers only; no recording or persistent media storage. Satellite delivery is controlled separately.</p>
  </div>
}
