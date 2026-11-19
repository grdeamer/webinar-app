"use client"

import { useEffect, useRef, useState } from "react"
import { ioButton } from "./SatelliteCard"

/** Local display capture only: no upload, server session, or audio acquisition. */
export default function LocalMeetingReturn() {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const mounted = useRef(false)
  const request = useRef(0)
  const [live, setLive] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  function stop() {
    request.current += 1
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
    setLive(false); setPending(false)
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
      setError("Open this page in a desktop browser that supports window sharing, such as Chrome, Edge, or Safari.")
      return
    }
    const token = ++request.current
    setPending(true)
    try {
      const next = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 10, max: 15 } }, audio: false,
      })
      if (!mounted.current || token !== request.current) {
        next.getTracks().forEach(track => track.stop())
        return
      }
      // Discard unexpected audio even if a browser supplies it despite audio:false.
      next.getAudioTracks().forEach(track => { track.stop(); next.removeTrack(track) })
      const picture = next.getVideoTracks()[0]
      if (!picture) { next.getTracks().forEach(track => track.stop()); throw new Error("No video track") }
      stream.current?.getTracks().forEach(track => track.stop())
      stream.current = next
      picture.addEventListener("ended", () => {
        if (mounted.current && stream.current === next) stop()
      }, { once: true })
      if (video.current) {
        video.current.srcObject = next
        void video.current.play().catch(() => {
          if (mounted.current && stream.current === next) {
            stop(); setError("Playback could not start. Select the Zoom window again.")
          }
        })
      }
      setLive(true)
    } catch {
      if (mounted.current && token === request.current) setError("No new window was selected. Allow screen sharing in your browser and macOS, then select the meeting’s Zoom window.")
    } finally {
      if (mounted.current && token === request.current) setPending(false)
    }
  }

  return <div className="space-y-3 pb-3">
    <div className="relative aspect-video bg-[#14283d]">
      <video ref={video} autoPlay playsInline muted className="h-full w-full object-contain" aria-label="Local Zoom window return" />
      {!live ? <div className="absolute inset-0 grid place-content-center px-5 text-center text-sm text-slate-300">See the participants and presentation exactly as arranged in your Zoom window.</div> : null}
    </div>
    <div className="flex flex-wrap gap-2 px-3">
      <button type="button" className={ioButton} disabled={pending} onClick={() => void capture()}>{pending ? "Choosing window…" : live ? "Change Zoom window" : "Select Zoom window"}</button>
      {live || pending ? <button type="button" className={ioButton} onClick={stop}>Stop capture</button> : null}
    </div>
    <p role="status" className="px-3 text-sm text-slate-300">{live ? "Local window connected · captured audio off" : "This Mac · waiting for a Zoom window"}</p>
    <p className="px-3 text-sm leading-5 text-slate-400">Join Zoom on this Mac with camera and microphone off. Arrange participants alongside the shared presentation, then choose that window. Verify the picture matches this meeting. Capture stays in this browser; it is not sent to Jupiter’s server or other computers. Keep the Zoom window open. Closing this view stops capture.</p>
    {error ? <p role="alert" className="px-3 text-sm text-amber-200">{error}</p> : null}
  </div>
}
