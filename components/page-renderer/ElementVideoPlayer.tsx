"use client"

import type HlsType from "hls.js"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"

import type { ElementVideoSource } from "@/lib/page-editor/elementPresentation"

const SIGNED_SOURCE_REFRESH_LEAD_MS = 5 * 60 * 1000
const MAX_TIMEOUT_MS = 2_147_483_647

type SignedSourceRefreshReason = "expiring" | "error"

type ActiveVideoSource = {
  url: string
  sourceType: string
  expiresAt: number | null
  sourceIdentity: string | null
}

type PlaybackSnapshot = {
  currentTime: number
  shouldPlay: boolean
  muted: boolean
  volume: number
  playbackRate: number
}

type ElementVideoPlayerProps = {
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
  sourceExpiresAt?: number | null
  sourceIdentity?: string | null
  refreshSource?: (
    reason: SignedSourceRefreshReason,
  ) => Promise<ElementVideoSource | null>
}

function getPlaybackSnapshot(
  video: HTMLVideoElement,
  wasPlaying: boolean,
): PlaybackSnapshot {
  return {
    currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
    shouldPlay: wasPlaying || (!video.paused && !video.ended),
    muted: video.muted,
    volume: video.volume,
    playbackRate: video.playbackRate,
  }
}

function supportsHoverPlayback() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  )
}

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
  sourceExpiresAt = null,
  sourceIdentity = null,
  refreshSource,
}: ElementVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isPlayingRef = useRef(false)
  const pendingPlaybackRestoreRef = useRef<PlaybackSnapshot | null>(null)
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null)
  const recoveryAttemptedRef = useRef(false)
  const playbackRequestedRef = useRef(autoPlay)
  const previousAutoPlayRef = useRef(autoPlay)
  const sourceSetupInProgressRef = useRef(false)
  const autoPlayRef = useRef(autoPlay)
  const mutedRef = useRef(muted)
  const trimStartRef = useRef(trimStart)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeSource, setActiveSource] = useState<ActiveVideoSource>(() => ({
    url,
    sourceType,
    expiresAt: sourceExpiresAt,
    sourceIdentity,
  }))
  const activeSourceRef = useRef(activeSource)

  activeSourceRef.current = activeSource
  autoPlayRef.current = autoPlay
  mutedRef.current = muted
  trimStartRef.current = trimStart

  const resetCompletedPlayback = useCallback(
    (video: HTMLVideoElement) => {
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
    },
    [trimEnd, trimStart],
  )

  const playVideo = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    playbackRequestedRef.current = true
    recoveryAttemptedRef.current = false
    resetCompletedPlayback(video)
    void video.play().catch(() => {
      isPlayingRef.current = false
      setIsPlaying(false)
    })
  }, [resetCompletedPlayback])

  const togglePlayback = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused || video.ended) {
      playVideo()
    } else {
      playbackRequestedRef.current = false
      video.pause()
    }
  }, [playVideo])

  const refreshSignedSource = useCallback(
    async (reason: SignedSourceRefreshReason): Promise<boolean> => {
      const existingRefresh = refreshPromiseRef.current
      if (existingRefresh) return existingRefresh

      const currentSource = activeSourceRef.current
      if (
        !refreshSource ||
        currentSource.sourceType === "hls" ||
        currentSource.sourceType === "m3u8" ||
        !currentSource.sourceIdentity
      ) {
        return false
      }

      const video = videoRef.current
      const playbackSnapshot = video
        ? getPlaybackSnapshot(video, isPlayingRef.current)
        : null
      if (
        playbackSnapshot &&
        reason === "error" &&
        playbackRequestedRef.current
      ) {
        playbackSnapshot.shouldPlay = true
      }

      const refreshRequest = (async () => {
        try {
          const refreshedSource = await refreshSource(reason)
          if (
            !refreshedSource?.url ||
            refreshedSource.sourceType !== "mp4"
          ) {
            return false
          }

          if (activeSourceRef.current.url === refreshedSource.url) {
            return true
          }

          if (refreshedSource.url === currentSource.url) return false

          if (playbackSnapshot) {
            pendingPlaybackRestoreRef.current = playbackSnapshot
          }

          const nextSource: ActiveVideoSource = {
            url: refreshedSource.url,
            sourceType: refreshedSource.sourceType,
            expiresAt: refreshedSource.expiresAt ?? null,
            sourceIdentity:
              refreshedSource.sourceIdentity ??
              currentSource.sourceIdentity,
          }

          activeSourceRef.current = nextSource
          setActiveSource(nextSource)
          return true
        } catch {
          return false
        }
      })()

      refreshPromiseRef.current = refreshRequest

      try {
        return await refreshRequest
      } finally {
        if (refreshPromiseRef.current === refreshRequest) {
          refreshPromiseRef.current = null
        }
      }
    },
    [refreshSource],
  )

  useEffect(() => {
    const currentSource = activeSourceRef.current
    const nextSource: ActiveVideoSource = {
      url,
      sourceType,
      expiresAt: sourceExpiresAt,
      sourceIdentity,
    }

    if (
      currentSource.url === nextSource.url &&
      currentSource.sourceType === nextSource.sourceType &&
      currentSource.expiresAt === nextSource.expiresAt &&
      currentSource.sourceIdentity === nextSource.sourceIdentity
    ) {
      return
    }

    const video = videoRef.current
    const preservesSignedSourceIdentity =
      Boolean(nextSource.sourceIdentity) &&
      nextSource.sourceIdentity === currentSource.sourceIdentity

    if (
      video &&
      preservesSignedSourceIdentity &&
      (currentSource.url !== nextSource.url ||
        currentSource.sourceType !== nextSource.sourceType)
    ) {
      pendingPlaybackRestoreRef.current = getPlaybackSnapshot(
        video,
        isPlayingRef.current,
      )
    }

    activeSourceRef.current = nextSource
    setActiveSource(nextSource)
  }, [sourceExpiresAt, sourceIdentity, sourceType, url])

  useEffect(() => {
    let destroyed = false
    let hls: HlsType | null = null
    const video = videoRef.current
    if (!video) return

    const playbackSnapshot = pendingPlaybackRestoreRef.current
    pendingPlaybackRestoreRef.current = null

    const restorePlayback = () => {
      if (destroyed) return
      sourceSetupInProgressRef.current = false

      const startAt = Math.max(0, trimStartRef.current)
      const requestedTime = playbackSnapshot?.currentTime ?? startAt
      const targetTime =
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.min(requestedTime, video.duration)
          : requestedTime

      try {
        video.currentTime = Math.max(startAt, targetTime)
      } catch {
        // The browser may reject seeking before the media source is ready.
      }

      video.muted = playbackSnapshot?.muted ?? mutedRef.current
      if (playbackSnapshot) {
        video.volume = playbackSnapshot.volume
        video.playbackRate = playbackSnapshot.playbackRate
      }

      if (playbackSnapshot?.shouldPlay || autoPlayRef.current) {
        void video.play().catch((): void => {})
      }
    }

    video.addEventListener("loadedmetadata", restorePlayback, { once: true })
    sourceSetupInProgressRef.current = true
    video.pause()
    video.removeAttribute("src")
    video.load()

    async function setup() {
      if (!activeSource.url) return

      if (
        activeSource.sourceType !== "hls" &&
        activeSource.sourceType !== "m3u8"
      ) {
        video.src = activeSource.url
        video.load()
        return
      }

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = activeSource.url
        video.load()
        return
      }

      try {
        const { default: Hls } = await import("hls.js")
        if (destroyed) return

        if (Hls.isSupported()) {
          hls = new Hls()
          hls.loadSource(activeSource.url)
          hls.attachMedia(video)
          return
        }
      } catch {
        // Fall through to the browser's native source handling.
      }

      if (!destroyed) {
        video.src = activeSource.url
        video.load()
      }
    }

    void setup()

    return () => {
      destroyed = true
      sourceSetupInProgressRef.current = false
      video.removeEventListener("loadedmetadata", restorePlayback)
      hls?.destroy()
    }
  }, [activeSource.sourceType, activeSource.url])

  useEffect(() => {
    if (
      !refreshSource ||
      !activeSource.sourceIdentity ||
      activeSource.sourceType !== "mp4" ||
      typeof activeSource.expiresAt !== "number"
    ) {
      return
    }

    const refreshDelay = Math.max(
      0,
      activeSource.expiresAt -
        Date.now() -
        SIGNED_SOURCE_REFRESH_LEAD_MS,
    )
    const timer = window.setTimeout(() => {
      void refreshSignedSource("expiring")
    }, Math.min(refreshDelay, MAX_TIMEOUT_MS))

    return () => window.clearTimeout(timer)
  }, [
    activeSource.expiresAt,
    activeSource.sourceIdentity,
    activeSource.sourceType,
    activeSource.url,
    refreshSignedSource,
    refreshSource,
  ])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const startAt = Math.max(0, trimStart)

    const applyStartTime = () => {
      if (pendingPlaybackRestoreRef.current || startAt <= 0) return

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
      playbackRequestedRef.current = true
      recoveryAttemptedRef.current = false
      void video.play().catch((): void => {})
    } else if (previousAutoPlayRef.current) {
      playbackRequestedRef.current = false
      video.pause()
      isPlayingRef.current = false
      setIsPlaying(false)
    }

    previousAutoPlayRef.current = autoPlay
  }, [autoPlay, muted])

  const handlePlaybackError = () => {
    const currentSource = activeSourceRef.current
    const canRecoverSignedSource =
      Boolean(refreshSource) &&
      Boolean(currentSource.sourceIdentity) &&
      currentSource.sourceType === "mp4"

    if (canRecoverSignedSource && !recoveryAttemptedRef.current) {
      recoveryAttemptedRef.current = true
      void refreshSignedSource("error")
    }

    sourceSetupInProgressRef.current = false
    isPlayingRef.current = false
    setIsPlaying(false)
  }

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
          playbackRequestedRef.current = false
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
        onPlay={() => {
          recoveryAttemptedRef.current = false
          playbackRequestedRef.current = true
          isPlayingRef.current = true
          setIsPlaying(true)
        }}
        onPause={() => {
          if (!sourceSetupInProgressRef.current) {
            playbackRequestedRef.current = false
          }
          isPlayingRef.current = false
          setIsPlaying(false)
        }}
        onEnded={() => {
          playbackRequestedRef.current = false
          isPlayingRef.current = false
          setIsPlaying(false)
        }}
        onError={handlePlaybackError}
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
