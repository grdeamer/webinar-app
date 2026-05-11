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