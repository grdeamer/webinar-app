"use client"

import { useEffect, useMemo, useState } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import type {
  TrackReference,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-core"

type TokenResponse = {
  token: string
  wsUrl: string
  roomName: string
}

type StageLayout = "solo" | "grid" | "screen_speaker"
type StageTransitionType = "cut" | "fade" | "dip_to_black"

type StageStateResponse = {
  state?: {
    session_id: string
    layout?: StageLayout
    stage_participant_ids?: string[]
    primary_participant_id?: string | null

    preview_layout?: StageLayout
    preview_stage_participant_ids?: string[]
    preview_primary_participant_id?: string | null

    program_layout?: StageLayout
    program_stage_participant_ids?: string[]
    program_primary_participant_id?: string | null

    transition_type?: StageTransitionType
    transition_started_at?: string | null
  }
}

function isTrackReference(
  value: TrackReferenceOrPlaceholder | null | undefined
): value is TrackReference {
  return !!value && !!value.publication
}

function LiveBadge() {
  return (
    <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/15 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-red-100 shadow-[0_10px_30px_rgba(239,68,68,0.18)]">
      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      Live Session
    </div>
  )
}

function PlayerFrame({
  children,
  lowerThird,
  transitionOverlay,
}: {
  children: React.ReactNode
  lowerThird?: React.ReactNode
  transitionOverlay?: React.ReactNode
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
      <div className="relative overflow-hidden rounded-[24px] bg-black">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.10),transparent_35%)]" />
        {children}
        {transitionOverlay}
      </div>

      {lowerThird ? <div className="mt-3">{lowerThird}</div> : null}
    </div>
  )
}

