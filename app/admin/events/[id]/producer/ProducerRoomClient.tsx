"use client"

import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import type { JSX } from "react"
import { isTrackReference } from "@livekit/components-core"
import type { TrackReference } from "@livekit/components-core"
import AudienceOriginCue from "@/components/live/AudienceOriginCue"
import useProducerRoomApi from "./useProducerRoomApi"
import useProducerBlocks, { type PreviewBlock } from "./useProducerBlocks"
import BackstagePanel from "./BackstagePanel"

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

function StageVideoPreview({
  stageState,
  participantIds,
}: {
  stageState: StageState | null
  participantIds: string[]
}) {
const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }])
const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }])

  const stageIdSet = useMemo(() => new Set(participantIds), [participantIds])

const onStageCameraTracks = useMemo<TrackReference[]>(() => {
  return cameraTracks.filter(
    (trackRef): trackRef is TrackReference =>
      isTrackReference(trackRef) && stageIdSet.has(trackRef.participant.identity)
  )
}, [cameraTracks, stageIdSet])

const onStageScreenTracks = useMemo<TrackReference[]>(() => {
  return screenTracks.filter(
    (trackRef): trackRef is TrackReference =>
      isTrackReference(trackRef) && stageIdSet.has(trackRef.participant.identity)
  )
}, [screenTracks, stageIdSet])

  function pickPrimaryCamera() {
    if (!stageState || onStageCameraTracks.length === 0) return null

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

    const firstOrdered = stageState.stage_participant_ids
      .map((id) => onStageCameraTracks.find((t) => t.participant.identity === id) || null)
      .find(Boolean)

    return firstOrdered || onStageCameraTracks[0] || null
  }

  function pickScreenTrack() {
    if (!stageState || onStageScreenTracks.length === 0) return null

    if (stageState.screen_share_track_id) {
      const exact = onStageScreenTracks.find(
        (t) => t.publication.trackSid === stageState.screen_share_track_id
      )
      if (exact) return exact
    }

    if (stageState.screen_share_participant_id) {
      const byParticipant = onStageScreenTracks.find(
        (t) => t.participant.identity === stageState.screen_share_participant_id
      )
      if (byParticipant) return byParticipant
    }

    return onStageScreenTracks[0] || null
  }

  function pickSpeakerForScreenLayout() {
    if (!stageState || onStageCameraTracks.length === 0) return null

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

    if (stageState.screen_share_participant_id) {
      const sharer = onStageCameraTracks.find(
        (t) => t.participant.identity === stageState.screen_share_participant_id
      )
      if (sharer) return sharer
    }

    return onStageCameraTracks[0] || null
  }

  if (!stageState || participantIds.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/40">
        Stage is empty
      </div>
    )
  }

  if (stageState.layout === "solo") {
    const primary = pickPrimaryCamera()

    if (!primary) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/40">
          No live camera tracks on stage
        </div>
      )
    }

    const isPrimary = stageState.primary_participant_id === primary.participant.identity
    const isPinned = stageState.pinned_participant_id === primary.participant.identity

    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-black ${
          isPrimary ? "ring-2 ring-sky-400" : ""
        }`}
      >
        <VideoTrack trackRef={primary} className="aspect-video h-full w-full object-cover" />

        <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
          {isPrimary ? (
            <span className="rounded bg-sky-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
              PRIMARY
            </span>
          ) : null}

          {isPinned ? (
            <span className="rounded bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-slate-950">
              PINNED
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  if (stageState.layout === "screen_speaker") {
    const screenTrack = pickScreenTrack()
    const speakerTrack = pickSpeakerForScreenLayout()

    if (!screenTrack && !speakerTrack) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/40">
          No screen share or speaker video available
        </div>
      )
    }

    if (!screenTrack && speakerTrack) {
      const isPrimary = stageState.primary_participant_id === speakerTrack.participant.identity
      const isPinned = stageState.pinned_participant_id === speakerTrack.participant.identity

      return (
        <div
          className={`relative overflow-hidden rounded-2xl bg-black ${
            isPrimary ? "ring-2 ring-sky-400" : ""
          }`}
        >
          <VideoTrack trackRef={speakerTrack} className="aspect-video h-full w-full object-cover" />

          <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
            {isPrimary ? (
              <span className="rounded bg-sky-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                PRIMARY
              </span>
            ) : null}

            {isPinned ? (
              <span className="rounded bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                PINNED
              </span>
            ) : null}
          </div>
        </div>
      )
    }

    return (
      <div className="grid min-h-[420px] gap-4 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="relative overflow-hidden rounded-2xl bg-black">
          {screenTrack ? (
            <VideoTrack trackRef={screenTrack} className="aspect-video h-full w-full object-contain" />
          ) : (
            <div className="flex aspect-video items-center justify-center text-white/40">
              No screen share
            </div>
          )}

          <div className="pointer-events-none absolute left-3 top-3">
            <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
              SCREEN
            </span>
          </div>
        </div>

        <div
          className={`relative overflow-hidden rounded-2xl bg-black ${
            speakerTrack && stageState.primary_participant_id === speakerTrack.participant.identity
              ? "ring-2 ring-sky-400"
              : ""
          }`}
        >
          {speakerTrack ? (
            <VideoTrack trackRef={speakerTrack} className="aspect-video h-full w-full object-cover" />
          ) : (
            <div className="flex aspect-video items-center justify-center text-white/40">
              No speaker camera
            </div>
          )}

          {speakerTrack ? (
            <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
              {stageState.primary_participant_id === speakerTrack.participant.identity ? (
                <span className="rounded bg-sky-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  PRIMARY
                </span>
              ) : null}

              {stageState.pinned_participant_id === speakerTrack.participant.identity ? (
                <span className="rounded bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  PINNED
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (onStageCameraTracks.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/40">
        No live camera tracks on stage
      </div>
    )
  }

  return (
    <div
      className={`grid min-h-[420px] gap-4 ${
        onStageCameraTracks.length === 1
          ? "grid-cols-1"
          : onStageCameraTracks.length === 2
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2"
      }`}
    >
      {onStageCameraTracks.map((trackRef) => {
        const isPrimary = stageState.primary_participant_id === trackRef.participant.identity
        const isPinned = stageState.pinned_participant_id === trackRef.participant.identity

        return (
          <div
            key={trackRef.participant.identity}
            className={`relative overflow-hidden rounded-2xl bg-black ${
              isPrimary ? "ring-2 ring-sky-400" : ""
            }`}
          >
            <VideoTrack trackRef={trackRef} className="aspect-video h-full w-full object-cover" />

            <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
              {isPrimary ? (
                <span className="rounded bg-sky-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  PRIMARY
                </span>
              ) : null}

              {isPinned ? (
                <span className="rounded bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  PINNED
                </span>
              ) : null}
            </div>
          </div>
        )
      })}
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
  console.log("NEW PRODUCER CLIENT LOADED")
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
  const [localPreviewReady, setLocalPreviewReady] = useState(false)

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
    draggingBlockId,
    setDraggingBlockId,
    resizingBlockId,
    setResizingBlockId,
    dragOffset,
    setDragOffset,
    previewCanvasRect,
    setPreviewCanvasRect,
    selectedBlock,
    addTestTextBlock,
    addTestVideoBlock,
    addTestPdfBlock,
    addTestImageBlock,
    deleteSelectedBlock,
    duplicateSelectedBlock,
    bringSelectedBlockToFront,
  } = useProducerBlocks()
const stopLocalPreviewStream = useCallback(() => {
  if (!localPreviewStreamRef.current) return

  localPreviewStreamRef.current.getTracks().forEach((track) => track.stop())
  localPreviewStreamRef.current = null

  if (producerPreviewVideoRef.current) {
    producerPreviewVideoRef.current.srcObject = null
  }

  setLocalPreviewReady(false)
}, [])

  const startLocalPreviewStream = useCallback(async () => {
    try {
      stopLocalPreviewStream()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true,
        audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true,
      })

      localPreviewStreamRef.current = stream

      if (producerPreviewVideoRef.current) {
        producerPreviewVideoRef.current.srcObject = stream
        await producerPreviewVideoRef.current.play().catch(() => {})
      }

      setLocalPreviewReady(true)
    } catch (err) {
      console.error("Failed to start local preview stream", err)
      setLocalPreviewReady(false)
    }
  }, [selectedVideoDeviceId, selectedAudioDeviceId, stopLocalPreviewStream])

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
      prev && videos.some((device) => device.deviceId === prev)
        ? prev
        : videos[0]?.deviceId || ""
    )

    setSelectedAudioDeviceId((prev) =>
      prev && audios.some((device) => device.deviceId === prev)
        ? prev
        : audios[0]?.deviceId || ""
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

  function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const src = URL.createObjectURL(file)

    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "pdf",
        x: 120,
        y: 90,
        width: 420,
        height: 260,
        zIndex: Math.max(...prev.map((b) => b.zIndex), 0) + 1,
        opacity: 1,
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded PDF",
        src,
        hidden: false,
      },
    ])

    e.target.value = ""
  }

  function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const src = URL.createObjectURL(file)

    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "video",
        x: 100,
        y: 100,
        width: 420,
        height: 236,
        zIndex: Math.max(...prev.map((b) => b.zIndex), 0) + 1,
        opacity: 1,
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded Video",
        src,
        hidden: false,
      },
    ])

    e.target.value = ""
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const src = URL.createObjectURL(file)

    setPreviewBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "image",
        x: 100,
        y: 100,
        width: 260,
        height: 140,
        zIndex: Math.max(...prev.map((b) => b.zIndex), 0) + 1,
        opacity: 1,
        label: file.name.replace(/\.[^/.]+$/, "") || "Uploaded Image",
        src,
        hidden: false,
      },
    ])

    e.target.value = ""
  }

  function startDraggingBlock(e: React.MouseEvent<HTMLDivElement>, blockId: string) {
    const rect = e.currentTarget.parentElement?.getBoundingClientRect() || null
    if (!rect) return

    const block = previewBlocks.find((b) => b.id === blockId)
    if (!block) return

    setPreviewCanvasRect(rect)
    setDraggingBlockId(blockId)
    setDragOffset({
      x: e.clientX - rect.left - block.x,
      y: e.clientY - rect.top - block.y,
    })
  }

  function startResizingBlock(e: React.MouseEvent<HTMLDivElement>, blockId: string) {
    e.stopPropagation()

    const rect = e.currentTarget.parentElement?.getBoundingClientRect() || null
    if (!rect) return

    setPreviewCanvasRect(rect)
    setResizingBlockId(blockId)
    setSelectedBlockId(blockId)
  }

  function onPreviewCanvasMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!previewCanvasRect) return

    if (resizingBlockId) {
      setPreviewBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== resizingBlockId) return block

          const nextWidth = e.clientX - previewCanvasRect.left - block.x
          const nextHeight = e.clientY - previewCanvasRect.top - block.y

          return {
            ...block,
            width: Math.max(80, nextWidth),
            height: Math.max(60, nextHeight),
          }
        })
      )
      return
    }

    if (!draggingBlockId) return

    const nextX = e.clientX - previewCanvasRect.left - dragOffset.x
    const nextY = e.clientY - previewCanvasRect.top - dragOffset.y

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === draggingBlockId
          ? {
              ...block,
              x: Math.max(0, nextX),
              y: Math.max(0, nextY),
            }
          : block
      )
    )
  }

  function stopDraggingBlock() {
    setDraggingBlockId(null)
    setResizingBlockId(null)
  }

  function updateSelectedTextBlockContent(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId && block.type === "text"
          ? {
              ...block,
              content: value,
            }
          : block
      )
    )
  }

  function updateSelectedBlockSize(field: "width" | "height", value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              [field]: Math.max(field === "width" ? 80 : 60, numericValue),
            }
          : block
      )
    )
  }

  function updateSelectedBlockOpacity(value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              opacity: Math.max(0.1, Math.min(1, numericValue)),
            }
          : block
      )
    )
  }

  function toggleSelectedBlockHidden() {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              hidden: !block.hidden,
            }
          : block
      )
    )
  }

  function updateSelectedBlockPosition(field: "x" | "y", value: string) {
    if (!selectedBlockId) return

    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              [field]: Math.max(0, numericValue),
            }
          : block
      )
    )
  }

  function updateSelectedBlockLabel(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              label: value,
            }
          : block
      )
    )
  }

  function updateSelectedBlockSrc(value: string) {
    if (!selectedBlockId) return

    setPreviewBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              src: value,
            }
          : block
      )
    )
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
      return <iframe src={block.src} className="h-full w-full bg-white" title={block.label || "PDF"} />
    }

    return null
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

    function DeviceSelectorPanel(): JSX.Element {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Producer Devices
            </div>
            <div className="text-sm text-white/55">
              Choose the camera and microphone for this workstation.
            </div>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              deviceAccessReady
                ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                : "border-amber-300/30 bg-amber-400/10 text-amber-200"
            }`}
          >
            {deviceAccessReady ? "Ready" : "Permission needed"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Camera
            </label>
            <select
              value={selectedVideoDeviceId}
              onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              {videoDevices.length === 0 ? (
                <option value="">No cameras found</option>
              ) : (
                videoDevices.map((device, index) => (
                  <option key={device.deviceId || `video-${index}`} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Microphone
            </label>
            <select
              value={selectedAudioDeviceId}
              onChange={(e) => setSelectedAudioDeviceId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              {audioDevices.length === 0 ? (
                <option value="">No microphones found</option>
              ) : (
                audioDevices.map((device, index) => (
                  <option key={device.deviceId || `audio-${index}`} value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Cameras: {videoDevices.length}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Mics: {audioDevices.length}
          </span>
        </div>
      </div>
    )
  }



  function getScreenTrackSid(participant: ProducerParticipant) {
    const track = participant.tracks.find((t) => t.source === 3 || t.source === "SCREEN_SHARE")
    return track?.sid ?? null
  }

  function ParticipantStatusPill({
    isOnStage,
    isPrimary,
    isPinned,
  }: {
    isOnStage: boolean
    isPrimary: boolean
    isPinned: boolean
  }): JSX.Element {
    if (isPrimary) {
      return (
        <span className="rounded-full border border-sky-300/30 bg-sky-400/15 px-2.5 py-1 text-[11px] font-semibold text-sky-200">
          Primary
        </span>
      )
    }

    if (isPinned) {
      return (
        <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
          Pinned
        </span>
      )
    }

    if (isOnStage) {
      return (
        <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
          On Stage
        </span>
      )
    }

    return (
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60">
        Backstage
      </span>
    )
  }

  function SourceChip({
    label,
    active,
    tone = "neutral",
  }: {
    label: string
    active: boolean
    tone?: "neutral" | "screen"
  }): JSX.Element {
    const activeClass =
      tone === "screen"
        ? "border-violet-300/30 bg-violet-400/15 text-violet-200"
        : "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"

    const inactiveClass = "border-white/10 bg-white/5 text-white/45"

    return (
      <span
        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
          active ? activeClass : inactiveClass
        }`}
      >
        {label} {active ? "On" : "Off"}
      </span>
    )
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

      setLocalPreviewReady(true)
    } catch (err) {
      console.error("Preview start failed", err)
      setLocalPreviewReady(false)
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

  const screenTrack = p.tracks.find(
    (t) => t.source === 3 || t.source === "SCREEN_SHARE"
  )

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

    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,#0b1736_0%,#050816_45%,#02040b_100%)] text-white">
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

      <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(8,15,36,0.94),rgba(5,8,22,0.9))] px-6 py-4">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-white/35">
              Producer Room · {producerScopeLabel}
            </div>
            <h1 className="mt-1 text-3xl font-semibold leading-none text-white">
              {stageState?.headline || "Live Production"}
            </h1>
            <p className="mt-2 text-sm text-white/45">
              Session control for Preview, Program, backstage, and overlays.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
              Layout: {stageState?.layout || "solo"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
              On stage: {onStageParticipants.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
              Blocks: {previewBlocks.length}
            </span>
            <LiveBadge live={Boolean(stageState?.is_live)} />
          </div>
        </div>
      </div>

      <div className="flex-1 py-6 backdrop-blur-[2px]">
        <div className="grid w-full gap-5 px-62xl:gap-5 xl:grid-cols-[minmax(0,2.35fr)_320px]">
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
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,42,0.92),rgba(5,8,22,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                    Switcher
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    Preview → Program
                  </div>
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

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-[24px] border border-sky-400/10 bg-[#07111f] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
  className="relative h-[520px] overflow-hidden rounded-[20px] border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:h-[560px] 2xl:h-[620px]"
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

                <div className="rounded-[24px] border border-red-400/15 bg-[#170b0d] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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

                  <div className="relative h-[520px] overflow-hidden rounded-[20px] border border-red-400/10 bg-black shadow-[0_0_0_1px_rgba(239,68,68,0.06),inset_0_1px_0_rgba(255,255,255,0.04)] xl:h-[560px] 2xl:h-[620px]">
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

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
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
                  className={`rounded-xl px-5 py-2.5 text-base font-bold text-slate-950 transition disabled:opacity-60 ${
                    previewProgramDifferent
                      ? "bg-amber-400 hover:bg-amber-300"
                      : "bg-sky-400 hover:bg-sky-300"
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
                  className="rounded-xl bg-red-500 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-red-400"
                >
                  Go Live
                </button>

                <button
                  onClick={() =>
                    void goOffAir().catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : "Unexpected error")
                    )
                  }
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-white/10"
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

<BackstagePanel participantCount={participants.length}>
  {participants.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-white/40">
      No participants connected yet.
    </div>
  ) : (
    participants.map((p) => {
      const isOnStage = stageIds.has(p.identity)
      const isPrimary = stageState?.primary_participant_id === p.identity
      const isPinned = stageState?.pinned_participant_id === p.identity
      const isUsingScreen = stageState?.screen_share_participant_id === p.identity
      const screenTrackSid = getScreenTrackSid(p)

      return (
        <div
          key={p.identity}
          onClick={() => {
            if (!isOnStage) {
              void addToStage(p.identity).catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
          }}
          className={`group cursor-pointer rounded-[22px] border p-4 transition ${
            isPrimary
              ? "border-sky-300/50 bg-sky-400/10 shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
              : isPinned
                ? "border-amber-300/40 bg-amber-400/5"
                : isOnStage
                  ? "border-emerald-300/20 bg-emerald-400/[0.05]"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-white">{p.name}</div>
                <div className="mt-1 truncate text-xs text-white/40">{p.identity}</div>
              </div>

              <div className="shrink-0">
                <ParticipantStatusPill
                  isOnStage={isOnStage}
                  isPrimary={isPrimary}
                  isPinned={isPinned}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <SourceChip label="Camera" active={p.cameraEnabled} />
              <SourceChip label="Mic" active={p.micEnabled} />
              <SourceChip label="Screen" active={p.screenShareEnabled} tone="screen" />
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-white/45">
              {isUsingScreen ? (
                <span className="rounded-full border border-violet-300/30 bg-violet-400/15 px-2.5 py-1 font-medium text-violet-200">
                  Screen selected for program
                </span>
              ) : null}

              {p.joinedAt ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  Joined
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
              {p.screenShareEnabled ? (
                <button
                  onClick={() => {
                    if (!screenTrackSid) {
                      setError("No screen-share track found for this participant")
                      return
                    }

                    void setScreenShare(p.identity, screenTrackSid).catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : "Unexpected error")
                    )
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isUsingScreen
                      ? "bg-violet-300 text-slate-950"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {isUsingScreen ? "Screen Active" : "Use Screen"}
                </button>
              ) : null}

              {isOnStage ? (
                <>
                  <button
                    onClick={() => {
                      const action = isPrimary
                        ? clearPrimaryParticipant()
                        : setPrimaryParticipant(p.identity)

                      void action.catch((e: unknown) =>
                        setError(e instanceof Error ? e.message : "Unexpected error")
                      )
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      isPrimary
                        ? "bg-sky-300 text-slate-950"
                        : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    {isPrimary ? "Clear Primary" : "Make Primary"}
                  </button>

                  <button
                    onClick={() => {
                      const action = isPinned ? unpinParticipant() : pinParticipant(p.identity)

                      void action.catch((e: unknown) =>
                        setError(e instanceof Error ? e.message : "Unexpected error")
                      )
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      isPinned
                        ? "bg-amber-300 text-slate-950"
                        : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    {isPinned ? "Unpin" : "Pin"}
                  </button>

                  <button
                    onClick={() =>
                      void removeFromStage(p.identity).catch((e: unknown) =>
                        setError(e instanceof Error ? e.message : "Unexpected error")
                      )
                    }
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    void addToStage(p.identity).catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : "Unexpected error")
                    )
                  }
                  className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-white/90"
                >
                  Add to Stage
                </button>
              )}
            </div>
          </div>
        </div>
      )
    })
  )}
</BackstagePanel>
        </div>
      </div>
    </div>
  </LiveKitRoom>
)
}