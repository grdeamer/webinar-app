"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { JSX } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";

import useProducerRoomApi from "./useProducerRoomApi";
import useProducerBlocks from "./useProducerBlocks";
import useProducerBlockEditor from "./useProducerBlockEditor";
import useProducerUploads from "./useProducerUploads";
import useProducerTransitions from "./useProducerTransitions";
import useProducerDevices from "./useProducerDevices";
import useProducerScenes from "./useProducerScenes";
import useProducerParticipantActions from "./useProducerParticipantActions";
import useProducerTransport from "./useProducerTransport";
import useProducerCanvasInteractions from "./useProducerCanvasInteractions";
import useProducerPdfDeck from "./useProducerPdfDeck";
import CenterSwitcherColumn from "./CenterSwitcherColumn";
import ProducerLeftRail from "./ProducerLeftRail";
import ProducerRightRail from "./ProducerRightRail";
import BottomAssetDock from "./BottomAssetDock";
import ProducerRoomTopChrome from "./ProducerRoomTopChrome";
import ProducerRoomWorkspace from "./ProducerRoomWorkspace";
import {
  ProducerRoomBackground,
  ProducerRoomCenterColumn,
  ProducerRoomContentStack,
  ProducerRoomGrid,
  ProducerRoomWorkspaceFrame,
  ProducerUploadInputs,
} from "./ProducerRoomShell";
import useProducerHotkeys from "./useProducerHotkeys";
import useProducerAutoDirectorEffects from "./useProducerAutoDirectorEffects";
import useProducerRoomLifecycle from "./useProducerRoomLifecycle";

import useAudienceCue from "./useAudienceCue";
import { type ProducerParticipant, type StageState } from "./producerRoomTypes";
import type { CinematicTransitionType } from "./commandDeckTypes";
import type { ScreenLayoutPreset } from "./assetDockTypes";
import { broadcastPresenterProgramSource } from "./programTransportUtils";

import {
  getHasProgramSource,
  previewProgramStatesDifferent,
} from "./producerRoomStatusUtils";

