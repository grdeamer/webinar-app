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
import { isTrackReference } from "@livekit/components-core"
import type { TrackReference } from "@livekit/components-core"

type PublicStageState = {
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
  headline: string | null
  message: string | null
  updated_by: string | null
  updated_at: string
}

/* =========================
   TRACK RESOLUTION ENGINE
========================= */

function AudienceStageTracks({
  stageState,
  autoDirector,
}: {
  stageState: PublicStageState
  autoDirector: boolean
}) {
  const cameraTracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
  ])

  const screenTracks = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ])

  const participants = useParticipants()

  const stageIds = useMemo(
    () => new Set(stageState.stage_participant_ids || []),
    [stageState.stage_participant_ids]
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

  function pickActiveSpeakerCamera(): TrackReference | null {
    const active = participants.find(
      (p: any) => stageIds.has(p.identity) && p.isSpeaking
    )

    if (!active) return null

    return (
      onStageCameraTracks.find(
        (t) => t.participant.identity === active.identity
      ) || null
    )
  }

  function pickPrimaryCamera(): TrackReference | null {
    if (!onStageCameraTracks.length) return null

    if (stageState.pinned_participant_id) {
      const pinned = onStageCameraTracks.find(
        (t) => t.participant.identity === stageState.pinned_participant_id
      )
      if (pinned) return pinned
    }

    if (stageState.primary_participant_id) {
      const primary = onStageCameraTracks.find(
        (t) => t.participant.identity === stageState.primary_participant_id
      )
      if (primary) return primary
    }

    if (autoDirector) {
      const active = pickActiveSpeakerCamera()
      if (active) return active
    }

    const ordered = stageState.stage_participant_ids
      .map((id) =>
        onStageCameraTracks.find((t) => t.participant.identity === id)
      )
      .find(Boolean)

    return ordered || onStageCameraTracks[0] || null
  }

  function pickScreenTrack(): TrackReference | null {
    if (!onStageScreenTracks.length) return null

    if (stageState.screen_share_track_id) {
      const exact = onStageScreenTracks.find(
        (t) => t.publication.trackSid === stageState.screen_share_track_id
      )
      if (exact) return exact
    }

    if (stageState.screen_share_participant_id) {
      const match = onStageScreenTracks.find(
        (t) =>
          t.participant.identity ===
          stageState.screen_share_participant_id
      )
      if (match) return match
    }

    if (autoDirector && stageState.layout === "screen_speaker") {
      return onStageScreenTracks[0] || null
    }

    return null
  }

  function pickSpeakerForScreen(): TrackReference | null {
    if (!onStageCameraTracks.length) return null

    if (stageState.pinned_participant_id) {
      const pinned = onStageCameraTracks.find(
        (t) => t.participant.identity === stageState.pinned_participant_id
      )
      if (pinned) return pinned
    }

    if (stageState.screen_share_participant_id) {
      const sharer = onStageCameraTracks.find(
        (t) =>
          t.participant.identity ===
          stageState.screen_share_participant_id
      )
      if (sharer) return sharer
    }

    if (stageState.primary_participant_id) {
      const primary = onStageCameraTracks.find(
        (t) => t.participant.identity === stageState.primary_participant_id
      )
      if (primary) return primary
    }

    if (autoDirector) {
      const active = pickActiveSpeakerCamera()
      if (active) return active
    }

    return onStageCameraTracks[0] || null
  }

  function empty(msg: string) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/40 text-white/40">
        {msg}
      </div>
    )
  }

  function renderSolo() {
    const cam = pickPrimaryCamera()
    if (!cam) return empty("Waiting for speaker…")

    return (
      <div className="overflow-hidden rounded-2xl bg-black">
        <VideoTrack trackRef={cam} className="aspect-video h-full w-full object-cover" />
      </div>
    )
  }

  function renderGrid() {
    if (!onStageCameraTracks.length) {
      return empty("Waiting for participants…")
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {onStageCameraTracks.map((t) => (
          <div key={t.participant.identity} className="overflow-hidden rounded-2xl bg-black">
            <VideoTrack trackRef={t} className="aspect-video h-full w-full object-cover" />
          </div>
        ))}
      </div>
    )
  }

  function renderScreenSpeaker() {
    const screen = pickScreenTrack()
    const speaker = pickSpeakerForScreen()

    if (!screen && !speaker) {
      return empty("Waiting for screen or speaker…")
    }

    if (!screen && speaker) {
      return renderSolo()
    }

    return (
      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.5fr]">
        <div className="overflow-hidden rounded-2xl bg-black">
          {screen ? (
            <VideoTrack trackRef={screen} className="aspect-video h-full w-full object-contain" />
          ) : (
            empty("No screen")
          )}
        </div>

        <div className="overflow-hidden rounded-2xl bg-black">
          {speaker ? (
            <VideoTrack trackRef={speaker} className="aspect-video h-full w-full object-cover" />
          ) : (
            empty("No speaker")
          )}
        </div>
      </div>
    )
  }

  if (stageState.layout === "screen_speaker") return renderScreenSpeaker()
  if (stageState.layout === "solo") return renderSolo()
  return renderGrid()
}

/* =========================
   MAIN PLAYER
========================= */

export default function StagePlayer({ slug }: { slug: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [stageState, setStageState] = useState<PublicStageState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading] = useState("Loading live stage...")

  async function loadState() {
    const res = await fetch(`/api/events/${slug}/live/state`, { cache: "no-store" })
    const data = await res.json().catch((): null => null)

    if (!res.ok) throw new Error(data?.error || "Failed to load state")
    setStageState(data?.state ?? null)
  }

  async function loadToken() {
    const res = await fetch(`/api/events/${slug}/live/audience-token`, { method: "POST" })
    const data = await res.json().catch((): null => null)

    if (!res.ok || !data?.token) {
      throw new Error(data?.error || "Failed token")
    }

    setToken(data.token)
    setServerUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL || "")
  }

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        await loadState()
        if (!mounted) return
        await loadToken()
      } catch (e: any) {
        setError(e.message)
      }
    }

    void boot()

    return () => {
      mounted = false
    }
  }, [slug])

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadState().catch(() => {})
    }, 3000)

    return () => window.clearInterval(id)
  }, [slug])

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>
  }

  if (!stageState) {
    return <div className="p-6 text-white/60">{loading}</div>
  }

  if (!stageState.is_live) {
    return (
      <div className="p-10 text-center text-white">
        <div className="text-sm text-white/40">Live Stage</div>
        <div className="mt-2 text-2xl font-semibold">Starting soon</div>
      </div>
    )
  }

  if (!token || !serverUrl) {
    return <div className="p-6 text-white/60">Connecting...</div>
  }

  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio>
      <RoomAudioRenderer />

      <AudienceStageTracks
        stageState={stageState}
        autoDirector={stageState.auto_director_enabled}
      />
    </LiveKitRoom>
  )
}