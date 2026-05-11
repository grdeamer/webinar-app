"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
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
  transitionType?: "none" | "fade" | "warp" | "curtain"
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
  programBlocks?: {
    id: string
    type: string
    src: string | null
    label: string | null
    x: number
    y: number
    width: number
    height: number
    zIndex: number
    opacity: number
  }[]
}

type RenderableProgramBlock = {
  id: string
  type: "camera" | "screen" | "image" | "video" | "pdf" | "graphic"
  rawType: string
  src: string | null
  label: string | null
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  opacity: number
}


function clampPercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(100, value))
}

function inferProgramBlockType(rawType: string, src: string | null): RenderableProgramBlock["type"] {
  const type = rawType.toLowerCase().replace(/[-_\s]+/g, "_")

  if (["camera", "cam", "participant", "presenter", "speaker", "video_track"].includes(type)) {
    return "camera"
  }

  if (["screen", "screenshare", "screen_share", "share", "screen_track"].includes(type)) {
    return "screen"
  }

  if (["image", "img", "logo", "bug", "lower_third_image"].includes(type)) {
    return "image"
  }

  if (["video", "movie", "clip", "mp4", "asset_video"].includes(type)) {
    return "video"
  }

  if (["pdf", "document", "deck", "slide_deck"].includes(type)) {
    return "pdf"
  }

  if (["media", "asset", "file", "upload"].includes(type)) {
    if (src && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)) return "video"
    if (src && /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(src)) return "image"
    if (src && /\.pdf(\?|#|$)/i.test(src)) return "pdf"
  }

  return "graphic"
}

function normalizeProgramBlock(block: ProgramSourceMessage["programBlocks"] extends (infer T)[] ? T : never): RenderableProgramBlock | null {
  if (!block?.id) return null

  const rawType = block.type || "graphic"
  const src = block.src || null
  const normalizedType = inferProgramBlockType(rawType, src)

  return {
    id: block.id,
    type: normalizedType,
    rawType,
    src,
    label: block.label,
    x: clampPercent(block.x, 0),
    y: clampPercent(block.y, 0),
    width: clampPercent(block.width, 100),
    height: clampPercent(block.height, 100),
    zIndex: Number.isFinite(block.zIndex) ? block.zIndex : 1,
    opacity: Number.isFinite(block.opacity) ? Math.max(0, Math.min(1, block.opacity)) : 1,
  }
}

function getProgramBlockStyle(block: RenderableProgramBlock): React.CSSProperties {
  return {
    position: "absolute",
    left: `${block.x}%`,
    top: `${block.y}%`,
    width: `${block.width}%`,
    height: `${block.height}%`,
    zIndex: block.zIndex,
    opacity: block.opacity,
  }
}

function ProgramMediaBlock({
  block,
  cameraTrack,
  screenTrack,
}: {
  block: RenderableProgramBlock
  cameraTrack?: TrackReference | null
  screenTrack?: TrackReference | null
}) {
  const style = getProgramBlockStyle(block)
  const label = block.label || block.type

  if (block.type === "camera") {
    if (!cameraTrack) return null

    return (
      <div style={style} className="overflow-hidden bg-black">
        <VideoTrack trackRef={cameraTrack} className="h-full w-full object-cover" />
      </div>
    )
  }

  if (block.type === "screen") {
    if (!screenTrack) return null

    return (
      <div style={style} className="overflow-hidden bg-black">
        <VideoTrack trackRef={screenTrack} className="h-full w-full object-contain" />
      </div>
    )
  }

  if (block.type === "image" && block.src) {
    return (
      <img
        src={block.src}
        alt={label}
        style={style}
        className="h-full w-full object-contain"
      />
    )
  }

  if (block.type === "video" && block.src) {
    return (
      <video
        src={block.src}
        style={style}
        className="h-full w-full object-contain"
        autoPlay
        muted
        loop
        playsInline
      />
    )
  }

  if (block.type === "pdf" && block.src) {
    return (
      <iframe
        src={block.src}
        style={style}
        className="h-full w-full bg-white"
        title={label}
      />
    )
  }

  return null
}

function AttendeeProgramTransition({
  programSource,
  children,
}: {
  programSource: ProgramSourceMessage | null
  children: ReactNode
}) {
  const [showCutFlash, setShowCutFlash] = useState(false)

  useEffect(() => {
    if (!programSource) return

    setShowCutFlash(true)

    const timeout = window.setTimeout(
      () => setShowCutFlash(false),
      programSource.mode === "cut" ? 180 : 360
    )

    return () => window.clearTimeout(timeout)
  }, [programSource?.updatedAt, programSource?.mode])

  const transitionClass =
    programSource?.transitionType === "warp"
      ? "scale-[1.014] saturate-[1.08]"
      : programSource?.transitionType === "fade"
        ? "opacity-95"
        : programSource?.transitionType === "curtain"
          ? "brightness-90 contrast-110"
          : ""

  const transitionLabel =
    programSource?.mode === "auto"
      ? programSource.transitionType === "warp"
        ? "Signal Warp"
        : programSource.transitionType === "curtain"
          ? "Stage Reveal"
          : "Soft Dissolve"
      : "Live Cut"

  return (
    <div
      className={[
        "relative overflow-hidden transition-all duration-500 ease-out",
        transitionClass,
      ].join(" ")}
    >
      {showCutFlash ? (
        <>
          <div
            className={[
              "pointer-events-none absolute inset-0 z-40 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.82),rgba(125,211,252,0.22)_34%,transparent_72%)] mix-blend-screen",
              programSource?.mode === "cut" ? "animate-pulse" : "",
            ].join(" ")}
          />
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-black/[0.03] backdrop-blur-[1px]">
            <div className="rounded-full border border-white/35 bg-white/92 px-5 py-2 text-[9px] font-black uppercase tracking-[0.28em] text-black shadow-[0_0_70px_rgba(255,255,255,0.52)]">
              {transitionLabel}
            </div>
          </div>
        </>
      ) : null}
      {children}
    </div>
  )
}

function AttendeeBroadcastFrame({
  label = "Main Stage",
  live = true,
  children,
}: {
  label?: string
  live?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(248,113,113,0.07),transparent_30%),#020617] p-1.5 shadow-[0_34px_110px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.075)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.8)_0px,rgba(255,255,255,0.8)_1px,transparent_1px,transparent_10px)]" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/42 to-transparent" />

      <div className="relative overflow-hidden rounded-[24px] bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_54%,rgba(0,0,0,0.62)),linear-gradient(180deg,rgba(255,255,255,0.055),transparent_20%,transparent_80%,rgba(255,255,255,0.035))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-24 bg-[linear-gradient(105deg,rgba(255,255,255,0.14),transparent_42%)] opacity-40" />
        <div className="pointer-events-none absolute inset-0 z-30 opacity-[0.055] [background:repeating-linear-gradient(0deg,rgba(255,255,255,0.9)_0px,rgba(255,255,255,0.9)_1px,transparent_1px,transparent_5px)]" />

        <div className="pointer-events-none absolute left-3 top-3 z-40 flex items-center gap-2 rounded-full border border-red-300/28 bg-black/62 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-50 shadow-[0_0_24px_rgba(248,113,113,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
          <span
            className={[
              "h-2 w-2 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.85)]",
              live ? "animate-pulse" : "opacity-40",
            ].join(" ")}
          />
          {live ? "Live" : "Standby"}
        </div>

        <div className="pointer-events-none absolute right-3 top-3 z-40 rounded-full border border-white/10 bg-black/62 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/58 shadow-[0_0_18px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md">
          {label}
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 z-40 rounded-full border border-sky-300/14 bg-sky-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-sky-100/60 backdrop-blur-md">
          Jupiter Program Feed
        </div>

        {children}
      </div>
    </div>
  )
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
      <div className="flex aspect-video items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08),transparent_48%),rgba(0,0,0,0.48)] text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="rounded-full border border-white/10 bg-black/42 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/45 backdrop-blur-md">
          {msg}
        </div>
      </div>
    )
  }

  function renderProgramBlocks() {
    const blocks = programSource?.programBlocks
    if (!blocks || blocks.length === 0) return empty("Waiting for program…")
    const normalizedBlocks = blocks
      .map(normalizeProgramBlock)
      .filter((block): block is RenderableProgramBlock => Boolean(block))

    if (!normalizedBlocks.length) return empty("Waiting for program…")

    const programCameraTrack =
      programSource?.participantIdentity
        ? findCameraTrackByIdentity(programSource.participantIdentity)
        : pickPrimaryCamera()

    const programScreenTrack = findScreenTrackBySource({
      identity: programSource?.screenShareParticipantIdentity,
      trackId: programSource?.screenShareTrackId,
    }) || pickScreenTrack()

    return (
      <AttendeeProgramTransition programSource={programSource}>
        <AttendeeBroadcastFrame label="Program" live={programSource?.isLive ?? stageState.is_live}>
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {normalizedBlocks.map((block) => (
              <ProgramMediaBlock
                key={block.id}
                block={block}
                cameraTrack={programCameraTrack}
                screenTrack={programScreenTrack}
              />
            ))}
          </div>
        </AttendeeBroadcastFrame>
      </AttendeeProgramTransition>
    )
  }

  function renderMediaBlock() {
    if (!programSource?.mediaUrl) return empty("Waiting for media…")

    const label = programSource.mediaLabel || "Program Media"
    if (programSource.mediaType === "video") {
      const videoBlock: RenderableProgramBlock = {
        id: "program-media-video",
        type: "video",
        rawType: "video",
        src: programSource.mediaUrl,
        label,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        zIndex: 1,
        opacity: 1,
      }

      return (
        <AttendeeProgramTransition programSource={programSource}>
          <AttendeeBroadcastFrame label={label} live={programSource?.isLive ?? stageState.is_live}>
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              <ProgramMediaBlock block={videoBlock} />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.55))]" />
            </div>
          </AttendeeBroadcastFrame>
        </AttendeeProgramTransition>
      )
    }

    const imageBlock: RenderableProgramBlock = {
      id: "program-media-image",
      type: "image",
      rawType: "image",
      src: programSource.mediaUrl,
      label,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      zIndex: 1,
      opacity: 1,
    }

    return (
      <AttendeeProgramTransition programSource={programSource}>
        <AttendeeBroadcastFrame label={label} live={programSource?.isLive ?? stageState.is_live}>
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            <ProgramMediaBlock block={imageBlock} />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.55))]" />
          </div>
        </AttendeeBroadcastFrame>
      </AttendeeProgramTransition>
    )
  }

  function renderSolo() {
    const cam = pickPrimaryCamera()
    if (!cam) return empty("Waiting for speaker…")

    return (
      <AttendeeProgramTransition programSource={programSource}>
        <AttendeeBroadcastFrame label="Camera" live={programSource?.isLive ?? stageState.is_live}>
          <div className="relative aspect-video w-full bg-black">
            <VideoTrack trackRef={cam} className="h-full w-full object-cover" />

            {/* subtle cinematic vignette */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.65))]" />
          </div>
        </AttendeeBroadcastFrame>
      </AttendeeProgramTransition>
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
      <AttendeeProgramTransition programSource={programSource}>
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
      </AttendeeProgramTransition>
    )
  }

  if (programSource?.programBlocks?.length) return renderProgramBlocks()
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
  const hasRenderableProgramSource = Boolean(
    programSource?.programBlocks?.length ||
      programSource?.sourceType === "media" ||
      programSource?.sourceType === "camera" ||
      programSource?.sourceType === "screen"
  )

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
  }, [slug, sessionId])

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

  if (!stageState.is_live && !hasRenderableProgramSource) {
    return (
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(0,0,0,1))] p-10 text-center text-white shadow-[0_30px_100px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.8)_0px,rgba(255,255,255,0.8)_1px,transparent_1px,transparent_10px)]" />
        <div className="relative z-10">
          <div className="mx-auto inline-flex rounded-full border border-sky-300/14 bg-sky-400/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/58">
            Live Stage
          </div>
          <div className="mt-4 text-3xl font-black tracking-tight">
            {stageState.headline || "Starting soon"}
          </div>
          {stageState.message ? (
            <div className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60">
              {stageState.message}
            </div>
          ) : null}
          <div className="mx-auto mt-6 h-1.5 max-w-sm overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-sky-300 via-violet-300 to-emerald-300 shadow-[0_0_22px_rgba(125,211,252,0.32)]" />
          </div>
        </div>
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.10),transparent_48%),rgba(0,0,0,0.48)] text-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="rounded-full border border-white/10 bg-black/42 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/50 backdrop-blur-md">
          Connecting to live stage…
        </div>
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