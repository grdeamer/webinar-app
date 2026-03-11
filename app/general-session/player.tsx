"use client"

import React from "react"

type GateState = "holding" | "live" | "paused" | "ended"

type Props = {
  sourceType: "mp4" | "m3u8" | "rtmp"
  mp4Url: string | null
  m3u8Url: string | null
  rtmpUrl: string | null
  posterUrl: string | null
  mp4Path?: string | null

  programKind?: "video" | "slides"
  slideUrl?: string | null

  lowerThird?: { active: boolean; name: string | null; title: string | null } | null

  gateState?: GateState
  gateMessage?: string | null
}

export default function GeneralSessionPlayer({
  sourceType,
  mp4Url,
  m3u8Url,
  rtmpUrl,
  posterUrl,
  mp4Path,
  programKind = "video",
  slideUrl = null,
  lowerThird = null,
  gateState = "live",
  gateMessage = null,
}: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const [err, setErr] = React.useState<string>("")

  // RTMP is ingest-only; playback should be HLS (.m3u8) when available.
  const effectiveSourceType: "mp4" | "m3u8" | "rtmp" =
    sourceType === "rtmp" && m3u8Url ? "m3u8" : sourceType

  const videoSrc =
    effectiveSourceType === "mp4"
      ? mp4Url ?? undefined
      : effectiveSourceType === "m3u8"
      ? m3u8Url ?? undefined
      : undefined

  // If not live, keep the element paused.
  React.useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const enforcePause = () => {
      if (gateState !== "live") {
        try {
          v.pause()
        } catch {}
      }
    }

    enforcePause()
    v.addEventListener("play", enforcePause)
    return () => v.removeEventListener("play", enforcePause)
  }, [gateState])

  return (
    <div className="relative">
      {/* Program */}
      {programKind === "slides" ? (
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          {slideUrl ? (
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <iframe src={slideUrl} className="absolute inset-0 h-full w-full" title="Slides" />
            </div>
          ) : (
            <div className="p-6 text-sm text-white/70">No slide selected.</div>
          )}
        </div>
      ) : effectiveSourceType === "rtmp" ? (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="text-sm text-white/80">RTMP cannot be played directly in a browser.</div>
          <div className="mt-2 text-xs text-white/60">
            Use an HLS (.m3u8) output for attendee playback, or switch to MP4.
          </div>
          {rtmpUrl ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70 break-all">
              {rtmpUrl}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          {/* 16:9 wrapper */}
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full"
              controls
              playsInline
              preload="metadata"
              poster={posterUrl ?? undefined}
              src={videoSrc}
              onError={() => setErr("Playback error. If using HLS, your browser may require a compatible stream.")}
            />
          </div>
        </div>
      )}

      {/* Playback error */}
      {err ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
          {err}
        </div>
      ) : null}

      {/* Gate overlay */}
      {gateState !== "live" ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/60 px-6 py-5 text-center shadow">
            <div className="text-xl font-semibold">
              {gateState === "holding"
                ? "Starting soon"
                : gateState === "paused"
                ? "Paused"
                : gateState === "ended"
                ? "Session ended"
                : "Offline"}
            </div>
            <div className="mt-2 text-sm text-white/70">{gateMessage || "Please hang tight."}</div>
            {mp4Path ? <div className="mt-3 text-[11px] text-white/45">Source: {mp4Path}</div> : null}
          </div>
        </div>
      ) : null}

      {/* Lower third */}
      {gateState === "live" && lowerThird?.active ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10">
          <div className="rounded-2xl border border-white/10 bg-black/70 px-4 py-3 shadow">
            <div className="text-sm font-semibold leading-tight">{lowerThird.name || ""}</div>
            {lowerThird.title ? <div className="text-xs text-white/70">{lowerThird.title}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
