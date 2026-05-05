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

type ProgramSourceMessage = {
  mode: "cut" | "auto"
  sourceType: "camera" | "screen" | "media" | "empty"
  participantIdentity: string | null
  screenShareParticipantIdentity: string | null
  screenShareTrackId: string | null
  mediaUrl?: string | null
  mediaType?: "image" | "video" | null
  mediaLabel?: string | null
  layout: string | null
  isLive: boolean
  updatedAt: number
}

/* =========================
   TRACK RESOLUTION ENGINE
========================= */

function AudienceStageTracks({
  stageState,
  autoDirector,
  programSource,
}: {
  stageState: PublicStageState
  autoDirector: boolean
  programSource: ProgramSourceMessage | null
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

  function findCameraTrackByIdentity(identity?: string | null): TrackReference | null {
    if (!identity) return null

    return (
      cameraTracks.find(
        (trackRef): trackRef is TrackReference =>
          isTrackReference(trackRef) && trackRef.participant.identity === identity
      ) || null
    )
  }

  function findScreenTrackBySource(source?: {
    identity?: string | null
    trackId?: string | null
  }): TrackReference | null {
    if (!source?.identity && !source?.trackId) return null

    return (
      screenTracks.find((trackRef): trackRef is TrackReference => {
        if (!isTrackReference(trackRef)) return false

        if (source.trackId && trackRef.publication.trackSid === source.trackId) {
          return true
        }

        return Boolean(source.identity && trackRef.participant.identity === source.identity)
      }) || null
    )
  }

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

    if (programSource?.sourceType === "camera" && programSource.participantIdentity) {
      const programCamera = findCameraTrackByIdentity(programSource.participantIdentity)
      if (programCamera) return programCamera
    }

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

    if (programSource?.sourceType === "screen") {
      const programScreen = findScreenTrackBySource({
        identity: programSource.screenShareParticipantIdentity,
        trackId: programSource.screenShareTrackId,
      })
      if (programScreen) return programScreen
    }

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

    if (programSource?.participantIdentity) {
      const programSpeaker = findCameraTrackByIdentity(programSource.participantIdentity)
      if (programSpeaker) return programSpeaker
    }

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

  function renderMediaBlock() {
    if (!programSource?.mediaUrl) return empty("Waiting for media…")

    const label = programSource.mediaLabel || "Program Media"

    if (programSource.mediaType === "video") {
      return (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
          <video
            src={programSource.mediaUrl}
            className="h-full w-full object-contain"
            autoPlay
            muted
            playsInline
            controls={false}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.55))]" />
          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/55 backdrop-blur">
            {label}
          </div>
        </div>
      )
    }

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <img
          src={programSource.mediaUrl}
          alt={label}
          className="h-full w-full object-contain"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.55))]" />
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/55 backdrop-blur">
          {label}
        </div>
      </div>
    )
  }

function renderSolo() {
  const cam = pickPrimaryCamera()
  if (!cam) return empty("Waiting for speaker…")

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-black">
      <VideoTrack
        trackRef={cam}
        className="h-full w-full object-cover"
      />

      {/* subtle cinematic vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.65))]" />
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

  if (programSource?.sourceType === "media") return renderMediaBlock()
  if (programSource?.sourceType === "screen") return renderScreenSpeaker()
  if (programSource?.sourceType === "camera") return renderSolo()

  if (stageState.layout === "screen_speaker") return renderScreenSpeaker()
  if (stageState.layout === "solo") return renderSolo()
  return renderGrid()
}

/* =========================
   MAIN PLAYER
========================= */

export default function StagePlayer({ slug, sessionId }: { slug: string; sessionId?: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [stageState, setStageState] = useState<PublicStageState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading] = useState("Loading live stage...")
  const [programSource, setProgramSource] = useState<ProgramSourceMessage | null>(null)

  async function loadState() {
    const res = await fetch(`/api/events/${slug}/live/state`, { cache: "no-store" })
    const data = await res.json().catch((): null => null)

    if (!res.ok) throw new Error(data?.error || "Failed to load state")
    setStageState(data?.state ?? null)
  }

  async function loadToken() {
    const res = await fetch(`/api/events/${slug}/live/audience-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
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

  useEffect(() => {
    const channelKey = sessionId ? `jupiter:program-source:${sessionId}` : null
    const fallbackPrefix = "jupiter:program-source:"

    function parseProgramSource(raw: string | null) {
      if (!raw) return null
      try {
        return JSON.parse(raw) as ProgramSourceMessage
      } catch (_err) {
        return null
      }
    }

    function readLatestStoredSource() {
      if (channelKey) {
        const exact = parseProgramSource(window.localStorage.getItem(channelKey))
        if (exact) {
          setProgramSource(exact)
          return
        }
      }

      let latest: ProgramSourceMessage | null = null

      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i)
        if (!key?.startsWith(fallbackPrefix)) continue

        const candidate = parseProgramSource(window.localStorage.getItem(key))
        if (!candidate) continue

        if (!latest || candidate.updatedAt > latest.updatedAt) {
          latest = candidate
        }
      }

      if (latest) setProgramSource(latest)
    }

    readLatestStoredSource()

    const channel = channelKey ? new BroadcastChannel(channelKey) : null
    if (channel) {
      channel.onmessage = (event) => {
        setProgramSource(event.data as ProgramSourceMessage)
      }
    }

    function onStorage(event: StorageEvent) {
      if (!event.key?.startsWith(fallbackPrefix) || !event.newValue) return
      const next = parseProgramSource(event.newValue)
      if (next) setProgramSource(next)
    }

    window.addEventListener("storage", onStorage)
    return () => {
      channel?.close()
      window.removeEventListener("storage", onStorage)
    }
  }, [sessionId])

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
        <div className="mt-2 text-2xl font-semibold">
          {stageState.headline || "Starting soon"}
        </div>
        {stageState.message ? (
          <div className="mt-3 text-sm text-white/60 max-w-xl mx-auto">
            {stageState.message}
          </div>
        ) : null}
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex aspect-video items-center justify-center text-white/50">
        Connecting to live stage…
      </div>
    )
  }

  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio>
      <RoomAudioRenderer />

      <AudienceStageTracks
        stageState={stageState}
        autoDirector={stageState.auto_director_enabled}
        programSource={programSource}
      />
    </LiveKitRoom>
  )
}