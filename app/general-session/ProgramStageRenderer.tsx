"use client"

import { useEffect, useMemo, useState } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import { GENERAL_SESSION_EVENT_SLUG } from "@/lib/live/generalSessionEvent"
import { isTrackReference } from "@livekit/components-core"
import type { TrackReference } from "@livekit/components-core"

type PublicProgramState = {
  event_id: string
  room_id: string | null
  is_live: boolean
  auto_director_enabled: boolean
  layout: "solo" | "grid" | "screen_speaker"
  stage_participant_ids: string[]
  primary_participant_id: string | null
  pinned_participant_id: string | null
  screen_share_participant_id: string | null
  screen_share_track_id: string | null
  scene_version: number
  headline?: string | null
  message?: string | null
  updated_by?: string | null
  updated_at: string
}

type TrackRefLike = TrackReference

function AudienceProgramTracks({
  programState,
}: {
  programState: PublicProgramState
}) {
  const cameraTracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ])

  const screenTracks = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ])

  const participants = useParticipants()

  const stageIds = useMemo(
    () => new Set(programState.stage_participant_ids || []),
    [programState.stage_participant_ids]
  )

  const onStageCameraTracks = useMemo<TrackReference[]>(() => {
    return cameraTracks.filter(
      (trackRef): trackRef is TrackReference =>
        isTrackReference(trackRef) && stageIds.has(trackRef.participant.identity)
    )
  }, [cameraTracks, stageIds])

  const onStageScreenTracks = useMemo<TrackReference[]>(() => {
    return screenTracks.filter(
      (trackRef): trackRef is TrackReference =>
        isTrackReference(trackRef) && stageIds.has(trackRef.participant.identity)
    )
  }, [screenTracks, stageIds])

  function pickActiveSpeakerCamera(): TrackRefLike | null {
    if (onStageCameraTracks.length === 0) return null

    const stagedParticipants = participants.filter((p) =>
      stageIds.has(p.identity)
    )

    const activeSpeaker = stagedParticipants.find((p: any) => p.isSpeaking)
    if (!activeSpeaker) return null

    return (
      onStageCameraTracks.find(
        (t) => t.participant.identity === activeSpeaker.identity
      ) || null
    )
  }

  function pickPrimaryCamera(): TrackRefLike | null {
    if (onStageCameraTracks.length === 0) return null

    if (programState.pinned_participant_id) {
      const pinned = onStageCameraTracks.find(
        (t) => t.participant.identity === programState.pinned_participant_id
      )
      if (pinned) return pinned
    }

    if (programState.primary_participant_id) {
      const primary = onStageCameraTracks.find(
        (t) => t.participant.identity === programState.primary_participant_id
      )
      if (primary) return primary
    }

    if (programState.auto_director_enabled) {
      const activeSpeaker = pickActiveSpeakerCamera()
      if (activeSpeaker) return activeSpeaker
    }

    const firstFromStageOrder = (programState.stage_participant_ids || [])
      .map(
        (id) =>
          onStageCameraTracks.find((t) => t.participant.identity === id) || null
      )
      .find(Boolean)

    return firstFromStageOrder || onStageCameraTracks[0] || null
  }

  function pickScreenTrack(): TrackRefLike | null {
    if (onStageScreenTracks.length === 0) return null

    if (programState.screen_share_track_id) {
      const exact = onStageScreenTracks.find(
        (t) => t.publication.trackSid === programState.screen_share_track_id
      )
      if (exact) return exact
    }

    if (programState.screen_share_participant_id) {
      const byParticipant = onStageScreenTracks.find(
        (t) => t.participant.identity === programState.screen_share_participant_id
      )
      if (byParticipant) return byParticipant
    }

    if (
      programState.auto_director_enabled &&
      programState.layout === "screen_speaker"
    ) {
      return onStageScreenTracks[0] || null
    }

    return null
  }

  function pickSpeakerCameraForScreenLayout(): TrackRefLike | null {
    if (onStageCameraTracks.length === 0) return null

    if (programState.pinned_participant_id) {
      const pinned = onStageCameraTracks.find(
        (t) => t.participant.identity === programState.pinned_participant_id
      )
      if (pinned) return pinned
    }

    if (programState.primary_participant_id) {
      const primary = onStageCameraTracks.find(
        (t) => t.participant.identity === programState.primary_participant_id
      )
      if (primary) return primary
    }

    if (programState.screen_share_participant_id) {
      const sharerCam = onStageCameraTracks.find(
        (t) => t.participant.identity === programState.screen_share_participant_id
      )
      if (sharerCam) return sharerCam
    }

    if (programState.auto_director_enabled) {
      const activeSpeaker = pickActiveSpeakerCamera()
      if (activeSpeaker) return activeSpeaker
    }

    return onStageCameraTracks[0] || null
  }

  function renderEmpty(message: string) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/40 text-white/40">
        {message}
      </div>
    )
  }

  function renderSolo() {
    const primary = pickPrimaryCamera()
    if (!primary) return renderEmpty("Waiting for live speaker…")

    return (
      <div className="overflow-hidden rounded-2xl bg-black">
        <VideoTrack
          trackRef={primary}
          className="aspect-video h-full w-full object-cover"
        />
      </div>
    )
  }

  function renderGrid() {
    if (onStageCameraTracks.length === 0) {
      return renderEmpty("Waiting for live participants…")
    }

    return (
      <div
        className={`grid gap-4 ${
          onStageCameraTracks.length === 1
            ? "grid-cols-1"
            : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        {onStageCameraTracks.map((trackRef) => (
          <div
            key={trackRef.participant.identity}
            className="overflow-hidden rounded-2xl bg-black"
          >
            <VideoTrack
              trackRef={trackRef}
              className="aspect-video h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    )
  }

  function renderScreenSpeaker() {
    const screenTrack = pickScreenTrack()
    const speakerTrack = pickSpeakerCameraForScreenLayout()

    if (!screenTrack && !speakerTrack) {
      return renderEmpty("Waiting for screen share or speaker…")
    }

    if (!screenTrack && speakerTrack) {
      return renderSolo()
    }

    return (
      <div className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="overflow-hidden rounded-2xl bg-black">
          {screenTrack ? (
            <VideoTrack
              trackRef={screenTrack}
              className="aspect-video h-full w-full object-contain"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center text-white/40">
              No screen share
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl bg-black">
          {speakerTrack ? (
            <VideoTrack
              trackRef={speakerTrack}
              className="aspect-video h-full w-full object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center text-white/40">
              No speaker camera
            </div>
          )}
        </div>
      </div>
    )
  }

  if (programState.layout === "solo") return renderSolo()
  if (programState.layout === "screen_speaker") return renderScreenSpeaker()
  return renderGrid()
}

export default function ProgramStageRenderer() {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [programState, setProgramState] = useState<PublicProgramState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState("Loading program...")

  async function loadProgramState() {
    const res = await fetch("/api/general-session/program-state", {
      cache: "no-store",
    })

    const data = await res.json().catch((): null => null)

    if (!res.ok) {
      throw new Error(data?.error || "Failed to load program state")
    }

    setProgramState(data?.state ?? null)
  }

  async function loadAudienceToken() {
    const res = await fetch(
      `/api/events/${GENERAL_SESSION_EVENT_SLUG}/live/audience-token`,
      {
        method: "POST",
      }
    )

    const data = await res.json().catch((): null => null)

    if (!res.ok || !data?.token) {
      throw new Error(data?.error || "Failed to create audience token")
    }

    setToken(data.token)
    setServerUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL || "")
  }

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        setError(null)
        setLoading("Loading program...")
        await loadProgramState()
        if (!mounted) return
        await loadAudienceToken()
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || "Failed to load program renderer")
      }
    }

    void boot()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadProgramState().catch(() => {})
    }, 3000)

    return () => window.clearInterval(id)
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
        {error}
      </div>
    )
  }

  if (!programState) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-white/60">
        {loading}
      </div>
    )
  }

  if (!programState.is_live) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-10 text-center text-white">
        <div className="text-xs uppercase tracking-[0.25em] text-white/40">
          Live Stage
        </div>
        <div className="mt-3 text-2xl font-semibold">Starting soon</div>
        <div className="mt-2 text-white/50">
          The live program has not started yet.
        </div>
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-white/60">
        Connecting to live program...
      </div>
    )
  }

  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio>
      <RoomAudioRenderer />

      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#030712_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%,transparent_78%,rgba(255,255,255,0.02))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-400/10 to-transparent" />

        <div className="relative z-10 border-b border-white/10 px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">
                Live Broadcast
              </div>
              <div className="mt-1 text-lg font-semibold text-white md:text-xl">
                {programState.headline || "Now Live"}
              </div>
              {programState.message ? (
                <div className="mt-1 text-sm text-white/55">
                  {programState.message}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-red-400/25 bg-red-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-200">
                Live
              </span>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/55">
                {programState.layout === "screen_speaker"
                  ? "Speaker + Screen"
                  : programState.layout === "grid"
                    ? "Grid"
                    : "Solo"}
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 p-3 md:p-4">
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <AudienceProgramTracks programState={programState} />
          </div>
        </div>
      </div>
    </LiveKitRoom>
  )
}