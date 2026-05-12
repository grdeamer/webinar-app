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
import useProducerParticipantActions from "./useProducerParticipantActions"
import useProducerTransport from "./useProducerTransport"
import useProducerCanvasInteractions from "./useProducerCanvasInteractions"
import useProducerPdfDeck from "./useProducerPdfDeck"
import ProducerRoomHeader from "./ProducerRoomHeader"
import CenterSwitcherColumn from "./CenterSwitcherColumn"
import ProducerLeftRail from "./ProducerLeftRail"
import ProducerRightRail from "./ProducerRightRail"
import BroadcastCommandDeck from "./BroadcastCommandDeck"
import BottomAssetDock from "./BottomAssetDock"
import OperationsSyncStrip from "./OperationsSyncStrip"
import useProducerHotkeys from "./useProducerHotkeys"
import useProducerAutoDirectorEffects from "./useProducerAutoDirectorEffects"
import useProducerRoomLifecycle from "./useProducerRoomLifecycle"

import useAudienceCue from "./useAudienceCue"
import {
  type ProducerParticipant,
  type StageState,
} from "./producerRoomTypes"
import type { CinematicTransitionType } from "./commandDeckTypes"
import type { ScreenLayoutPreset } from "./assetDockTypes"
import { broadcastPresenterProgramSource } from "./programTransportUtils"
import {
  getHasProgramSource,
  previewProgramStatesDifferent,
} from "./producerRoomStatusUtils"

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
  const [programSceneId, setProgramSceneId] = useState<string | null>(null)
  const [programSlideLabel, setProgramSlideLabel] = useState<string | null>(null)
  const [programState, setProgramState] = useState<StageState | null>(null)
  const [monitorHeight, setMonitorHeight] = useState(520)
  const handleAsyncError = useCallback((error: unknown) => {
    setError(error instanceof Error ? error.message : "Unexpected error")
  }, [])
  const pdfInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

