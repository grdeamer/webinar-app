"use client"
import { useEffect, useRef, useState } from "react"
const MIME = 'video/mp4; codecs="avc1.42C01F, mp4a.40.2"'
/** Fetch -> bounded MediaSource buffers. Never uses recording or storage APIs. */
export default function OutgoingStream({ ids, expanded, audio }: { ids: string[]; expanded: boolean; audio: boolean }) {
  const player = useRef<HTMLVideoElement>(null)
  const [notice, setNotice] = useState("Connecting outgoing feed…")
  const [playing, setPlaying] = useState(false)
  const selection = ids.join(",")
  useEffect(() => { if (player.current) player.current.muted = !audio }, [audio])
  useEffect(() => {
    const video = player.current
    if (!video) return
    if (!window.MediaSource || !MediaSource.isTypeSupported(MIME)) return
    const sessionId = crypto.randomUUID()
    const abort = new AbortController(), media = new MediaSource(), url = URL.createObjectURL(media)
    video.src = url
    async function play() {
      try {
        await new Promise<void>((resolve, reject) => {
          media.addEventListener("sourceopen", () => resolve(), { once: true })
          abort.signal.addEventListener("abort", () => reject(new Error("Stopped")), { once: true })
        })
        const buffer = media.addSourceBuffer(MIME)
        const response = await fetch("/api/admin/zoom-bridge/multiview", { method: "POST", cache: "no-store", signal: abort.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selection.split(","), expanded, sessionId }) })
        if (!response.ok || !response.body) throw new Error("Unavailable")
        const reader = response.body.getReader()
        async function update(action: () => void) {
          await new Promise<void>((resolve, reject) => {
            function clean() { buffer.removeEventListener("updateend", done); buffer.removeEventListener("error", failed); abort.signal.removeEventListener("abort", failed) }
            function done() { clean(); resolve() }
            function failed() { clean(); reject(new Error("Interrupted")) }
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
            if (end - video!.currentTime > 4) video!.currentTime = Math.max(0, end - 1.5)
            if (video!.currentTime > 8) await update(() => buffer.remove(0, video!.currentTime - 5))
            if (video!.paused) await video!.play()
            setPlaying(true)
          }
        }
        if (!abort.signal.aborted) { setPlaying(false); setNotice("Monitor ended or busy. Stop and restart Multiview to reconnect.") }
      } catch { if (!abort.signal.aborted) { setPlaying(false); setNotice("Outgoing preview unavailable. Try current Chrome or Edge, or restart Multiview.") } }
    }
    void play()
    return () => {
      abort.abort()
      // Explicit stop is needed because a hosting proxy can keep a streaming
      // response alive after the browser cancels it. A stale stop cannot stop a new session.
      void fetch("/api/admin/zoom-bridge/multiview", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stop: true, sessionId }) }).catch(() => {})
      video.pause(); video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url) }
  }, [selection, expanded])
  return <><video aria-label={expanded ? "Expanded outgoing feed" : "Outgoing feeds grid"} ref={player} autoPlay muted playsInline disablePictureInPicture disableRemotePlayback className="absolute inset-0 h-full w-full bg-black object-contain" />{!playing ? <p role="status" className="pointer-events-none absolute inset-0 z-10 grid place-content-center bg-black/80 px-6 text-center text-sm text-white/60">{notice}</p> : null}</>
}
