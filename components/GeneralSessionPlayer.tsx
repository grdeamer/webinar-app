"use client"

import Hls from "hls.js"
import { useEffect, useRef, useState } from "react"

export default function GeneralSessionPlayer(props: {
  sourceType: "mp4" | "hls"
  src: string
  posterUrl?: string | null
  title?: string | null
  autoPlay?: boolean
}) {
  const { sourceType, src, posterUrl, title, autoPlay = false } = props
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string>("")
  const [attemptedAutoplay, setAttemptedAutoplay] = useState(false)
  const [didAutoplay, setDidAutoplay] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setError("")
    setAttemptedAutoplay(false)
    setDidAutoplay(false)
    let hls: Hls | null = null

    video.pause()
    video.removeAttribute("src")
    video.load()

    if (sourceType === "hls") {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src
      } else if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: true })
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data?.fatal) {
            setError("Stream playback error. Check that the .m3u8 URL is valid and CORS is allowed.")
            try {
              hls?.destroy()
            } catch {}
          }
        })
        hls.loadSource(src)
        hls.attachMedia(video)
      } else {
        video.src = src
        setError("HLS may not be supported in this browser.")
      }
    } else {
      video.src = src
    }

    return () => {
      try {
        hls?.destroy()
      } catch {}
    }
  }, [sourceType, src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !autoPlay || attemptedAutoplay) return

    let canceled = false
    const tryAutoPlay = async () => {
      setAttemptedAutoplay(true)
      try {
        video.muted = true
        await video.play()
        if (!canceled) setDidAutoplay(true)
      } catch {
        if (!canceled) setDidAutoplay(false)
      }
    }

    const id = window.setTimeout(() => {
      void tryAutoPlay()
    }, 250)

    return () => {
      canceled = true
      window.clearTimeout(id)
    }
  }, [autoPlay, attemptedAutoplay, src, sourceType])

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        className="h-[240px] w-full bg-black sm:h-[360px] md:h-[520px]"
        poster={posterUrl ?? undefined}
        preload="metadata"
      />

      <div className="border-t border-white/10 bg-slate-950/95 p-3 text-sm text-white/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium text-white/85">{title || "Embedded player"}</div>
            <div className="mt-1 text-xs text-white/50">
              {didAutoplay
                ? "Watch now started muted for browser compatibility. Use the volume control when ready."
                : "Press play to start, or use the controls to enter fullscreen."}
            </div>
          </div>
          {didAutoplay ? (
            <button
              type="button"
              onClick={() => {
                const video = videoRef.current
                if (!video) return
                video.muted = false
                void video.play().catch(() => {})
              }}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              Unmute
            </button>
          ) : null}
        </div>
        {error ? <div className="mt-3 text-sm text-amber-200">{error}</div> : null}
      </div>
    </div>
  )
}
