"use client"

import type HlsType from "hls.js"
import {
  useEffect,
  useRef,
  useState,
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
  playOnHover = false,
  pauseOnHoverExit = true,
  accessibleLabel = "video",
  showPlaybackIndicator = false,
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
  playOnHover?: boolean
  pauseOnHoverExit?: boolean
  accessibleLabel?: string
  showPlaybackIndicator?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const resetCompletedPlayback = (video: HTMLVideoElement) => {
    if (
      !video.ended &&
      (trimEnd <= 0 || video.currentTime < trimEnd)
    ) {
      return
    }

    try {
      video.currentTime = Math.max(0, trimStart)
    } catch {
      // The browser may reject seeking while the media source is changing.
    }
  }

  const playVideo = () => {
    const video = videoRef.current
    if (!video) return

    resetCompletedPlayback(video)
    void video.play().catch(() => {
      setIsPlaying(false)
    })
  }

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused || video.ended) {
      playVideo()
    } else {
      video.pause()
    }
  }

  const supportsHoverPlayback = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches

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
      setIsPlaying(false)
    }
  }, [autoPlay, muted, sourceType, url])

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => {
        if (
          !autoPlay &&
          !controls &&
          playOnHover &&
          supportsHoverPlayback()
        ) {
          playVideo()
        }
      }}
      onMouseLeave={() => {
        if (
          !autoPlay &&
          !controls &&
          playOnHover &&
          pauseOnHoverExit &&
          supportsHoverPlayback()
        ) {
          videoRef.current?.pause()
        }
      }}
    >
      <video
        ref={videoRef}
        aria-label={accessibleLabel}
        className={className}
        style={style}
        autoPlay={autoPlay}
        muted={muted}
        controls={controls}
        loop={loop && trimEnd <= 0}
        poster={poster || undefined}
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />

      {!autoPlay && !controls ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={`${isPlaying ? "Pause" : "Play"} ${accessibleLabel}`}
          aria-pressed={isPlaying}
          data-element-video-playback-control
          onClick={togglePlayback}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return

            event.preventDefault()
            togglePlayback()
          }}
          className="group absolute inset-0 z-30 flex cursor-pointer items-center justify-center rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
        >
          {showPlaybackIndicator && !isPlaying ? (
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition group-hover:scale-110"
            >
              ▶
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