const {
  showAudienceCue,
  audienceCueRegion,
  audienceCueMoonMode,
  audienceCueQuestionLabel,
  triggerAudienceCue,
  setShowAudienceCue,
} = useAudienceCue()

  const producerScopeLabel = useMemo(() => {
    return sessionId ? `Session ${sessionId.slice(0, 8)}` : "Session"
  }, [sessionId])
  const api = useProducerRoomApi(eventId, sessionId)
  const captureSceneThumbnail = useCallback((): string | null => {
    const layoutLabel = (stageState?.layout ?? screenLayoutPreset ?? "classic")
      .replace("screen_speaker", "screen")
      .replace("speaker_focus", "speaker")
      .toUpperCase()

    const visibleBlocks = previewBlocks.filter((block) => !block.hidden).slice(0, 6)
    const stageCount = stageState?.stage_participant_ids?.length ?? 0
    const hasScreenShare = Boolean(
      stageState?.screen_share_participant_id && stageState?.screen_share_track_id
    )

    const blockRects = visibleBlocks
      .map((block, index) => {
        const x = Math.max(0, Math.min(100, block.x ?? 0))
        const y = Math.max(0, Math.min(100, block.y ?? 0))
        const width = Math.max(6, Math.min(100, block.width ?? 20))
        const height = Math.max(6, Math.min(100, block.height ?? 12))
        const color =
          block.type === "text"
            ? "rgba(125,211,252,0.46)"
            : block.type === "video"
              ? "rgba(52,211,153,0.42)"
              : block.type === "image"
                ? "rgba(196,181,253,0.44)"
                : "rgba(251,191,36,0.42)"

        return `<rect x="${(x / 100) * 320}" y="${(y / 100) * 180}" width="${(width / 100) * 320}" height="${(height / 100) * 180}" rx="8" fill="${color}" stroke="rgba(255,255,255,0.42)" stroke-width="1" opacity="${0.9 - index * 0.06}" />`
      })
      .join("")

    const layoutRects = hasScreenShare
      ? `<rect x="18" y="20" width="205" height="118" rx="14" fill="rgba(56,189,248,0.18)" stroke="rgba(125,211,252,0.35)" />
         <rect x="235" y="26" width="62" height="48" rx="12" fill="rgba(196,181,253,0.16)" stroke="rgba(196,181,253,0.28)" />
         <rect x="235" y="86" width="62" height="48" rx="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" />`
      : stageState?.layout === "solo"
        ? `<rect x="70" y="24" width="180" height="118" rx="18" fill="rgba(56,189,248,0.18)" stroke="rgba(125,211,252,0.35)" />`
        : `<rect x="28" y="26" width="118" height="82" rx="14" fill="rgba(56,189,248,0.15)" stroke="rgba(125,211,252,0.28)" />
           <rect x="174" y="26" width="118" height="82" rx="14" fill="rgba(196,181,253,0.15)" stroke="rgba(196,181,253,0.28)" />
           <rect x="28" y="118" width="118" height="36" rx="10" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.14)" />`

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
      <defs>
        <radialGradient id="bg" cx="22%" cy="18%" r="82%">
          <stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.72" />
          <stop offset="48%" stop-color="#111827" stop-opacity="1" />
          <stop offset="100%" stop-color="#020617" stop-opacity="1" />
        </radialGradient>
        <linearGradient id="shine" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18" />
          <stop offset="38%" stop-color="#ffffff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#bg)" />
      <rect width="320" height="180" fill="url(#shine)" />
      <g opacity="0.55">${layoutRects}</g>
      <g>${blockRects}</g>
      <rect x="0.5" y="0.5" width="319" height="179" rx="18" fill="none" stroke="rgba(255,255,255,0.22)" />
      <rect x="12" y="12" width="74" height="18" rx="9" fill="rgba(0,0,0,0.48)" stroke="rgba(255,255,255,0.16)" />
      <text x="22" y="25" fill="rgba(255,255,255,0.78)" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1.4">${layoutLabel}</text>
      <rect x="226" y="144" width="82" height="20" rx="10" fill="rgba(0,0,0,0.50)" stroke="rgba(255,255,255,0.14)" />
      <text x="238" y="158" fill="rgba(255,255,255,0.70)" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1.2">${stageCount} SRC · ${visibleBlocks.length} FX</text>
    </svg>`

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }, [previewBlocks, screenLayoutPreset, stageState])
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

  const { refreshAll } = useProducerRoomLifecycle({
    api,
    eventId,
    sessionId,
    loadMediaDevices,
    setToken,
    setServerUrl,
    setParticipants,
    setStageState,
    setProgramState,
    setLoadingText,
    setError,
  })

const {
  addToStage,
  removeFromStage,
  pinParticipant,
  unpinParticipant,
  setPrimaryParticipant,
  clearPrimaryParticipant,
} = useProducerParticipantActions({
  api,
  setStageState: (state) => setStageState(state),
})

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
    captureSceneThumbnail,
  })

const { takeProgram } = useProducerTransport({
  runTake,
  sessionId,
  stageState,
  previewBlocks,
  selectedSceneId,
  selectedTransitionDurationMs,
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
    const {
    localPdfDeck,
    handleProducerPdfUpload,
    sendSlideToPreview,
    takeSlide,
  } = useProducerPdfDeck({
    eventId,
    sessionId,
    setPreviewBlocks,
    setSelectedSceneId,
    setSceneName,
    setError,
    setProgramSlideLabel,
    handlePdfUpload,
    takeProgram,
  })

  useProducerHotkeys({
    scenes,
    applyScene,
    applySceneAndTake,
    flashSceneHotkey,
    takeProgram,
  })

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
const {
  startDraggingBlock,
  startResizingBlock,
  onPreviewCanvasMouseMove,
  stopDraggingBlock,
} = useProducerCanvasInteractions({
  previewBlocks,
  setPreviewBlocks,
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
})
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

  function getScreenTrackSid(participant: ProducerParticipant) {
    const track = participant.tracks.find((t) => t.source === 3 || t.source === "SCREEN_SHARE")
    return track?.sid ?? null
  }


  useEffect(() => {
    if (typeof stageState?.auto_director_enabled === "boolean") {
      setAutoDirectorEnabled(stageState.auto_director_enabled)
    }
  }, [stageState?.auto_director_enabled])

  const { stageIds, onStageParticipants } = useProducerAutoDirectorEffects({
    autoDirectorEnabled,
    stageState,
    participants,
    setScreenShare,
    clearScreenShare,
  })



  const previewProgramDifferent = useMemo(
    () =>
      previewProgramStatesDifferent({
        stageState,
        programState,
        previewBlocks,
        programBlocks,
      }),
    [stageState, programState, previewBlocks, programBlocks]
  )

  const hasProgramSource = useMemo(
    () =>
      getHasProgramSource({
        programBlocks,
        programState,
      }),
    [programBlocks, programState]
  )

  const hasScreenShareRoute = Boolean(
    stageState?.screen_share_participant_id && stageState?.screen_share_track_id
  )

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
  return () => {
    setShowAudienceCue(false)
    stopLocalPreviewStream()
  }
}, [setShowAudienceCue, stopLocalPreviewStream])

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