export default function ProducerRoomClient({
  eventId,
  sessionId,
}: {
  eventId: string;
  sessionId: string;
}): JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ProducerParticipant[]>([]);
  const [stageState, setStageState] = useState<StageState | null>(null);
  const [loadingText, setLoadingText] = useState("Connecting producer...");
  const [error, setError] = useState<string | null>(null);

  const [autoDirectorEnabled, setAutoDirectorEnabled] = useState(true);
  const [screenLayoutPreset, setScreenLayoutPreset] =
    useState<ScreenLayoutPreset>("classic");
  const [selectedTransitionDurationMs] = useState(600);
  const [lastTransportActionAt, setLastTransportActionAt] = useState<
    number | null
  >(null);
  const [programSceneId, setProgramSceneId] = useState<string | null>(null);
  const [programSlideLabel, setProgramSlideLabel] = useState<string | null>(
    null,
  );
  const [programState, setProgramState] = useState<StageState | null>(null);
  const [monitorHeight, setMonitorHeight] = useState(520);
  const handleAsyncError = useCallback((error: unknown) => {
    setError(error instanceof Error ? error.message : "Unexpected error");
  }, []);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const {
    showAudienceCue,
    audienceCueRegion,
    audienceCueMoonMode,
    audienceCueQuestionLabel,
    triggerAudienceCue,
    setShowAudienceCue,
  } = useAudienceCue();

  const producerScopeLabel = useMemo(() => {
    return sessionId ? `Session ${sessionId.slice(0, 8)}` : "Session";
  }, [sessionId]);
  const api = useProducerRoomApi(eventId, sessionId);
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
  } = useProducerBlocks();

  const captureSceneThumbnail = useCallback((): string | null => {
    const layoutLabel = (stageState?.layout ?? screenLayoutPreset ?? "classic")
      .replace("screen_speaker", "screen")
      .replace("speaker_focus", "speaker")
      .toUpperCase();

    const visibleBlocks = previewBlocks
      .filter((block) => !block.hidden)
      .slice(0, 6);
    const stageCount = stageState?.stage_participant_ids?.length ?? 0;
    const hasScreenShare = Boolean(
      stageState?.screen_share_participant_id &&
      stageState?.screen_share_track_id,
    );

    const blockRects = visibleBlocks
      .map((block, index) => {
        const x = Math.max(0, Math.min(100, block.x ?? 0));
        const y = Math.max(0, Math.min(100, block.y ?? 0));
        const width = Math.max(6, Math.min(100, block.width ?? 20));
        const height = Math.max(6, Math.min(100, block.height ?? 12));
        const color =
          block.type === "text"
            ? "rgba(125,211,252,0.46)"
            : block.type === "video"
              ? "rgba(52,211,153,0.42)"
              : block.type === "image"
                ? "rgba(196,181,253,0.44)"
                : "rgba(251,191,36,0.42)";

        return `<rect x="${(x / 100) * 320}" y="${(y / 100) * 180}" width="${(width / 100) * 320}" height="${(height / 100) * 180}" rx="8" fill="${color}" stroke="rgba(255,255,255,0.42)" stroke-width="1" opacity="${0.9 - index * 0.06}" />`;
      })
      .join("");

    const layoutRects = hasScreenShare
      ? `<rect x="18" y="20" width="205" height="118" rx="14" fill="rgba(56,189,248,0.18)" stroke="rgba(125,211,252,0.35)" />
         <rect x="235" y="26" width="62" height="48" rx="12" fill="rgba(196,181,253,0.16)" stroke="rgba(196,181,253,0.28)" />
         <rect x="235" y="86" width="62" height="48" rx="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)" />`
      : stageState?.layout === "solo"
        ? `<rect x="70" y="24" width="180" height="118" rx="18" fill="rgba(56,189,248,0.18)" stroke="rgba(125,211,252,0.35)" />`
        : `<rect x="28" y="26" width="118" height="82" rx="14" fill="rgba(56,189,248,0.15)" stroke="rgba(125,211,252,0.28)" />
           <rect x="174" y="26" width="118" height="82" rx="14" fill="rgba(196,181,253,0.15)" stroke="rgba(196,181,253,0.28)" />
           <rect x="28" y="118" width="118" height="36" rx="10" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.14)" />`;

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
    </svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [previewBlocks, screenLayoutPreset, stageState]);

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
  });

  const { handlePdfUpload, handleVideoUpload, handleImageUpload } =
    useProducerUploads({
      setPreviewBlocks,
    });

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
  });

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
  } = useProducerDevices();

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
  });

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
  });

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
  });

  const { takeProgram } = useProducerTransport({
    runTake,
    sessionId,
    stageState,
    previewBlocks,
    selectedSceneId,
    selectedTransitionDurationMs,
  });

  const applySceneAndTake = useCallback(
    async (sceneId: string): Promise<void> => {
      await applyScene(sceneId);

      window.setTimeout(() => {
        takeProgram("cut", undefined, {
          sceneId,
          slideLabel: null,
        });
      }, 175);
    },
    [applyScene, takeProgram],
  );

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
      startNewScene,
      saveScene,
      applyScene,
      applySceneAndTake,
      deleteScene,
      flashSceneHotkey,
    ],
  );
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
  });

  useProducerHotkeys({
    scenes,
    applyScene,
    applySceneAndTake,
    flashSceneHotkey,
    takeProgram,
  });

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
    ],
  );

  const handleCommandDeckTake = useCallback(
    (
      mode: "cut" | "auto",
      transitionType?: CinematicTransitionType,
      transitionDurationMs?: number,
    ): void => {
      takeProgram(mode, transitionType, { transitionDurationMs });
    },
    [takeProgram],
  );

  const handleLeftRailTake = useCallback((): void => {
    takeProgram("cut");
  }, [takeProgram]);

  const handleCenterSwitcherTake = useCallback(
    (mode: "cut" | "auto"): void => {
      takeProgram(mode);
    },
    [takeProgram],
  );

  const handleGoLive = useCallback((): void => {
    void goLive().catch(handleAsyncError);
  }, [goLive, handleAsyncError]);

  const handleGoOffAir = useCallback((): void => {
    void goOffAir().catch(handleAsyncError);
  }, [goOffAir, handleAsyncError]);

  const handleSetLayout = useCallback(
    (layout: "solo" | "grid" | "screen_speaker"): void => {
      void setLayout(layout).catch(handleAsyncError);
    },
    [setLayout, handleAsyncError],
  );

  const handleToggleAutoDirector = useCallback((): void => {
    void setAutoDirector(!autoDirectorEnabled).catch(handleAsyncError);
  }, [autoDirectorEnabled, setAutoDirector, handleAsyncError]);

  const handleHideAudienceCue = useCallback((): void => {
    setShowAudienceCue(false);
  }, [setShowAudienceCue]);

  const handleClearSelectedBlock = useCallback((): void => {
    setSelectedBlockId(null);
  }, [setSelectedBlockId]);

  const handleApplyScene = useCallback(
    (sceneId: string): void => {
      void applyScene(sceneId);
    },
    [applyScene],
  );

  const handleClearScreenShare = useCallback((): void => {
    void clearScreenShare().catch(handleAsyncError);
  }, [clearScreenShare, handleAsyncError]);

  const handleUnpinParticipant = useCallback((): void => {
    void unpinParticipant().catch(handleAsyncError);
  }, [unpinParticipant, handleAsyncError]);

  const handleClearPrimaryParticipant = useCallback((): void => {
    void clearPrimaryParticipant().catch(handleAsyncError);
  }, [clearPrimaryParticipant, handleAsyncError]);

  const handleUploadPdfClick = useCallback((): void => {
    pdfInputRef.current?.click();
  }, []);

  const handleUploadVideoClick = useCallback((): void => {
    videoInputRef.current?.click();
  }, []);

  const handleUploadImageClick = useCallback((): void => {
    imageInputRef.current?.click();
  }, []);

  const handleProducerPdfInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      void handleProducerPdfUpload(event);
    },
    [handleProducerPdfUpload],
  );

  const handleAddParticipantToStage = useCallback(
    (identity: string): void => {
      void addToStage(identity).catch(handleAsyncError);
    },
    [addToStage, handleAsyncError],
  );

  const handleSetParticipantScreenShare = useCallback(
    (participantId: string, trackId: string): void => {
      void setScreenShare(participantId, trackId).catch(handleAsyncError);
    },
    [setScreenShare, handleAsyncError],
  );

  const handleSetPrimaryParticipant = useCallback(
    (identity: string): void => {
      void setPrimaryParticipant(identity).catch(handleAsyncError);
    },
    [setPrimaryParticipant, handleAsyncError],
  );

  const handlePinParticipant = useCallback(
    (identity: string): void => {
      void pinParticipant(identity).catch(handleAsyncError);
    },
    [pinParticipant, handleAsyncError],
  );

  const handleRemoveParticipantFromStage = useCallback(
    (identity: string): void => {
      void removeFromStage(identity).catch(handleAsyncError);
    },
    [removeFromStage, handleAsyncError],
  );

  const handleDockApplyScene = useCallback(
    (sceneId: string): void => {
      void sceneActions.applyScene(sceneId);
    },
    [sceneActions],
  );

  const handleDockApplySceneAndTake = useCallback(
    (sceneId: string): void => {
      void sceneActions.applySceneAndTake(sceneId);
    },
    [sceneActions],
  );

  const handleDockDeleteScene = useCallback(
    (sceneId: string): void => {
      void sceneActions.deleteScene(sceneId);
    },
    [sceneActions],
  );
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
  });
  async function setAutoDirector(enabled: boolean) {
    const data = await api.setAutoDirector(enabled);
    setStageState(data.state);
    setAutoDirectorEnabled(Boolean(data?.state?.auto_director_enabled));
  }

  async function goLive() {
    const data = await api.goLive();
    setStageState(data.state);
  }

  async function goOffAir() {
    const data = await api.goOffAir();
    setStageState(data.state);
  }

  async function setLayout(layout: "solo" | "grid" | "screen_speaker") {
    const data = await api.setLayout(layout);
    setStageState(data.state);
  }

  async function setScreenShare(participantId: string, trackId: string) {
    const data = await api.setScreenShare(participantId, trackId);
    setStageState(data.state);
  }

  async function clearScreenShare() {
    const data = await api.clearScreenShare();
    setStageState(data.state);
  }

  const getScreenTrackSid = useCallback(
    (participant: ProducerParticipant): string | null => {
      const track = participant.tracks.find(
        (t) => t.source === 3 || t.source === "SCREEN_SHARE",
      );
      return track?.sid ?? null;
    },
    [],
  );

  useEffect(() => {
    if (typeof stageState?.auto_director_enabled === "boolean") {
      setAutoDirectorEnabled(stageState.auto_director_enabled);
    }
  }, [stageState?.auto_director_enabled]);

  const { stageIds, onStageParticipants } = useProducerAutoDirectorEffects({
    autoDirectorEnabled,
    stageState,
    participants,
    setScreenShare,
    clearScreenShare,
  });

  const previewProgramDifferent = useMemo(
    () =>
      previewProgramStatesDifferent({
        stageState,
        programState,
        previewBlocks,
        programBlocks,
      }),
    [stageState, programState, previewBlocks, programBlocks],
  );

  const hasProgramSource = useMemo(
    () =>
      getHasProgramSource({
        programBlocks,
        programState,
      }),
    [programBlocks, programState],
  );

  const hasScreenShareRoute = Boolean(
    stageState?.screen_share_participant_id &&
    stageState?.screen_share_track_id,
  );

  const isProgramLive = Boolean(programState?.is_live);

  useEffect(() => {
    if (!stageState) return;

    async function applyPreset() {
      try {
        // All presets require screen + speaker layout
        await setLayout("screen_speaker");

        // Future: we will refine positioning via blocks
        // For now, this ensures layout actually changes
      } catch (e: unknown) {
        console.error("Failed applying screen preset", e);
      }
    }

    // Only react when preset changes
    void applyPreset();
  }, [screenLayoutPreset]);

  useEffect(() => {
    return () => {
      setShowAudienceCue(false);
      stopLocalPreviewStream();
    };
  }, [setShowAudienceCue, stopLocalPreviewStream]);

  if (error) {
    return <div className="p-8 text-red-400">{error}</div>;
  }

  if (!token || !serverUrl) {
    return <div className="p-8 text-white">{loadingText}</div>;
  }

  const centerColumn = (
    <ProducerRoomCenterColumn>
      <CenterSwitcherColumn
        triggerAudienceCue={triggerAudienceCue}
        onHideAudienceCue={handleHideAudienceCue}
        previewProgramDifferent={previewProgramDifferent}
        takeBusy={takeBusy}
        lastTakeMode={lastTakeMode}
        onTake={handleCenterSwitcherTake}
        onPreviewCanvasMouseMove={onPreviewCanvasMouseMove}
        stopDraggingBlock={stopDraggingBlock}
        onClearSelectedBlock={handleClearSelectedBlock}
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
        onApplyScene={handleApplyScene}
        onClearScreenShare={handleClearScreenShare}
        onUnpin={handleUnpinParticipant}
        onClearPrimary={handleClearPrimaryParticipant}
        addTestTextBlock={addTestTextBlock}
        addTestVideoBlock={addTestVideoBlock}
        addTestPdfBlock={addTestPdfBlock}
        addTestImageBlock={addTestImageBlock}
        onUploadPdf={handleUploadPdfClick}
        onUploadVideo={handleUploadVideoClick}
        onUploadImage={handleUploadImageClick}
        duplicateSelectedBlock={duplicateSelectedBlock}
        bringSelectedBlockToFront={bringSelectedBlockToFront}
        deleteSelectedBlock={deleteSelectedBlock}
      />
    </ProducerRoomCenterColumn>
  );

  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio>
      <RoomAudioRenderer />

      <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#020617] text-white">
        <ProducerRoomBackground />

        <ProducerRoomContentStack>
          <ProducerUploadInputs
            pdfInputRef={pdfInputRef}
            videoInputRef={videoInputRef}
            imageInputRef={imageInputRef}
            onPdfUpload={handleProducerPdfInputChange}
            onVideoUpload={handleVideoUpload}
            onImageUpload={handleImageUpload}
          />

          <ProducerRoomTopChrome
            headline={stageState?.headline || "Live Production"}
            layout={stageState?.layout}
            previewProgramDifferent={previewProgramDifferent}
            onStageCount={onStageParticipants.length}
            overlayCount={previewBlocks.length}
            isProgramLive={isProgramLive}
            scopeLabel={producerScopeLabel}
            takeBusy={takeBusy}
            selectedSceneLabel={selectedSceneLabel}
            programSlideLabel={programSlideLabel}
            participantCount={participants.length}
            previewBlockCount={previewBlocks.length}
            programBlockCount={programBlocks.length}
            hasProgramSource={hasProgramSource}
            hasScreenShareRoute={hasScreenShareRoute}
            lastTakeMode={lastTakeMode}
            hotkeySceneLabelText={hotkeySceneLabelText}
            lastTransportActionAt={lastTransportActionAt}
            onTake={handleCommandDeckTake}
          />
          <ProducerRoomWorkspaceFrame>
            <ProducerRoomGrid>
              <ProducerRoomWorkspace
                leftRail={
                  <ProducerLeftRail
                    takeBusy={takeBusy}
                    previewProgramDifferent={previewProgramDifferent}
                    onTake={handleLeftRailTake}
                    onGoLive={handleGoLive}
                    onGoOffAir={handleGoOffAir}
                    layout={stageState?.layout}
                    onSetLayout={handleSetLayout}
                    autoDirectorEnabled={autoDirectorEnabled}
                    screenLayoutPreset={screenLayoutPreset}
                    onSetScreenLayoutPreset={setScreenLayoutPreset}
                    onToggleAutoDirector={handleToggleAutoDirector}
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
                }
                centerColumn={centerColumn}
                rightRail={
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
                    onAddToStage={handleAddParticipantToStage}
                    onSetScreenShare={handleSetParticipantScreenShare}
                    onClearPrimary={handleClearPrimaryParticipant}
                    onSetPrimary={handleSetPrimaryParticipant}
                    onUnpin={handleUnpinParticipant}
                    onPin={handlePinParticipant}
                    onRemoveFromStage={handleRemoveParticipantFromStage}
                    onError={setError}
                  />
                }
              />
            </ProducerRoomGrid>

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
              onUploadPdf={handleUploadPdfClick}
              onSendSlideToPreview={transportActions.sendSlideToPreview}
              onTakeSlide={transportActions.takeSlide}
              onApplyScene={handleDockApplyScene}
              onDoubleClickScene={handleDockApplySceneAndTake}
              onDeleteScene={handleDockDeleteScene}
            />
          </ProducerRoomWorkspaceFrame>
        </ProducerRoomContentStack>
      </div>
    </LiveKitRoom>
  );
}
