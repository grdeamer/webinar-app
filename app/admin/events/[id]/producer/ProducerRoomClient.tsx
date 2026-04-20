"use client"

import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react"
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react"
import type { JSX } from "react"

import AudienceOriginCue from "@/components/live/AudienceOriginCue"
import useProducerRoomApi from "./useProducerRoomApi"
import useProducerBlocks, { type PreviewBlock } from "./useProducerBlocks"
import StageVideoPreview from "./StageVideoPreview"
import ParticipantCard from "./ParticipantCard"
import SwitcherPanel from "./SwitcherPanel"


import ProducerBackstagePanel from "@/components/live/ProducerBackstagePanel"
import ProducerBlockInspector from "@/components/live/ProducerBlockInspector"
import ProducerMediaToolbar from "@/components/live/ProducerMediaToolbar"
import ProducerScenePanel from "@/components/live/ProducerScenePanel"
import ProducerSwitcherPanel from "@/components/live/ProducerSwitcherPanel"





type ProducerParticipant = {
  identity: string
  name: string
  joinedAt: string | null
  state: string | number | null
  isPublisher: boolean
  metadata?: Record<string, unknown>
  cameraEnabled: boolean
  micEnabled: boolean
  screenShareEnabled: boolean
  tracks: Array<{
    sid: string
    name: string
    source: string | number
    muted?: boolean
  }>
}

