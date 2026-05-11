"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import type { JSX } from "react"
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react"

import useProducerRoomApi from "./useProducerRoomApi"
import useProducerBlocks from "./useProducerBlocks"
import useProducerBlockEditor from "./useProducerBlockEditor"
import useProducerUploads from "./useProducerUploads"
import useProducerTransitions from "./useProducerTransitions"
import useProducerDevices from "./useProducerDevices"
import useProducerScenes from "./useProducerScenes"
import ProducerRoomHeader from "./ProducerRoomHeader"
import CenterSwitcherColumn from "./CenterSwitcherColumn"
import ProducerLeftRail from "./ProducerLeftRail"
import ProducerRightRail from "./ProducerRightRail"
import BroadcastCommandDeck from "./BroadcastCommandDeck"
import BottomAssetDock from "./BottomAssetDock"
import OperationsSyncStrip from "./OperationsSyncStrip"
import {
  type ProducerParticipant,
  type StageState,
} from "./producerRoomTypes"
import type { CinematicTransitionType } from "./commandDeckTypes"
import type { ScreenLayoutPreset } from "./assetDockTypes"
import { broadcastPresenterProgramSource } from "./programTransportUtils"
import {
  type LocalPdfDeck,
  estimatePdfPageCount,
} from "./pdfDeckUtils"