function StageCanvas({
  stageEndpoint,
}: {
  stageEndpoint: string
}) {
  const trackRefs = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Camera, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  )

  const realTrackRefs = useMemo(
    () => trackRefs.filter(isTrackReference),
    [trackRefs]
  )

  const [layout, setLayout] = useState<StageLayout>("solo")
  const [stageIds, setStageIds] = useState<string[]>([])
  const [primaryId, setPrimaryId] = useState<string | null>(null)

  const [transitionActive, setTransitionActive] = useState(false)
  const [transitionType, setTransitionType] = useState<"fade" | "dip_to_black">(
    "fade"
  )
  const [lastTransitionStartedAt, setLastTransitionStartedAt] = useState<string | null>(
    null
  )

  useEffect(() => {
    let cancelled = false
    let hideTimeout: number | null = null

    async function loadStageState() {
      try {
        const res = await fetch(stageEndpoint, { cache: "no-store" })
        const data = (await res.json().catch((): null => null)) as
          | StageStateResponse
          | null

        if (!res.ok || cancelled || !data?.state) return

        const nextLayout = data.state.layout || data.state.program_layout || "solo"
        const nextStageIds =
          data.state.stage_participant_ids ||
          data.state.program_stage_participant_ids ||
          []
        const nextPrimaryId =
          data.state.primary_participant_id ??
          data.state.program_primary_participant_id ??
          null

        setLayout(nextLayout)
        setStageIds(nextStageIds)
        setPrimaryId(nextPrimaryId)

        const nextTransitionStartedAt = data.state.transition_started_at || null
        const nextTransitionType =
          data.state.transition_type === "dip_to_black" ? "dip_to_black" : "fade"

        if (
          nextTransitionStartedAt &&
          nextTransitionStartedAt !== lastTransitionStartedAt &&
          data.state.transition_type !== "cut"
        ) {
          setLastTransitionStartedAt(nextTransitionStartedAt)
          setTransitionType(nextTransitionType)
          setTransitionActive(false)

          window.setTimeout(() => {
            if (!cancelled) setTransitionActive(true)
          }, 20)

          if (hideTimeout) {
            window.clearTimeout(hideTimeout)
          }

          hideTimeout = window.setTimeout(() => {
            if (!cancelled) setTransitionActive(false)
          }, 1200)
        } else if (
          nextTransitionStartedAt &&
          nextTransitionStartedAt !== lastTransitionStartedAt
        ) {
          setLastTransitionStartedAt(nextTransitionStartedAt)
        }
      } catch {
        // ignore
      }
    }

    void loadStageState()

    const intervalId = window.setInterval(() => {
      void loadStageState()
    }, 2000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      if (hideTimeout) {
        window.clearTimeout(hideTimeout)
      }
    }
  }, [stageEndpoint, lastTransitionStartedAt])

  const filteredTracks = useMemo(() => {
    if (stageIds.length === 0) return []

    return realTrackRefs.filter((trackRef) =>
      stageIds.includes(trackRef.participant.identity)
    )
  }, [realTrackRefs, stageIds])

  const screenTracks = useMemo(() => {
    return filteredTracks.filter(
      (trackRef) => trackRef.publication.source === Track.Source.ScreenShare
    )
  }, [filteredTracks])

  const cameraTracks = useMemo(() => {
    return filteredTracks.filter(
      (trackRef) => trackRef.publication.source === Track.Source.Camera
    )
  }, [filteredTracks])

  const primaryCameraTrack = useMemo(() => {
    if (primaryId) {
      const exact = cameraTracks.find(
        (trackRef) => trackRef.participant.identity === primaryId
      )
      if (exact) return exact
    }
    return cameraTracks[0] ?? null
  }, [cameraTracks, primaryId])

  const primaryScreenTrack = useMemo(() => {
    if (primaryId) {
      const exact = screenTracks.find(
        (trackRef) => trackRef.participant.identity === primaryId
      )
      if (exact) return exact
    }
    return screenTracks[0] ?? null
  }, [screenTracks, primaryId])

  const transitionOverlay = transitionActive ? (
    <div
      className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-500 ${
        transitionType === "dip_to_black"
          ? "bg-black opacity-100"
          : "bg-black/70 opacity-100"
      }`}
    />
  ) : null

  if (layout === "screen_speaker" && primaryScreenTrack) {
    return (
      <PlayerFrame
        transitionOverlay={transitionOverlay}
        lowerThird={
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">
                {primaryScreenTrack.participant.name ||
                  primaryScreenTrack.participant.identity}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">
                Screen Share Presentation
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              screen + speaker
            </div>
          </div>
        }
      >
        <div className="relative">
          <LiveBadge />

          <VideoTrack
            trackRef={primaryScreenTrack}
            className="aspect-video w-full object-contain"
          />

          {primaryCameraTrack ? (
            <div className="absolute bottom-4 right-4 z-10 w-72 max-w-[32%] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
              <VideoTrack
                trackRef={primaryCameraTrack}
                className="aspect-video w-full object-cover"
              />
              <div className="border-t border-white/10 bg-black/85 px-3 py-2 text-xs text-white/85">
                {primaryCameraTrack.participant.name ||
                  primaryCameraTrack.participant.identity}
              </div>
            </div>
          ) : null}
        </div>
      </PlayerFrame>
    )
  }

  if (layout === "grid" && cameraTracks.length > 1) {
    return (
      <PlayerFrame
        transitionOverlay={transitionOverlay}
        lowerThird={
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">Live Panel</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">
                Multi-speaker view
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              grid
            </div>
          </div>
        }
      >
        <div className="relative">
          <LiveBadge />

          <div className="grid gap-3 p-3 md:grid-cols-2">
            {cameraTracks.map((trackRef) => (
              <div
                key={trackRef.publication.trackSid}
                className="overflow-hidden rounded-2xl bg-black"
              >
                <VideoTrack
                  trackRef={trackRef}
                  className="aspect-video w-full object-cover"
                />
                <div className="border-t border-white/10 bg-black/85 px-3 py-2 text-xs text-white/85">
                  {trackRef.participant.name || trackRef.participant.identity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PlayerFrame>
    )
  }

  if (primaryCameraTrack) {
    return (
      <PlayerFrame
        transitionOverlay={transitionOverlay}
        lowerThird={
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-white">
                {primaryCameraTrack.participant.name ||
                  primaryCameraTrack.participant.identity}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">
                Live Session • Presenter Feed
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
              solo
            </div>
          </div>
        }
      >
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <LiveBadge />

          <VideoTrack
            trackRef={primaryCameraTrack}
            className="h-full w-full object-cover"
          />
        </div>
      </PlayerFrame>
    )
  }

  return (
    <PlayerFrame transitionOverlay={transitionOverlay}>
      <div className="relative flex aspect-video w-full items-center justify-center bg-black">
        <LiveBadge />

        <div className="max-w-md px-6 text-center">
          <div className="text-base font-medium text-white/80">
            Waiting for stage selection
          </div>
          <div className="mt-3 text-sm leading-6 text-white/45">
            The session will begin shortly. Stay here while the next live moment is prepared.
          </div>
        </div>
      </div>
    </PlayerFrame>
  )
}

export default function SessionStagePlayer({
  tokenEndpoint,
  stageEndpoint,
}: {
  tokenEndpoint: string
  stageEndpoint: string
}) {
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [roomName, setRoomName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect((): (() => void) => {
    let cancelled = false

    async function loadToken(): Promise<void> {
      try {
        setError(null)

        const res = await fetch(tokenEndpoint, {
          method: "POST",
          cache: "no-store",
        })

        const data = (await res.json().catch((): null => null)) as
          | TokenResponse
          | { error?: string }
          | null

        if (!res.ok) {
          throw new Error(
            (data && "error" in data && data.error) || "Failed to join session"
          )
        }

        if (!data || !("token" in data) || !("wsUrl" in data)) {
          throw new Error("Invalid LiveKit token response")
        }

        if (cancelled) return

        setToken(data.token)
        setServerUrl(data.wsUrl)
        setRoomName(data.roomName)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to join session")
      }
    }

    void loadToken()

    return () => {
      cancelled = true
    }
  }, [tokenEndpoint])

  if (error) {
    return (
      <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="flex aspect-video w-full items-center justify-center rounded-[22px] bg-black text-sm text-white/55">
          Joining live session…
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {roomName ? (
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Jupiter Broadcast
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
            Room: {roomName}
          </div>
        </div>
      ) : null}

      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video={false}
        className="contents"
      >
        <RoomAudioRenderer />
        <StageCanvas stageEndpoint={stageEndpoint} />
      </LiveKitRoom>
    </div>
  )
}