type StageState = {
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

type SceneSnapshot = {
  id: string
  name: string
  stageState: StageState | null
  previewBlocks: PreviewBlock[]
}

function LiveBadge({ live }: { live: boolean }): JSX.Element {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
        live
          ? "border-red-400/25 bg-red-500/15 text-red-200 shadow-[0_0_24px_rgba(239,68,68,0.18)]"
          : "border-white/10 bg-white/5 text-white/55"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          live ? "animate-pulse bg-red-400" : "bg-white/30"
        }`}
      />
      {live ? "Live" : "Off Air"}
    </div>
  )
}

function MonitorHeader({
  title,
  subtitle,
  badge,
  tone = "neutral",
}: {
  title: string
  subtitle: string
  badge?: ReactNode
  tone?: "neutral" | "preview" | "program"
}): JSX.Element {
  const toneClass =
    tone === "program"
      ? "text-red-200/80"
      : tone === "preview"
        ? "text-sky-200/80"
        : "text-white/40"

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <div className={`text-xs uppercase tracking-[0.2em] ${toneClass}`}>{title}</div>
        <div className="text-sm text-white/55">{subtitle}</div>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  )
}

export default function ProducerRoomClient({
  eventId,
  sessionId,
}: {
  eventId: string
  sessionId: string
}) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [participants, setParticipants] = useState<ProducerParticipant[]>([])
  const [stageState, setStageState] = useState<StageState | null>(null)
  const [loadingText, setLoadingText] = useState("Connecting producer...")
  const [error, setError] = useState<string | null>(null)

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("")
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("")
  const [deviceAccessReady, setDeviceAccessReady] = useState(false)

  const [scenes, setScenes] = useState<any[]>([])
  const [sceneName, setSceneName] = useState("")
  const [sceneBusy, setSceneBusy] = useState(false)
  const [localSceneSnapshots, setLocalSceneSnapshots] = useState<SceneSnapshot[]>([])

  const [autoDirectorEnabled, setAutoDirectorEnabled] = useState(true)
  const [takeBusy, setTakeBusy] = useState(false)
  const [programState, setProgramState] = useState<StageState | null>(null)

  const pdfInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const producerPreviewVideoRef = useRef<HTMLVideoElement | null>(null)
  const localPreviewStreamRef = useRef<MediaStream | null>(null)

  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionFromState, setTransitionFromState] = useState<StageState | null>(null)
  const [transitionFromBlocks, setTransitionFromBlocks] = useState<PreviewBlock[]>([])
  const [transitionFadingOut, setTransitionFadingOut] = useState(false)

  const [showAudienceCue, setShowAudienceCue] = useState(false)
  const [audienceCueRegion, setAudienceCueRegion] = useState("Europe")
  const [audienceCueMoonMode, setAudienceCueMoonMode] = useState(false)
  const [audienceCueQuestionLabel, setAudienceCueQuestionLabel] = useState(
    "How are outcomes differing across regions?"
  )
  const audienceCueTimeoutRef = useRef<number | null>(null)

  const producerScopeLabel = useMemo(() => {
    return sessionId ? `Session ${sessionId.slice(0, 8)}` : "Session"
  }, [sessionId])

  const api = useProducerRoomApi(eventId, sessionId)

  const {
    previewBlocks,
    setPreviewBlocks,
    programBlocks,
    setProgramBlocks,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    addTestTextBlock,
    addTestVideoBlock,
    addTestPdfBlock,
    addTestImageBlock,
    deleteSelectedBlock,
    duplicateSelectedBlock,
    bringSelectedBlockToFront,
    updateSelectedTextBlockContent,
    updateSelectedBlockSize,
    updateSelectedBlockOpacity,
    toggleSelectedBlockHidden,
    updateSelectedBlockPosition,
    updateSelectedBlockLabel,
    updateSelectedBlockSrc,
    handlePdfUpload,
    handleVideoUpload,
    handleImageUpload,
    startDraggingBlock,
    startResizingBlock,
    onPreviewCanvasMouseMove,
    stopDraggingBlock,
  } = useProducerBlocks()

  const stopLocalPreviewStream = useCallback(() => {
    if (!localPreviewStreamRef.current) return

    localPreviewStreamRef.current.getTracks().forEach((track) => track.stop())
    localPreviewStreamRef.current = null

    if (producerPreviewVideoRef.current) {
      producerPreviewVideoRef.current.srcObject = null
    }
  }, [])

  function getScreenTrackSid(participant: ProducerParticipant) {
    const track = participant.tracks.find((t) => t.source === 3 || t.source === "SCREEN_SHARE")
    return track?.sid ?? null
  }

  async function loadToken() {
    const data = await api.loadToken()
    setToken(data.token)
    setServerUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL || "")
  }

  async function loadParticipants() {
    const data = await api.loadParticipants()
    setParticipants(Array.isArray(data?.participants) ? data.participants : [])
  }

  async function loadProgramState() {
    const data = await api.loadProgramState()
    setProgramState(data?.state ?? null)
  }

  async function loadStageState() {
    const data = await api.loadStageState()
    setStageState(data?.state ?? null)
  }

  async function loadScenes() {
    const data = await api.loadScenes()
    setScenes(Array.isArray(data?.scenes) ? data.scenes : [])
  }

  const loadMediaDevices = useCallback(async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      const devices = await navigator.mediaDevices.enumerateDevices()

      tempStream.getTracks().forEach((track) => track.stop())

      const videos = devices.filter((device) => device.kind === "videoinput")
      const audios = devices.filter((device) => device.kind === "audioinput")

      setVideoDevices(videos)
      setAudioDevices(audios)

      setSelectedVideoDeviceId((prev) =>
        prev && videos.some((device) => device.deviceId === prev) ? prev : videos[0]?.deviceId || ""
      )

      setSelectedAudioDeviceId((prev) =>
        prev && audios.some((device) => device.deviceId === prev) ? prev : audios[0]?.deviceId || ""
      )

      setDeviceAccessReady(videos.length > 0 || audios.length > 0)
    } catch (err) {
      console.error("Failed to load media devices", err)
      setDeviceAccessReady(false)
      setVideoDevices([])
      setAudioDevices([])
      setSelectedVideoDeviceId("")
      setSelectedAudioDeviceId("")
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadParticipants(), loadStageState(), loadProgramState(), loadScenes()])
  }, [])

  async function addToStage(identity: string) {
    const data = await api.addToStage(identity)
    setStageState(data.state)
  }

  async function removeFromStage(identity: string) {
    const data = await api.removeFromStage(identity)
    setStageState(data.state)
  }

  async function pinParticipant(identity: string) {
    const data = await api.pinParticipant(identity)
    setStageState(data.state)
  }

  async function unpinParticipant() {
    const data = await api.unpinParticipant()
    setStageState(data.state)
  }

  async function setPrimaryParticipant(identity: string) {
    const data = await api.setPrimaryParticipant(identity)
    setStageState(data.state)
  }

  async function clearPrimaryParticipant() {
    const data = await api.clearPrimaryParticipant()
    setStageState(data.state)
  }

  async function saveScene() {
    if (!sceneName.trim()) {
      setError("Scene name required")
      return
    }

    try {
      setSceneBusy(true)

      const data = await api.saveScene(sceneName)
      const savedSceneId = String(data?.scene?.id ?? crypto.randomUUID())

      setLocalSceneSnapshots((prev) => {
        const next = prev.filter((s) => s.id !== savedSceneId)
        next.push({
          id: savedSceneId,
          name: sceneName,
          stageState: stageState ? { ...stageState } : null,
          previewBlocks: previewBlocks.map((b) => ({ ...b })),
        })
        return next
      })

      setSceneName("")
      await loadScenes()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSceneBusy(false)
    }
  }

  async function applyScene(sceneId: string) {
    try {
      setSceneBusy(true)

      const data = await api.applyScene(sceneId)
      setStageState(data.state)

      const localSnapshot = localSceneSnapshots.find((s) => s.id === sceneId)
      if (localSnapshot) {
        setPreviewBlocks(localSnapshot.previewBlocks.map((b) => ({ ...b })))
        setSelectedBlockId(null)
      }

      await refreshAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSceneBusy(false)
    }
  }

  async function setAutoDirector(enabled: boolean) {
    const data = await api.setAutoDirector(enabled)
    setStageState(data.state)
    setAutoDirectorEnabled(Boolean(data?.state?.auto_director_enabled))
  }

  async function goLive() {
    const data = await api.goLive()
    setStageState(data.state)
  }

  async function goOffAir() {
    const data = await api.goOffAir()
    setStageState(data.state)
  }

  async function setLayout(layout: "solo" | "grid" | "screen_speaker") {
    const data = await api.setLayout(layout)
    setStageState(data.state)
  }

  async function setScreenShare(participantId: string, trackId: string) {
    const data = await api.setScreenShare(participantId, trackId)
    setStageState(data.state)
  }

  async function clearScreenShare() {
    const data = await api.clearScreenShare()
    setStageState(data.state)
  }

  async function takeProgram() {
    const previousProgramState = programState ? { ...programState } : null
    const previousProgramBlocks = programBlocks.map((block) => ({ ...block }))

    const data = await api.takeProgram()

    setTransitionFromState(previousProgramState)
    setTransitionFromBlocks(previousProgramBlocks)
    setTransitionFadingOut(false)
    setIsTransitioning(true)

    setProgramState(data?.state ?? null)
    setProgramBlocks(previewBlocks.map((block) => ({ ...block })))

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setTransitionFadingOut(true)
      })
    })

    window.setTimeout(() => {
      setIsTransitioning(false)
      setTransitionFromState(null)
      setTransitionFromBlocks([])
      setTransitionFadingOut(false)
    }, 450)

    return data?.state ?? null
  }

  function triggerAudienceCue(options?: {
    region?: string
    moonMode?: boolean
    questionLabel?: string
    durationMs?: number
  }) {
    if (audienceCueTimeoutRef.current) {
      window.clearTimeout(audienceCueTimeoutRef.current)
    }

    setAudienceCueRegion(options?.region ?? "Europe")
    setAudienceCueMoonMode(options?.moonMode ?? false)
    setAudienceCueQuestionLabel(
      options?.questionLabel ?? "How are outcomes differing across regions?"
    )
    setShowAudienceCue(true)

    audienceCueTimeoutRef.current = window.setTimeout(() => {
      setShowAudienceCue(false)
      audienceCueTimeoutRef.current = null
    }, options?.durationMs ?? 5000)
  }

  function renderBlockContent(block: PreviewBlock) {
    if (block.type === "text") {
      return <div className="p-2 text-sm">{block.content}</div>
    }

    if (block.type === "video" && block.src) {
      return <video src={block.src} controls className="h-full w-full object-cover" />
    }

    if (block.type === "image" && block.src) {
      return (
        <img
          src={block.src}
          className="h-full w-full object-contain"
          alt={block.label || "Image"}
        />
      )
    }

    if (block.type === "pdf" && block.src) {
      return (
        <iframe
          src={block.src}
          className="h-full w-full bg-white"
          title={block.label || "PDF"}
        />
      )
    }

    return null
  }

  function renderPlacedBlocks(
    blocks: PreviewBlock[],
    opts?: {
      selectable?: boolean
      showChrome?: boolean
      selectedBlockId?: string | null
    }
  ) {
    return blocks
      .filter((block) => !block.hidden)
      .map((block) => (
        <div
          key={block.id}
          onClick={
            opts?.selectable
              ? (e) => {
                  e.stopPropagation()
                  setSelectedBlockId(block.id)
                }
              : undefined
          }
          className={`absolute overflow-hidden rounded-lg ${
            opts?.selectable
              ? selectedBlockId === block.id
                ? "border-2 border-sky-400 bg-white/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
                : "border border-white/20 bg-white/10"
              : "border border-white/10 bg-white/10"
          }`}
          style={{
            left: block.x,
            top: block.y,
            width: block.width,
            height: block.height,
            zIndex: block.zIndex,
            opacity: block.opacity ?? 1,
          }}
        >
          {opts?.showChrome ? (
            <div
              onMouseDown={
                opts?.selectable
                  ? (e) => {
                      e.stopPropagation()
                      setSelectedBlockId(block.id)
                      startDraggingBlock(e, block.id)
                    }
                  : undefined
              }
              className={`flex items-center justify-between rounded-t-lg border-b border-white/10 bg-black/40 px-2 py-1 text-[11px] font-semibold text-white/70 ${
                opts?.selectable ? "cursor-move" : "pointer-events-none"
              }`}
            >
              <span>{block.label || block.type}</span>
              <span className="text-white/35">{opts?.selectable ? "Drag" : "Live"}</span>
            </div>
          ) : null}

          <div
            className={
              opts?.showChrome
                ? "h-[calc(100%-28px)] overflow-hidden rounded-b-lg"
                : "h-full w-full overflow-hidden"
            }
          >
            {renderBlockContent(block)}
          </div>

          {opts?.selectable && opts?.showChrome ? (
            <div
              onMouseDown={(e) => startResizingBlock(e, block.id)}
              className="absolute bottom-1 right-1 h-3 w-3 cursor-se-resize rounded-sm bg-white/70"
              title="Resize block"
            />
          ) : null}
        </div>
      ))
  }

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        setError(null)
        setLoadingText("Creating producer token...")
        await loadToken()
        if (!mounted) return

        await loadMediaDevices()
        if (!mounted) return

        setLoadingText("Loading room state...")
        await refreshAll()
      } catch (err: any) {
        if (!mounted) return
        setError(err?.message || "Failed to load producer room")
      }
    }

    void boot()

    return () => {
      mounted = false
    }
  }, [eventId, sessionId, loadMediaDevices, refreshAll])

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshAll().catch(() => {})
    }, 3000)

    return () => window.clearInterval(id)
  }, [refreshAll])

  useEffect(() => {
    if (typeof stageState?.auto_director_enabled === "boolean") {
      setAutoDirectorEnabled(stageState.auto_director_enabled)
    }
  }, [stageState?.auto_director_enabled])

  useEffect(() => {
    if (!deviceAccessReady) return

    let cancelled = false

    async function start() {
      try {
        stopLocalPreviewStream()

        const videoExists =
          !selectedVideoDeviceId ||
          videoDevices.some((device) => device.deviceId === selectedVideoDeviceId)

        const audioExists =
          !selectedAudioDeviceId ||
          audioDevices.some((device) => device.deviceId === selectedAudioDeviceId)

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoExists
            ? selectedVideoDeviceId
              ? { deviceId: { exact: selectedVideoDeviceId } }
              : true
            : true,
          audio: audioExists
            ? selectedAudioDeviceId
              ? { deviceId: { exact: selectedAudioDeviceId } }
              : true
            : true,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        localPreviewStreamRef.current = stream

        if (producerPreviewVideoRef.current) {
          producerPreviewVideoRef.current.srcObject = stream
          producerPreviewVideoRef.current.muted = true
          producerPreviewVideoRef.current.playsInline = true
          await producerPreviewVideoRef.current.play().catch(() => {})
        }
      } catch (err) {
        console.error("Preview start failed", err)
      }
    }

    void start()

    return () => {
      cancelled = true
      stopLocalPreviewStream()
    }
  }, [
    deviceAccessReady,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    videoDevices,
    audioDevices,
    stopLocalPreviewStream,
  ])

  const stageIds = useMemo(() => new Set(stageState?.stage_participant_ids || []), [stageState])
  const onStageParticipants = participants.filter((p) => stageIds.has(p.identity))

  const firstOnStageScreenShare = onStageParticipants.find((p) => {
    if (!p.screenShareEnabled) return false

    const screenTrack = p.tracks.find((t) => t.source === 3 || t.source === "SCREEN_SHARE")
    return Boolean(screenTrack?.sid)
  })

  const selectedScreenStillExists = onStageParticipants.some((p) => {
    if (p.identity !== stageState?.screen_share_participant_id) return false

    return p.tracks.some(
      (t) =>
        (t.source === 3 || t.source === "SCREEN_SHARE") &&
        t.sid === stageState?.screen_share_track_id
    )
  })

  const previewProgramDifferent =
    JSON.stringify({
      layout: stageState?.layout ?? null,
      stage_participant_ids: stageState?.stage_participant_ids ?? [],
      primary_participant_id: stageState?.primary_participant_id ?? null,
      pinned_participant_id: stageState?.pinned_participant_id ?? null,
      screen_share_participant_id: stageState?.screen_share_participant_id ?? null,
      screen_share_track_id: stageState?.screen_share_track_id ?? null,
      is_live: stageState?.is_live ?? false,
      blocks: previewBlocks,
    }) !==
    JSON.stringify({
      layout: programState?.layout ?? null,
      stage_participant_ids: programState?.stage_participant_ids ?? [],
      primary_participant_id: programState?.primary_participant_id ?? null,
      pinned_participant_id: programState?.pinned_participant_id ?? null,
      screen_share_participant_id: programState?.screen_share_participant_id ?? null,
      screen_share_track_id: programState?.screen_share_track_id ?? null,
      is_live: programState?.is_live ?? false,
      blocks: programBlocks,
    })

  useEffect(() => {
    if (!autoDirectorEnabled) return
    if (!stageState) return
    if (stageState.layout !== "screen_speaker") return
    if (stageState.screen_share_track_id) return
    if (!firstOnStageScreenShare) return

    const screenTrack = firstOnStageScreenShare.tracks.find(
      (t) => t.source === 3 || t.source === "SCREEN_SHARE"
    )

    if (!screenTrack?.sid) return

    void setScreenShare(firstOnStageScreenShare.identity, screenTrack.sid).catch(
      (_err: unknown): void => {}
    )
  }, [autoDirectorEnabled, stageState, firstOnStageScreenShare])

  useEffect(() => {
    if (!stageState?.screen_share_track_id) return
    if (selectedScreenStillExists) return

    void clearScreenShare().catch((_err: unknown): void => {})
  }, [stageState?.screen_share_track_id, selectedScreenStillExists])

  useEffect(() => {
    return () => {
      if (audienceCueTimeoutRef.current) {
        window.clearTimeout(audienceCueTimeoutRef.current)
      }
      stopLocalPreviewStream()
    }
  }, [stopLocalPreviewStream])

  if (error) {
    return <div className="p-8 text-red-400">{error}</div>
  }

  if (!token || !serverUrl) {
    return <div className="p-8 text-white">{loadingText}</div>
  }

  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio>
      <RoomAudioRenderer />

      <div className="flex min-h-screen flex-col bg-[#050816] text-white">
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handlePdfUpload}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoUpload}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

<div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.10),transparent_28%),linear-gradient(180deg,rgba(8,15,36,0.98),rgba(5,8,22,0.92))] px-8 py-6">
  <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-6">
    <div>
      <div className="text-[10px] uppercase tracking-[0.38em] text-sky-200/40">
        Jupiter Mission Control · {producerScopeLabel}
      </div>

      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
        {stageState?.headline || "Live Production"}
      </h1>

      <p className="mt-2 text-sm text-white/45">
        Broadcast switching, overlays, backstage control, and live direction.
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
        Layout: {stageState?.layout || "solo"}
      </span>

      <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
        Stage: {onStageParticipants.length}
      </span>

      <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">
        Blocks: {previewBlocks.length}
      </span>

      <LiveBadge live={Boolean(stageState?.is_live)} />
    </div>
  </div>
</div>

        <div className="flex-1 py-6">
          <div className="grid w-full gap-4 px-6 2xl:gap-5 xl:grid-cols-[minmax(0,2.35fr)_320px]">
            <div className="space-y-6">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Audience Origin Test
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      triggerAudienceCue({
                        region: "Europe",
                        moonMode: false,
                        questionLabel: "How are outcomes differing across regions?",
                      })
                    }
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Trigger Europe Cue
                  </button>

                  <button
                    onClick={() =>
                      triggerAudienceCue({
                        region: "North America",
                        moonMode: false,
                        questionLabel: "What trends are you seeing in North America?",
                      })
                    }
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Trigger North America Cue
                  </button>

                  <button
                    onClick={() =>
                      triggerAudienceCue({
                        region: "Mare Tranquillitatis",
                        moonMode: true,
                        questionLabel: "Moon base check-in: how is the signal holding?",
                      })
                    }
                    className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/15"
                  >
                    Trigger Moon Cue
                  </button>

                  <button
                    onClick={() => setShowAudienceCue(false)}
                    className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
                  >
                    Hide Cue
                  </button>
                </div>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,24,0.98),rgba(6,9,18,0.96))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                      Switcher
                    </div>
                    <div className="mt-1 text-lg font-semibold text-white">Preview → Program</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        void setLayout("solo").catch((e: unknown) =>
                          setError(e instanceof Error ? e.message : "Unexpected error")
                        )
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        stageState?.layout === "solo"
                          ? "bg-white text-black"
                          : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      Solo
                    </button>

                    <button
                      onClick={() =>
                        void setLayout("grid").catch((e: unknown) =>
                          setError(e instanceof Error ? e.message : "Unexpected error")
                        )
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        stageState?.layout === "grid"
                          ? "bg-white text-black"
                          : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      Grid
                    </button>

                    <button
                      onClick={() =>
                        void setLayout("screen_speaker").catch((e: unknown) =>
                          setError(e instanceof Error ? e.message : "Unexpected error")
                        )
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        stageState?.layout === "screen_speaker"
                          ? "bg-white text-black"
                          : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      Speaker + Screen
                    </button>

                    <button
                      onClick={() =>
                        void setAutoDirector(!autoDirectorEnabled).catch((e: unknown) =>
                          setError(e instanceof Error ? e.message : "Unexpected error")
                        )
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        autoDirectorEnabled
                          ? "bg-emerald-400 text-slate-950"
                          : "border border-white/15 bg-white/5 text-white"
                      }`}
                    >
                      {autoDirectorEnabled ? "Auto Director On" : "Auto Director Off"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="rounded-[28px] border border-sky-400/15 bg-[linear-gradient(180deg,rgba(10,18,42,0.96),rgba(5,8,22,0.98))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                    <MonitorHeader
                      title="Preview"
                      subtitle="What you are preparing"
                      tone="preview"
                      badge={
                        <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
                          {previewProgramDifferent ? "Changed" : "Ready"}
                        </span>
                      }
                    />

                    <div
                      className="relative h-[580px] overflow-hidden rounded-[20px] border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:h-[560px] 2xl:h-[620px]"
                      onMouseMove={onPreviewCanvasMouseMove}
                      onMouseUp={stopDraggingBlock}
                      onMouseLeave={stopDraggingBlock}
                      onClick={() => setSelectedBlockId(null)}
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />

                      <StageVideoPreview
                        stageState={stageState}
                        participantIds={onStageParticipants.map((p) => p.identity)}
                      />

                      {renderPlacedBlocks(previewBlocks, {
                        selectable: true,
                        showChrome: true,
                        selectedBlockId,
                      })}

                      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] font-medium text-white/65 backdrop-blur">
                        PREVIEW
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-red-400/20 bg-[linear-gradient(180deg,rgba(28,10,14,0.96),rgba(10,5,8,0.98))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
                    <MonitorHeader
                      title="Program"
                      subtitle="What the audience is seeing"
                      tone="program"
                      badge={
                        <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-200">
                          {programState?.is_live ? "LIVE" : "HOLDING"}
                        </span>
                      }
                    />

                    <div className="relative h-[580px] overflow-hidden rounded-[20px] border border-red-400/10 bg-black shadow-[0_0_0_1px_rgba(239,68,68,0.06),inset_0_1px_0_rgba(255,255,255,0.04)] xl:h-[560px] 2xl:h-[620px]">
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />

                      <div className="relative z-10 h-full">
                        <StageVideoPreview
                          stageState={programState}
                          participantIds={programState?.stage_participant_ids || []}
                        />

                        {renderPlacedBlocks(programBlocks, {
                          selectable: false,
                          showChrome: false,
                        })}

                        <div className="absolute inset-0 z-30 pointer-events-none p-4">
                          <AudienceOriginCue
                            visible={showAudienceCue}
                            region={audienceCueRegion}
                            moonMode={audienceCueMoonMode}
                            entering
                            questionLabel={audienceCueQuestionLabel}
                            compact
                            broadcast
                          />
                        </div>
                      </div>

                      {isTransitioning && transitionFromState ? (
                        <div
                          className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-500 ${
                            transitionFadingOut ? "opacity-0" : "opacity-100"
                          }`}
                        >
                          <StageVideoPreview
                            stageState={transitionFromState}
                            participantIds={transitionFromState.stage_participant_ids || []}
                          />

                          {renderPlacedBlocks(transitionFromBlocks, {
                            selectable: false,
                            showChrome: false,
                          })}
                        </div>
                      ) : null}

                      <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full border border-red-400/20 bg-black/55 px-3 py-1 text-[11px] font-semibold text-red-200 backdrop-blur">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            programState?.is_live ? "animate-pulse bg-red-400" : "bg-white/30"
                          }`}
                        />
                        PROGRAM
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
                  <button
                    onClick={async () => {
                      try {
                        setTakeBusy(true)
                        setError(null)
                        await takeProgram()
                      } catch (e: any) {
                        setError(e.message)
                      } finally {
                        setTakeBusy(false)
                      }
                    }}
                    disabled={takeBusy}
                    className={`rounded-2xl px-7 py-3 text-base font-black tracking-[0.18em] text-slate-950 shadow-[0_20px_45px_rgba(0,0,0,0.35)] transition-all duration-200 disabled:opacity-60 ${
                      previewProgramDifferent
                        ? "bg-amber-400 hover:bg-amber-300 hover:scale-[1.02]"
: "bg-sky-400 hover:bg-sky-300 hover:scale-[1.02]"
                    }`}
                  >
                    {takeBusy ? "Taking..." : "TAKE"}
                  </button>

                  <button
                    onClick={() =>
                      void goLive().catch((e: unknown) =>
                        setError(e instanceof Error ? e.message : "Unexpected error")
                      )
                    }
                    className="rounded-2xl bg-red-500 px-6 py-3 text-base font-bold text-white shadow-[0_18px_40px_rgba(239,68,68,0.28)] transition hover:bg-red-400 hover:scale-[1.02]"
                  >
                    Go Live
                  </button>

                  <button
                    onClick={() =>
                      void goOffAir().catch((e: unknown) =>
                        setError(e instanceof Error ? e.message : "Unexpected error")
                      )
                    }
                    className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 hover:scale-[1.02]"
                  >
                    Off Air
                  </button>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Add Blocks / Upload Media
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={addTestTextBlock}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        Add Text
                      </button>

                      <button
                        onClick={addTestVideoBlock}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        Add Video
                      </button>

                      <button
                        onClick={addTestPdfBlock}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        Add PDF
                      </button>

                      <button
                        onClick={addTestImageBlock}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        Add Image
                      </button>

                      <button
                        onClick={() => pdfInputRef.current?.click()}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
                      >
                        Upload PDF
                      </button>

                      <button
                        onClick={() => videoInputRef.current?.click()}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
                      >
                        Upload Video
                      </button>

                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
                      >
                        Upload Image
                      </button>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Preview blocks: {previewBlocks.length}
                      </span>

                      <button
                        onClick={duplicateSelectedBlock}
                        disabled={!selectedBlockId}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/10"
                      >
                        Duplicate
                      </button>

                      <button
                        onClick={bringSelectedBlockToFront}
                        disabled={!selectedBlockId}
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/10"
                      >
                        Bring To Front
                      </button>

                      <button
                        onClick={deleteSelectedBlock}
                        disabled={!selectedBlockId}
                        className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-red-500/15"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Scenes / Status
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        value={sceneName}
                        onChange={(e) => setSceneName(e.target.value)}
                        placeholder="Scene name"
                        className="min-w-[220px] rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-0 placeholder:text-white/30"
                      />

                      <button
                        onClick={saveScene}
                        disabled={sceneBusy}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        Save Scene
                      </button>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Screen: {stageState?.screen_share_participant_id || "none"}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Pinned: {stageState?.pinned_participant_id || "none"}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        Primary: {stageState?.primary_participant_id || "none"}
                      </span>

                      {stageState?.screen_share_participant_id ? (
                        <button
                          onClick={() =>
                            void clearScreenShare().catch((e: unknown) =>
                              setError(e instanceof Error ? e.message : "Unexpected error")
                            )
                          }
                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Clear screen
                        </button>
                      ) : null}

                      {stageState?.pinned_participant_id ? (
                        <button
                          onClick={() =>
                            void unpinParticipant().catch((e: unknown) =>
                              setError(e instanceof Error ? e.message : "Unexpected error")
                            )
                          }
                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Clear pin
                        </button>
                      ) : null}

                      {stageState?.primary_participant_id ? (
                        <button
                          onClick={() =>
                            void clearPrimaryParticipant().catch((e: unknown) =>
                              setError(e instanceof Error ? e.message : "Unexpected error")
                            )
                          }
                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Clear primary
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {scenes.map((scene) => (
                        <button
                          key={scene.id}
                          onClick={() => void applyScene(scene.id)}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs transition hover:bg-white/5"
                        >
                          {scene.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedBlock ? (
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                          Selected Block
                        </div>
                        <div className="text-sm text-white/70">
                          {selectedBlock.label || selectedBlock.type}
                        </div>
                      </div>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        {selectedBlock.type}
                      </span>
                    </div>

                    <div className="mb-4 flex items-center gap-3">
                      <button
                        onClick={toggleSelectedBlockHidden}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          selectedBlock.hidden
                            ? "border border-amber-300/30 bg-amber-400/10 text-amber-200"
                            : "border border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                        }`}
                      >
                        {selectedBlock.hidden ? "Show Block" : "Hide Block"}
                      </button>

                      <span className="text-sm text-white/50">
                        {selectedBlock.hidden ? "Currently hidden" : "Currently visible"}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                          Opacity
                        </label>
                        <input
                          type="number"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={selectedBlock.opacity ?? 1}
                          onChange={(e) => updateSelectedBlockOpacity(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                            Label
                          </label>
                          <input
                            value={selectedBlock.label || ""}
                            onChange={(e) => updateSelectedBlockLabel(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                            placeholder="Block label"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                            Type
                          </label>
                          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                            {selectedBlock.type}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                            X
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={selectedBlock.x}
                            onChange={(e) => updateSelectedBlockPosition("x", e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                            Y
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={selectedBlock.y}
                            onChange={(e) => updateSelectedBlockPosition("y", e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                            Width
                          </label>
                          <input
                            type="number"
                            min={80}
                            value={selectedBlock.width}
                            onChange={(e) => updateSelectedBlockSize("width", e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                            Height
                          </label>
                          <input
                            type="number"
                            min={60}
                            value={selectedBlock.height}
                            onChange={(e) => updateSelectedBlockSize("height", e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                          />
                        </div>
                      </div>

                      {selectedBlock.type === "video" ||
                      selectedBlock.type === "pdf" ||
                      selectedBlock.type === "image" ? (
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                            Source URL
                          </label>
                          <input
                            value={selectedBlock.src || ""}
                            onChange={(e) => updateSelectedBlockSrc(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                            placeholder="https://..."
                          />
                        </div>
                      ) : null}

                      {selectedBlock.type === "text" ? (
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                            Text Content
                          </label>
                          <input
                            value={selectedBlock.content || ""}
                            onChange={(e) => updateSelectedTextBlockContent(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                            placeholder="Enter text..."
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/35">
                    Select a preview block to edit its properties.
                  </div>
                )}
              </div>
            </div>

            <div className="sticky top-6 rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_30%),linear-gradient(180deg,rgba(8,12,24,0.98),rgba(8,10,20,0.94))] p-5 shadow-[0_35px_90px_rgba(0,0,0,0.45)]">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                    Backstage
                  </div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
                    {participants.length} connected
                  </div>
                  <div className="mt-1 text-sm text-white/45">
                    Select who goes to stage and manage active sources.
                  </div>
                </div>

                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                  Mission Control
                </span>
              </div>

              <div className="max-h-[72vh] 4 overflow-y-auto pr-1">
                {participants.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-white/40">
                    No participants connected yet. Waiting for talent, presenters, or guests.
                  </div>
                ) : (
                  participants.map((p) => {
                    const isOnStage = stageIds.has(p.identity)
                    const isPrimary = stageState?.primary_participant_id === p.identity
                    const isPinned = stageState?.pinned_participant_id === p.identity
                    const isUsingScreen = stageState?.screen_share_participant_id === p.identity
                    const screenTrackSid = getScreenTrackSid(p)

                    return (
                      <ParticipantCard
                        key={p.identity}
                        participant={p}
                        isOnStage={isOnStage}
                        isPrimary={isPrimary}
                        isPinned={isPinned}
                        isUsingScreen={isUsingScreen}
                        screenTrackSid={screenTrackSid}
                        onAddToStage={(identity) =>
                          void addToStage(identity).catch((e: unknown) =>
                            setError(e instanceof Error ? e.message : "Unexpected error")
                          )
                        }
                        onSetScreenShare={(participantId, trackId) =>
                          void setScreenShare(participantId, trackId).catch((e: unknown) =>
                            setError(e instanceof Error ? e.message : "Unexpected error")
                          )
                        }
                        onClearPrimary={() =>
                          void clearPrimaryParticipant().catch((e: unknown) =>
                            setError(e instanceof Error ? e.message : "Unexpected error")
                          )
                        }
                        onSetPrimary={(identity) =>
                          void setPrimaryParticipant(identity).catch((e: unknown) =>
                            setError(e instanceof Error ? e.message : "Unexpected error")
                          )
                        }
                        onUnpin={() =>
                          void unpinParticipant().catch((e: unknown) =>
                            setError(e instanceof Error ? e.message : "Unexpected error")
                          )
                        }
                        onPin={(identity) =>
                          void pinParticipant(identity).catch((e: unknown) =>
                            setError(e instanceof Error ? e.message : "Unexpected error")
                          )
                        }
                        onRemoveFromStage={(identity) =>
                          void removeFromStage(identity).catch((e: unknown) =>
                            setError(e instanceof Error ? e.message : "Unexpected error")
                          )
                        }
                        onError={setError}
                      />
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </LiveKitRoom>
  )
}
