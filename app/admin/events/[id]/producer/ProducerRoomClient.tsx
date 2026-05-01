"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import type { JSX } from "react"
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react"

import useProducerRoomApi from "./useProducerRoomApi"
import useProducerBlocks, { type PreviewBlock } from "./useProducerBlocks"
import useProducerBlockEditor from "./useProducerBlockEditor"
import useProducerUploads from "./useProducerUploads"
import useProducerTransitions from "./useProducerTransitions"
import useProducerDevices from "./useProducerDevices"
import ProducerRoomHeader from "./ProducerRoomHeader"
import CenterSwitcherColumn from "./CenterSwitcherColumn"
import ProducerLeftRail from "./ProducerLeftRail"
import ProducerRightRail from "./ProducerRightRail"
import BroadcastCommandDeck from "./BroadcastCommandDeck"
import BottomAssetDock from "./BottomAssetDock"
import {
  type ProducerParticipant,
  type StageState,
  type SceneSnapshot,
} from "./producerRoomTypes"
import type { CinematicTransitionType } from "./commandDeckTypes"
import { renderBlockContent, renderPlacedBlocks } from "./producerRoomRenderers"
import {
  AudienceOriginTestPanel,
  MediaBlocksPanel,
  MonitorHeader,
  ScenesStatusPanel,
} from "./producerRoomPanels"

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


  const [scenes, setScenes] = useState<any[]>([])
  const [sceneName, setSceneName] = useState("")
  const [sceneBusy, setSceneBusy] = useState(false)
  const [localSceneSnapshots, setLocalSceneSnapshots] = useState<SceneSnapshot[]>([])
  const [deletedSceneIds, setDeletedSceneIds] = useState<Set<string>>(() => new Set())
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)

  const [autoDirectorEnabled, setAutoDirectorEnabled] = useState(true)
  const [screenLayoutPreset, setScreenLayoutPreset] = useState<
  "classic" | "brand" | "speaker_focus" | "fullscreen"
>("classic")
  const [programFlashActive, setProgramFlashActive] = useState(false)
  const [programState, setProgramState] = useState<StageState | null>(null)
  const [monitorHeight, setMonitorHeight] = useState(520)
  const pdfInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)


  
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

  const {
    updateTextContent: updateSelectedTextBlockContent,
    updateLabel: updateSelectedBlockLabel,
    updateSrc: updateSelectedBlockSrc,
    updateSize: updateSelectedBlockSize,
    updateOpacity: updateSelectedBlockOpacity,
    updatePosition: updateSelectedBlockPosition,
    toggleHidden: toggleSelectedBlockHidden,
  } = useProducerBlockEditor({
    selectedBlockId,
    setPreviewBlocks,
  })

  const { handlePdfUpload, handleVideoUpload, handleImageUpload } = useProducerUploads({
    setPreviewBlocks,
  })

  const {
    takeBusy,
    lastTakeMode,
    isTransitioning,
    transitionFromState,
    transitionFromBlocks,
    transitionFadingOut,
    runTake,
  } = useProducerTransitions({
    api,
    programState,
    programBlocks,
    previewBlocks,
    setProgramState,
    setProgramBlocks,
    setError,
  })


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
    const nextScenes: Array<{ id: string | number }> = Array.isArray(data?.scenes)
      ? data.scenes
      : []

    setScenes(nextScenes.filter((scene) => !deletedSceneIds.has(String(scene.id))))
  }

  const {
    videoDevices,
    audioDevices,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    deviceAccessReady,
    localMicLevel,
    loadMediaDevices,
    stopLocalPreviewStream,
    setSelectedVideoDeviceId,
    setSelectedAudioDeviceId,
  } = useProducerDevices()

  const refreshAll = useCallback(async () => {
    await Promise.all([loadParticipants(), loadStageState(), loadProgramState(), loadScenes()])
  }, [deletedSceneIds])

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
    if (!sceneName.trim() && !selectedSceneId) {
      setError("Scene name required")
      return
    }

    try {
      setSceneBusy(true)

      const targetId = selectedSceneId

      const data = await api.saveScene(sceneName || "Updated Scene")

      const savedSceneId = String(targetId ?? data?.scene?.id ?? crypto.randomUUID())

      setLocalSceneSnapshots((prev) => {
        const next = prev.filter((s) => String(s.id) !== savedSceneId)
        next.push({
          id: savedSceneId,
          name: sceneName || prev.find(s => String(s.id) === savedSceneId)?.name || "Scene",
          stageState: stageState ? { ...stageState } : null,
          previewBlocks: previewBlocks.map((b) => ({ ...b })),
          screenLayoutPreset,
        })
        return next
      })

      setSceneName("")
      setSelectedSceneId(null)

      await loadScenes()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSceneBusy(false)
    }
  }

  async function applyScene(sceneId: string) {
    try {
      setSelectedSceneId(String(sceneId))
      setSceneBusy(true)

      const data = await api.applyScene(sceneId)

      setStageState(data.state)

      await refreshAll()

      const localSnapshot = localSceneSnapshots.find((s) => String(s.id) === String(sceneId))
      if (localSnapshot) {
        const preset = localSnapshot.screenLayoutPreset ?? "classic"

        setPreviewBlocks(localSnapshot.previewBlocks.map((b) => ({ ...b })))
        setScreenLayoutPreset(preset)
        window.setTimeout(() => setScreenLayoutPreset(preset), 150)
        setSelectedBlockId(null)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSceneBusy(false)
    }
  }

  async function deleteScene(sceneId: string) {
    try {
      setSceneBusy(true)
      setError(null)
      setDeletedSceneIds((prev) => {
  const next = new Set(prev)
  next.add(String(sceneId))
  return next
})

      // For now, remove scene from the live producer UI/local snapshots.
      // Server-side scene deletion can be wired once the scenes API exposes DELETE.
      setLocalSceneSnapshots((prev) => prev.filter((scene) => String(scene.id) !== String(sceneId)))
      setScenes((prev) => prev.filter((scene) => String(scene.id) !== String(sceneId)))
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
    if (!stageState) return

    async function applyPreset() {
      try {
        // All presets require screen + speaker layout
        await setLayout("screen_speaker")

        // Future: we will refine positioning via blocks
        // For now, this ensures layout actually changes
      } catch (e) {
        console.error("Failed applying screen preset", e)
      }
    }

    // Only react when preset changes
    void applyPreset()
  }, [screenLayoutPreset])

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
            onTake={(
              mode: "cut" | "auto",
              transitionType?: CinematicTransitionType
            ): void => {
              void runTake(mode, transitionType)
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
                screenLayoutPreset={screenLayoutPreset}
                onSetScreenLayoutPreset={setScreenLayoutPreset}
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
                  screenLayoutPreset={screenLayoutPreset}
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
                  selectedSceneId={selectedSceneId}
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

            <BottomAssetDock
              scenes={scenes}
              previewBlocks={previewBlocks}
              onDeleteScene={(sceneId) => void deleteScene(sceneId)}
            />
          </div>
        </div>
      </div>
    </LiveKitRoom>
  )
}