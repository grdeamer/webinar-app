"use client"

import type HlsType from "hls.js"
import {
  useEffect,
  useRef,
  type CSSProperties,
} from "react"

export default function ElementVideoPlayer({
  url,
  sourceType = "mp4",
  className,
  style,
  autoPlay = false,
  muted = false,
  controls = true,
  loop = false,
  poster,
  trimStart = 0,
  trimEnd = 0,
}: {
  url: string
  sourceType?: string
  className?: string
  style?: CSSProperties
  autoPlay?: boolean
  muted?: boolean
  controls?: boolean
  loop?: boolean
  poster?: string
  trimStart?: number
  trimEnd?: number
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let destroyed = false
    let hls: HlsType | null = null

    async function setup() {
      const video = videoRef.current
      if (!video || !url) return

      video.pause()
      video.removeAttribute("src")
      video.load()

      if (sourceType !== "hls" && sourceType !== "m3u8") {
        video.src = url
        video.load()
        return
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url
        video.load()
        return
      }

      try {
        const { default: Hls } = await import("hls.js")
        if (destroyed) return

        if (Hls.isSupported()) {
          hls = new Hls()
          hls.loadSource(url)
          hls.attachMedia(video)
          return
        }
      } catch {
        // Fall through to the browser's native source handling.
      }

      if (!destroyed) {
        video.src = url
        video.load()
      }
    }

    void setup()

    return () => {
      destroyed = true
      hls?.destroy()
    }
  }, [sourceType, url])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const startAt = Math.max(0, trimStart)

    const applyStartTime = () => {
      if (startAt <= 0) return

      try {
        video.currentTime = startAt
      } catch {
        // The browser may reject seeking before metadata is ready.
      }
    }

    const enforceTrimEnd = () => {
      if (trimEnd <= 0 || video.currentTime < trimEnd) return

      if (loop) {
        try {
          video.currentTime = startAt
          void video.play().catch((): void => {})
        } catch {
          // Ignore media state races while the source changes.
        }
      } else {
        video.pause()
      }
    }

    video.addEventListener("loadedmetadata", applyStartTime)
    video.addEventListener("timeupdate", enforceTrimEnd)

    return () => {
      video.removeEventListener("loadedmetadata", applyStartTime)
      video.removeEventListener("timeupdate", enforceTrimEnd)
    }
  }, [loop, trimEnd, trimStart])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = muted

    if (autoPlay) {
      void video.play().catch((): void => {})
    } else {
      video.pause()
    }
  }, [autoPlay, muted, sourceType, url])

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      autoPlay={autoPlay}
      muted={muted}
      controls={controls}
      loop={loop && trimEnd <= 0}
      poster={poster || undefined}
      playsInline
      preload="metadata"
    />
  )
}