function isTypingTarget(target: EventTarget | null): boolean {
  const tag = (target as HTMLElement | null)?.tagName?.toLowerCase()
  return tag === "input" || tag === "textarea" || tag === "select"
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

  const [autoDirectorEnabled, setAutoDirectorEnabled] = useState(true)
  const [screenLayoutPreset, setScreenLayoutPreset] = useState<ScreenLayoutPreset>("classic")
  const [selectedTransitionDurationMs] = useState(600)
  const [lastTransportActionAt, setLastTransportActionAt] = useState<number | null>(null)
  const [programState, setProgramState] = useState<StageState | null>(null)
  const [programSceneId, setProgramSceneId] = useState<string | null>(null)
  const [programSlideLabel, setProgramSlideLabel] = useState<string | null>(null)
  const [localPdfDeck, setLocalPdfDeck] = useState<LocalPdfDeck | null>(null)
  const [monitorHeight, setMonitorHeight] = useState(520)
  const handleAsyncError = useCallback((error: unknown) => {
    setError(error instanceof Error ? error.message : "Unexpected error")
  }, [])
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
  const localPdfDeckStorageKey = useMemo(
    () => `jupiter:producer:${eventId}:${sessionId}:pdfDeck`,
    [eventId, sessionId]
  )
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

  async function handleProducerPdfUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null

    await handlePdfUpload(event)

    if (!file) return

    const src = URL.createObjectURL(file)
    const name = file.name.replace(/\.pdf$/i, "")

    try {
      const pageCount = await estimatePdfPageCount(file)
      setLocalPdfDeck({
        name,
        pageCount,
        src,
      })
    } catch (_err: unknown) {
      setLocalPdfDeck({
        name,
        pageCount: 1,
        src,
      })
    }
  }

  useEffect(() => {
    try {
      const rawDeck = window.localStorage.getItem(localPdfDeckStorageKey)
      if (!rawDeck) return

      const parsedDeck = JSON.parse(rawDeck) as Partial<LocalPdfDeck>
      if (!parsedDeck.name || typeof parsedDeck.pageCount !== "number") return

      setLocalPdfDeck({
        name: parsedDeck.name,
        pageCount: Math.max(1, parsedDeck.pageCount),
        src: null,
      })
    } catch (_err: unknown) {
      // Ignore corrupted local deck cache.
    }
  }, [localPdfDeckStorageKey])

  useEffect(() => {
    try {
      if (!localPdfDeck) {
        window.localStorage.removeItem(localPdfDeckStorageKey)
        return
      }

      window.localStorage.setItem(
        localPdfDeckStorageKey,
        JSON.stringify({
          name: localPdfDeck.name,
          pageCount: localPdfDeck.pageCount,
        })
      )
    } catch (_err: unknown) {
      // Ignore storage failures; deck upload still works for the current session.
    }
  }, [localPdfDeck, localPdfDeckStorageKey])

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
    await Promise.all([loadParticipants(), loadStageState(), loadProgramState()])
  }, [])

  const addToStage = useCallback(
    async (identity: string) => {
      const data = await api.addToStage(identity)
      setStageState(data.state)
    },
    [api]
  )

  const removeFromStage = useCallback(
    async (identity: string) => {
      const data = await api.removeFromStage(identity)
      setStageState(data.state)
    },
    [api]
  )

  const pinParticipant = useCallback(
    async (identity: string) => {
      const data = await api.pinParticipant(identity)
      setStageState(data.state)
    },
    [api]
  )

  const unpinParticipant = useCallback(async () => {
    const data = await api.unpinParticipant()
    setStageState(data.state)
  }, [api])

  const setPrimaryParticipant = useCallback(
    async (identity: string) => {
      const data = await api.setPrimaryParticipant(identity)
      setStageState(data.state)
    },
    [api]
  )

  const clearPrimaryParticipant = useCallback(async () => {
    const data = await api.clearPrimaryParticipant()
    setStageState(data.state)
  }, [api])

  const {
    scenes,
    sceneName,
    sceneBusy,
    selectedSceneId,
    selectedSceneLabel,
    hotkeySceneId,
    hotkeySceneLabelText,
    setSceneName,
    setSelectedSceneId,
    loadScenes,
    saveScene,
    applyScene,
    deleteScene,
    startNewScene,
    flashSceneHotkey,
  } = useProducerScenes({
    api,
    stageState,
    previewBlocks,
    screenLayoutPreset,
    setStageState,
    setPreviewBlocks,
    setSelectedBlockId,
    refreshAll,
  })

  async function applySceneAndTake(sceneId: string) {
    await applyScene(sceneId)
    window.setTimeout(() => {
      takeProgram("cut", undefined, {
        sceneId,
        slideLabel: null,
      })
    }, 175)
  }

  // Helper function to broadcast the current Program source
  

  function takeProgram(
    mode: "cut" | "auto",
    transitionType?: CinematicTransitionType,
    options?: {
      sceneId?: string | null
      slideLabel?: string | null
      transitionDurationMs?: number
    }
  ) {
    const durationMs = options?.transitionDurationMs ?? selectedTransitionDurationMs

    setLastTransportActionAt(Date.now())
    void runTake(mode, transitionType)
    broadcastPresenterProgramSource({
  mode,
  transitionType,
  transitionDurationMs: durationMs,
  sessionId,
  stageState,
  previewBlocks,
})
    setProgramSceneId(options?.sceneId ?? selectedSceneId)
    setProgramSlideLabel(options?.slideLabel ?? null)
  }

  function sendSlideToPreview(slideIndex: number) {
    setSelectedSceneId(null)
    setError(null)
    setProgramSlideLabel(null)

    const slideLabel = localPdfDeck?.name
      ? `${localPdfDeck.name} · Slide ${slideIndex}`
      : `Slide ${slideIndex}`

    setPreviewBlocks((prev) => {
      const existingSlideBlock = prev.find((block) => {
        if (block.type !== "pdf") return false
        if (localPdfDeck?.src && block.src === localPdfDeck.src) return true
        const label = block.label ?? ""
        return label.includes("Slide ")
      })

      if (existingSlideBlock) {
        return prev.map((block) =>
          block.id === existingSlideBlock.id
            ? {
                ...block,
                src: localPdfDeck?.src ?? block.src,
                label: slideLabel,
              }
            : block
        )
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "pdf",
          src: localPdfDeck?.src ?? undefined,
          x: 10,
          y: 10,
          width: 60,
          height: 60,
          zIndex: prev.length + 1,
          label: slideLabel,
        },
      ]
    })

    setSceneName(`${slideLabel} Preview`)
  }

  function takeSlide(slideIndex: number) {
    sendSlideToPreview(slideIndex)
    window.setTimeout(() => {
      takeProgram("cut", undefined, {
        sceneId: null,
        slideLabel: localPdfDeck?.name
          ? `${localPdfDeck.name} · Slide ${slideIndex}`
          : `Slide ${slideIndex}`,
      })
    }, 175)
  }


  const sceneActions = useMemo(
    () => ({
      startNewScene,
      saveScene,
      applyScene,
      applySceneAndTake,
      deleteScene,
      flashSceneHotkey,
    }),
    [
      saveScene,
      applyScene,
      applySceneAndTake,
      deleteScene,
      flashSceneHotkey,
    ]
  )

  const transportActions = useMemo(
    () => ({
      takeProgram,
      broadcastPresenterProgramSource,
      sendSlideToPreview,
      takeSlide,
    }),
    [
      takeProgram,
      broadcastPresenterProgramSource,
      sendSlideToPreview,
      takeSlide,
    ]
  )

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
      } catch (err: unknown) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Failed to load producer room")
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

  const handleTransportHotkeys = useCallback(
    (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const key = event.key.toLowerCase()

      if (event.code === "Space" || key === "t" || key === "c") {
        event.preventDefault()
        takeProgram("cut")
        return
      }

      if (key === "a") {
        event.preventDefault()
        takeProgram("auto", "fade")
      }
    },
    [takeProgram]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleTransportHotkeys)

    return () => {
      window.removeEventListener("keydown", handleTransportHotkeys)
    }
  }, [handleTransportHotkeys])

  const handleSceneHotkeys = useCallback(
    (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      // Shift + number = apply + TAKE
      if (event.shiftKey && event.key >= "1" && event.key <= "9") {
        const index = Number(event.key) - 1
        const scene = scenes[index]

        if (scene) {
          event.preventDefault()
          flashSceneHotkey(scene.id)
          void applySceneAndTake(scene.id)
        }

        return
      }

      // Number keys 1–9 = apply scenes
      if (event.key >= "1" && event.key <= "9") {
        const index = Number(event.key) - 1
        const scene = scenes[index]

        if (scene) {
          event.preventDefault()
          flashSceneHotkey(scene.id)
          void applyScene(scene.id)
        }
      }
    },
    [scenes, applyScene, applySceneAndTake]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleSceneHotkeys)

    return () => {
      window.removeEventListener("keydown", handleSceneHotkeys)
    }
  }, [handleSceneHotkeys])

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

  const hasProgramSource = useMemo(() => {
    if (programBlocks.some((block) => !block.hidden)) return true
    if (programState?.screen_share_participant_id) return true
    if (programState?.primary_participant_id) return true
    if (programState?.pinned_participant_id) return true
    return Boolean(programState?.stage_participant_ids?.length)
  }, [programBlocks, programState])

  const hasScreenShareRoute = Boolean(
    stageState?.screen_share_participant_id && stageState?.screen_share_track_id
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
      } catch (e: unknown) {
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
            onChange={(event) => {
              void handleProducerPdfUpload(event)
            }}
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
          <OperationsSyncStrip
            previewProgramDifferent={previewProgramDifferent}
            takeBusy={takeBusy}
            selectedSceneLabel={selectedSceneLabel}
            programSlideLabel={programSlideLabel}
            onStageCount={onStageParticipants.length}
            participantCount={participants.length}
            previewBlockCount={previewBlocks.length}
            programBlockCount={programBlocks.length}
            hasProgramSource={hasProgramSource}
            hasScreenShare={hasScreenShareRoute}
            lastTakeMode={lastTakeMode}
            hotkeySceneLabel={hotkeySceneLabelText}
            lastTransportActionAt={lastTransportActionAt}
            isLive={Boolean(programState?.is_live)}
            layout={stageState?.layout}
          />
          <BroadcastCommandDeck
            isLive={Boolean(programState?.is_live)}
            audienceCount={participants.length}
            onStageCount={onStageParticipants.length}
            previewProgramDifferent={previewProgramDifferent}
            takeBusy={takeBusy}
            onTake={(
              mode: "cut" | "auto",
              transitionType?: CinematicTransitionType,
              transitionDurationMs?: number
            ): void => {
              takeProgram(mode, transitionType, { transitionDurationMs })
            }}
          />
          <div className="flex-1 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.10),transparent_34%),radial-gradient(circle_at_100%_20%,rgba(168,85,247,0.08),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(1,3,10,1))] px-3 py-3 md:px-4 xl:px-5 xl:py-4 2xl:px-6">
            <div className="grid w-full items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)_320px] xl:grid-cols-[265px_minmax(0,1fr)_345px] 2xl:grid-cols-[285px_minmax(0,1fr)_375px] [&_button]:transition-all [&_button]:duration-200 [&_button:hover]:-translate-y-0.5 [&_button:active]:translate-y-0">
              <ProducerLeftRail
                takeBusy={takeBusy}
                previewProgramDifferent={previewProgramDifferent}
                onTake={() => {
                  takeProgram("cut")
                }}
                onGoLive={() => void goLive().catch(handleAsyncError)}
                onGoOffAir={() => void goOffAir().catch(handleAsyncError)}
                layout={stageState?.layout}
                onSetLayout={(layout) => void setLayout(layout).catch(handleAsyncError)}
                autoDirectorEnabled={autoDirectorEnabled}
                screenLayoutPreset={screenLayoutPreset}
                onSetScreenLayoutPreset={setScreenLayoutPreset}
                onToggleAutoDirector={() =>
                  void setAutoDirector(!autoDirectorEnabled).catch(handleAsyncError)
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
                    takeProgram(mode)
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
                  selectedSceneLabel={selectedSceneLabel}
                  onApplyScene={(sceneId) => void applyScene(sceneId)}
                  onClearScreenShare={() =>
                    void clearScreenShare().catch(handleAsyncError)
                  }
                  onUnpin={() => void unpinParticipant().catch(handleAsyncError)}
                  onClearPrimary={() => void clearPrimaryParticipant().catch(handleAsyncError)}
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
                onAddToStage={(identity) => void addToStage(identity).catch(handleAsyncError)}
                onSetScreenShare={(participantId, trackId) =>
                  void setScreenShare(participantId, trackId).catch(handleAsyncError)
                }
                onClearPrimary={() => void clearPrimaryParticipant().catch(handleAsyncError)}
                onSetPrimary={(identity) =>
                  void setPrimaryParticipant(identity).catch(handleAsyncError)
                }
                onUnpin={() => void unpinParticipant().catch(handleAsyncError)}
                onPin={(identity) => void pinParticipant(identity).catch(handleAsyncError)}
                onRemoveFromStage={(identity) =>
                  void removeFromStage(identity).catch(handleAsyncError)
                }
                onError={setError}
              />
            </div>

            <BottomAssetDock
              scenes={scenes}
              selectedSceneId={selectedSceneId}
              programSceneId={programSceneId}
              programSlideLabel={programSlideLabel}
              hotkeySceneId={hotkeySceneId}
              previewBlocks={previewBlocks}
              slideDeckName={localPdfDeck?.name ?? null}
              slideCount={localPdfDeck?.pageCount ?? 8}
              onAddScene={sceneActions.startNewScene}
              onUploadPdf={() => pdfInputRef.current?.click()}
              onSendSlideToPreview={transportActions.sendSlideToPreview}
              onTakeSlide={transportActions.takeSlide}
              onApplyScene={(sceneId) => void sceneActions.applyScene(sceneId)}
              onDoubleClickScene={(sceneId) => void sceneActions.applySceneAndTake(sceneId)}
              onDeleteScene={(sceneId) => void sceneActions.deleteScene(sceneId)}
            />
          </div>
        </div>
      </div>
    </LiveKitRoom>
  )
}