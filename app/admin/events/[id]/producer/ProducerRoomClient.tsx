"use client"

import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react"
import type { JSX } from "react"
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react"

import useProducerRoomApi from "./useProducerRoomApi"
import useProducerBlocks, { type PreviewBlock } from "./useProducerBlocks"
import ProducerRoomHeader from "./ProducerRoomHeader"
import CenterSwitcherColumn from "./CenterSwitcherColumn"
import ProducerLeftRail from "./ProducerLeftRail"
import ProducerRightRail from "./ProducerRightRail"
import BroadcastCommandDeck from "./BroadcastCommandDeck"
import BottomAssetDock from "./BottomAssetDock"

export type ProducerParticipant = {
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



export function renderBlockContent(block: PreviewBlock): JSX.Element | null {
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

export function renderPlacedBlocks({
  blocks,
  opts,
  selectedBlockId,
  setSelectedBlockId,
  startDraggingBlock,
  startResizingBlock,
}: {
  blocks: PreviewBlock[]
  opts?: {
    selectable?: boolean
    showChrome?: boolean
    selectedBlockId?: string | null
  }
  selectedBlockId: string | null
  setSelectedBlockId: (value: string | null) => void
  startDraggingBlock: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void
  startResizingBlock: (e: React.MouseEvent<HTMLDivElement>, blockId: string) => void
}): JSX.Element[] {
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
export type StageState = {
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

export function MonitorHeader({
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




export function AudienceOriginTestPanel({
  onTriggerCue,
  onHideCue,
}: {
  onTriggerCue: (options: {
    region?: string
    moonMode?: boolean
    questionLabel?: string
    durationMs?: number
  }) => void
  onHideCue: () => void
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Audience Origin Test
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() =>
            onTriggerCue({
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
            onTriggerCue({
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
            onTriggerCue({
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
          onClick={onHideCue}
          className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
        >
          Hide Cue
        </button>
      </div>
    </div>
  )
}
export function MediaBlocksPanel({
  previewBlocksCount,
  onAddText,
  onAddVideo,
  onAddPdf,
  onAddImage,
  onUploadPdf,
  onUploadVideo,
  onUploadImage,
  onDuplicate,
  onBringToFront,
  onDelete,
  hasSelectedBlock,
}: {
  previewBlocksCount: number
  onAddText: () => void
  onAddVideo: () => void
  onAddPdf: () => void
  onAddImage: () => void
  onUploadPdf: () => void
  onUploadVideo: () => void
  onUploadImage: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onDelete: () => void
  hasSelectedBlock: boolean
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Add Blocks / Upload Media
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onAddText}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add Text
        </button>

        <button
          onClick={onAddVideo}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add Video
        </button>

        <button
          onClick={onAddPdf}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add PDF
        </button>

        <button
          onClick={onAddImage}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Add Image
        </button>

        <button
          onClick={onUploadPdf}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
        >
          Upload PDF
        </button>

        <button
          onClick={onUploadVideo}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
        >
          Upload Video
        </button>

        <button
          onClick={onUploadImage}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
        >
          Upload Image
        </button>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Preview blocks: {previewBlocksCount}
        </span>

        <button
          onClick={onDuplicate}
          disabled={!hasSelectedBlock}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/10"
        >
          Duplicate
        </button>

        <button
          onClick={onBringToFront}
          disabled={!hasSelectedBlock}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-white/10"
        >
          Bring To Front
        </button>

        <button
          onClick={onDelete}
          disabled={!hasSelectedBlock}
          className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-red-500/15"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
export function ScenesStatusPanel({
  sceneName,
  onSceneNameChange,
  onSaveScene,
  sceneBusy,
  stageState,
  scenes,
  onApplyScene,
  onClearScreenShare,
  onUnpin,
  onClearPrimary,
}: {
  sceneName: string
  onSceneNameChange: (value: string) => void
  onSaveScene: () => void
  sceneBusy: boolean
  stageState: StageState | null
  scenes: Array<{ id: string; name: string }>
  onApplyScene: (sceneId: string) => void
  onClearScreenShare: () => void
  onUnpin: () => void
  onClearPrimary: () => void
}): JSX.Element {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        Scenes / Status
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={sceneName}
          onChange={(e) => onSceneNameChange(e.target.value)}
          placeholder="Scene name"
          className="min-w-[220px] rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-0 placeholder:text-white/30"
        />

        <button
          onClick={onSaveScene}
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
            onClick={onClearScreenShare}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Clear screen
          </button>
        ) : null}

        {stageState?.pinned_participant_id ? (
          <button
            onClick={onUnpin}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Clear pin
          </button>
        ) : null}

        {stageState?.primary_participant_id ? (
          <button
            onClick={onClearPrimary}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Clear primary
          </button>
        ) : null}
      </div>

      {scenes.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-4 text-sm text-white/45">
          No saved scenes yet. Build a preview, name it, then save it.
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              onClick={() => onApplyScene(scene.id)}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="mb-3 aspect-video rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_70%_60%,rgba(239,68,68,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />

              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                Scene {index + 1}
              </div>

              <div className="mt-1 text-sm font-semibold text-white group-hover:text-sky-200">
                {scene.name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}



export default function ProducerRoomClient({
  eventId,
  sessionId,
}: {
  eventId: string
  sessionId: string
}): JSX.Element {
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
  const [lastTakeMode, setLastTakeMode] = useState<"cut" | "auto">("cut")
  const [programFlashActive, setProgramFlashActive] = useState(false)
  const [programState, setProgramState] = useState<StageState | null>(null)
  const [localMicLevel, setLocalMicLevel] = useState(0)
  const [monitorHeight, setMonitorHeight] = useState(520)
  const pdfInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

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
  }, [])

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
    setProgramFlashActive(true)

    window.setTimeout(() => {
      setProgramFlashActive(false)
    }, 220)
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
    }, 620)

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

  function getScreenTrackSid(participant: ProducerParticipant) {
    const track = participant.tracks.find((t) => t.source === 3 || t.source === "SCREEN_SHARE")
    return track?.sid ?? null
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

  useEffect(() => {
    if (!deviceAccessReady) return

    let cancelled = false
    let animationFrameId = 0
    let audioContext: AudioContext | null = null

    async function startMeter() {
      await new Promise((resolve) => window.setTimeout(resolve, 250))

      const stream = localPreviewStreamRef.current
      const audioTrack = stream?.getAudioTracks()[0]

      if (!stream || !audioTrack || cancelled) {
        setLocalMicLevel(0)
        return
      }

      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256

      source.connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)

      function tick() {
        if (cancelled) return

        analyser.getByteTimeDomainData(data)

        let sum = 0
        for (const value of data) {
          const normalized = (value - 128) / 128
          sum += normalized * normalized
        }

        const rms = Math.sqrt(sum / data.length)
        const boosted = Math.min(1, rms * 9)

        setLocalMicLevel((previous) => {
          const attack = boosted > previous ? 0.35 : 0.12
          return previous + (boosted - previous) * attack
        })

        animationFrameId = window.requestAnimationFrame(tick)
      }

      tick()
    }

    void startMeter()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrameId)
      void audioContext?.close().catch(() => {})
      setLocalMicLevel(0)
    }
  }, [deviceAccessReady, selectedAudioDeviceId])

  const stageIds = useMemo(() => new Set(stageState?.stage_participant_ids || []), [stageState])

  const onStageParticipants = useMemo(
    () => participants.filter((p) => stageIds.has(p.identity)),
    [participants, stageIds]
  )

  const firstOnStageScreenShare = useMemo(
    () =>
      onStageParticipants.find((p) => {
        if (!p.screenShareEnabled) return false

        const screenTrack = p.tracks.find(
          (t) => t.source === 3 || t.source === "SCREEN_SHARE"
        )

        return Boolean(screenTrack?.sid)
      }),
    [onStageParticipants]
  )

  const selectedScreenStillExists = useMemo(
    () =>
      onStageParticipants.some((p) => {
        if (p.identity !== stageState?.screen_share_participant_id) return false

        return p.tracks.some(
          (t) =>
            (t.source === 3 || t.source === "SCREEN_SHARE") &&
            t.sid === stageState?.screen_share_track_id
        )
      }),
    [
      onStageParticipants,
      stageState?.screen_share_participant_id,
      stageState?.screen_share_track_id,
    ]
  )

  const runTake = useCallback(async (mode: "cut" | "auto" = "cut") => {
    if (takeBusy) return

    try {
      setTakeBusy(true)
      setLastTakeMode(mode)
      setError(null)
      await takeProgram()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error")
    } finally {
      setTakeBusy(false)
    }
  }, [takeBusy, takeProgram])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return

      if (event.code !== "Space") return

      event.preventDefault()
      void runTake("cut")
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [runTake])

  const previewProgramDifferent = useMemo(
    () =>
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
      }),
    [stageState, programState, previewBlocks, programBlocks]
  )

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

      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#020617] text-white">
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute left-[-10%] top-[-18%] h-[520px] w-[520px] rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute right-[-12%] top-[8%] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-[-20%] left-[30%] h-[620px] w-[620px] rounded-full bg-red-500/8 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_42%)]" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col">
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

          <ProducerRoomHeader
            headline={stageState?.headline || "Live Production"}
            layout={stageState?.layout}
            previewProgramDifferent={previewProgramDifferent}
            onStageCount={onStageParticipants.length}
            overlayCount={previewBlocks.length}
            isLive={Boolean(programState?.is_live)}
            scopeLabel={producerScopeLabel}
          />
          <BroadcastCommandDeck
            isLive={Boolean(programState?.is_live)}
            audienceCount={participants.length}
            onStageCount={onStageParticipants.length}
            previewProgramDifferent={previewProgramDifferent}
            takeBusy={takeBusy}
            onTake={(mode: "cut" | "auto"): void => {
              void runTake(mode)
            }}
          />
          <div className="flex-1 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.10),transparent_34%),radial-gradient(circle_at_100%_20%,rgba(168,85,247,0.08),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(1,3,10,1))] px-3 py-3 md:px-4 xl:px-5 xl:py-4 2xl:px-6">
            <div className="grid w-full items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)_320px] xl:grid-cols-[265px_minmax(0,1fr)_345px] 2xl:grid-cols-[285px_minmax(0,1fr)_375px] [&_button]:transition-all [&_button]:duration-200 [&_button:hover]:-translate-y-0.5 [&_button:active]:translate-y-0">
              <ProducerLeftRail
                takeBusy={takeBusy}
                previewProgramDifferent={previewProgramDifferent}
                onTake={() => void runTake("cut")}
                onGoLive={() =>
                  void goLive().catch((e: unknown) =>
                    setError(e instanceof Error ? e.message : "Unexpected error")
                  )
                }
                onGoOffAir={() =>
                  void goOffAir().catch((e: unknown) =>
                    setError(e instanceof Error ? e.message : "Unexpected error")
                  )
                }
                layout={stageState?.layout}
                onSetLayout={(layout) =>
                  void setLayout(layout).catch((e: unknown) =>
                    setError(e instanceof Error ? e.message : "Unexpected error")
                  )
                }
                autoDirectorEnabled={autoDirectorEnabled}
                onToggleAutoDirector={() =>
                  void setAutoDirector(!autoDirectorEnabled).catch((e: unknown) =>
                    setError(e instanceof Error ? e.message : "Unexpected error")
                  )
                }
                localMicLevel={localMicLevel}
                monitorHeight={monitorHeight}
                onMonitorHeightChange={setMonitorHeight}
                deviceAccessReady={deviceAccessReady}
                videoDevices={videoDevices}
                audioDevices={audioDevices}
                selectedVideoDeviceId={selectedVideoDeviceId}
                selectedAudioDeviceId={selectedAudioDeviceId}
                onSelectVideoDevice={setSelectedVideoDeviceId}
                onSelectAudioDevice={setSelectedAudioDeviceId}
              />
              <div className="min-w-0">
                <CenterSwitcherColumn
                  triggerAudienceCue={triggerAudienceCue}
                  onHideAudienceCue={() => setShowAudienceCue(false)}
                  previewProgramDifferent={previewProgramDifferent}
                  takeBusy={takeBusy}
                  lastTakeMode={lastTakeMode}
                  onTake={(mode: "cut" | "auto"): void => {
                    void runTake(mode)
                  }}
                  onPreviewCanvasMouseMove={onPreviewCanvasMouseMove}
                  stopDraggingBlock={stopDraggingBlock}
                  onClearSelectedBlock={() => setSelectedBlockId(null)}
                  stageState={stageState}
                  onStageParticipants={onStageParticipants}
                  previewBlocks={previewBlocks}
                  selectedBlockId={selectedBlockId}
                  setSelectedBlockId={setSelectedBlockId}
                  startDraggingBlock={startDraggingBlock}
                  startResizingBlock={startResizingBlock}
                  programState={programState}
                  programBlocks={programBlocks}
                  showAudienceCue={showAudienceCue}
                  audienceCueRegion={audienceCueRegion}
                  audienceCueMoonMode={audienceCueMoonMode}
                  audienceCueQuestionLabel={audienceCueQuestionLabel}
                  isTransitioning={isTransitioning}
                  transitionFromState={transitionFromState}
                  transitionFromBlocks={transitionFromBlocks}
                  transitionFadingOut={transitionFadingOut}
                  sceneName={sceneName}
                  onSceneNameChange={setSceneName}
                  onSaveScene={saveScene}
                  sceneBusy={sceneBusy}
                  scenes={scenes}
                  onApplyScene={(sceneId) => void applyScene(sceneId)}
                  onClearScreenShare={() =>
                    void clearScreenShare().catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : "Unexpected error")
                    )
                  }
                  onUnpin={() =>
                    void unpinParticipant().catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : "Unexpected error")
                    )
                  }
                  onClearPrimary={() =>
                    void clearPrimaryParticipant().catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : "Unexpected error")
                    )
                  }
                  addTestTextBlock={addTestTextBlock}
                  addTestVideoBlock={addTestVideoBlock}
                  addTestPdfBlock={addTestPdfBlock}
                  addTestImageBlock={addTestImageBlock}
                  onUploadPdf={() => pdfInputRef.current?.click()}
                  onUploadVideo={() => videoInputRef.current?.click()}
                  onUploadImage={() => imageInputRef.current?.click()}
                  duplicateSelectedBlock={duplicateSelectedBlock}
                  bringSelectedBlockToFront={bringSelectedBlockToFront}
                  deleteSelectedBlock={deleteSelectedBlock}
                />
              </div>
              <ProducerRightRail
                participants={participants}
                stageIds={stageIds}
                selectedBlock={selectedBlock}
                onToggleHidden={toggleSelectedBlockHidden}
                onUpdateOpacity={updateSelectedBlockOpacity}
                onUpdateLabel={updateSelectedBlockLabel}
                onUpdatePosition={updateSelectedBlockPosition}
                onUpdateSize={updateSelectedBlockSize}
                onUpdateSrc={updateSelectedBlockSrc}
                onUpdateTextContent={updateSelectedTextBlockContent}
                stageState={stageState}
                getScreenTrackSid={getScreenTrackSid}
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
            </div>

            <BottomAssetDock scenes={scenes} previewBlocks={previewBlocks} />
          </div>
        </div>
      </div>
    </LiveKitRoom>
  )
}