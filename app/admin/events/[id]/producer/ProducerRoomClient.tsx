"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { JSX } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";

import useProducerRoomApi from "./useProducerRoomApi";
import {
  CameraSlotLiveContent,
  ProducerRoomAtmosphere,
} from "./ProducerRoomClientChrome";
import useProducerBlocks, { type PreviewBlock } from "./useProducerBlocks";
import useProducerBlockEditor from "./useProducerBlockEditor";
import useProducerUploads from "./useProducerUploads";
import useProducerTransitions from "./useProducerTransitions";
import useProducerDevices from "./useProducerDevices";
import useProducerScenes from "./useProducerScenes";
import useProducerParticipantActions from "./useProducerParticipantActions";
import useProducerTransport from "./useProducerTransport";
import useProducerCanvasInteractions from "./useProducerCanvasInteractions";
import useProducerPdfDeck from "./useProducerPdfDeck";
import useProducerCompositionSync from "./useProducerCompositionSync";
import CenterSwitcherColumn from "./CenterSwitcherColumn";
import ProducerLeftRail from "./ProducerLeftRail";
import ProducerRightRail from "./ProducerRightRail";
import BottomAssetDock, { type RecordingStatus } from "./BottomAssetDock";
import ProducerRoomTopChrome from "./ProducerRoomTopChrome";
import ProducerModeBar, { type ProducerWorkspaceMode } from "./ProducerModeBar";
import ProducerHealthBar from "./ProducerHealthBar";
import ProducerRoomWorkspace from "./ProducerRoomWorkspace";
import ProducerNavigationRail from "./ProducerNavigationRail";
import ProducerSafetyDialog, {
  type ProducerSafetyAction,
} from "./ProducerSafetyDialog";
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
import {
  getProducerHealthSnapshot,
  type ProducerTransportHealth,
} from "./producerHealthUtils";
import {
  clearStaleCameraSlotAssignments,
  getStaleProducerRouteIds,
} from "./producerRouteCleanupUtils";

type ParticipantAccentId = "none" | "violet" | "cyan" | "green" | "amber" | "rose";
type ParticipantGlowLevel = "low" | "med" | "high";
type ParticipantOutlineWeight = "soft" | "standard" | "bold";

type ParticipantAppearanceOverride = {
  accentId?: ParticipantAccentId;
  glowLevel?: ParticipantGlowLevel;
  outlineWeight?: ParticipantOutlineWeight;
};


export default function ProducerRoomClient({
  eventId,
  sessionId,
  sessionTitle,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle?: string;
}): JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ProducerParticipant[]>([]);
  const [participantsLoaded, setParticipantsLoaded] = useState(false);
  const [participantAppearanceOverrides, setParticipantAppearanceOverrides] =
    useState<Record<string, ParticipantAppearanceOverride>>({});
  const [stageState, setStageState] = useState<StageState | null>(null);
  const latestStageStateRef = useRef<StageState | null>(null);
  const manualStageParticipantIdsRef = useRef<Set<string>>(new Set());
  const manualPrimaryParticipantIdRef = useRef<string | null>(null);
  const [loadingText, setLoadingText] = useState("Connecting producer...");
  const [error, setError] = useState<string | null>(null);
  const [syncWarningText, setSyncWarningText] = useState<string | null>(null);
  const staleRouteSinceRef = useRef<Map<string, number>>(new Map());
  const staleRouteCleanupBusyRef = useRef(false);

  const [autoDirectorEnabled, setAutoDirectorEnabled] = useState(true);
  const [standardToolsOpen, setStandardToolsOpen] = useState(false);
  const [screenLayoutPreset, setScreenLayoutPreset] =
    useState<ScreenLayoutPreset>("classic");
  const [selectedTransitionDurationMs] = useState(600);
  const [programSceneId, setProgramSceneId] = useState<string | null>(null);
  const [programSlideLabel, setProgramSlideLabel] = useState<string | null>(
    null,
  );
  const [programState, setProgramState] = useState<StageState | null>(null);
  const [monitorHeight, setMonitorHeight] = useState(640);
  const [audienceOriginCollapsed, setAudienceOriginCollapsed] = useState(true);
  const [assetDockExpanded, setAssetDockExpanded] = useState(true);
  const [workspaceMode, setWorkspaceMode] = useState<ProducerWorkspaceMode>("show");
  const [pendingSafetyAction, setPendingSafetyAction] =
    useState<ProducerSafetyAction | null>(null);
  const [liveActionBusy, setLiveActionBusy] = useState(false);
  const [operatorNotice, setOperatorNotice] = useState<string | null>(null);
  const [transportHealth, setTransportHealth] =
    useState<ProducerTransportHealth>("connecting");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [liveKitRoomKey, setLiveKitRoomKey] = useState(0);
  const [recordingHealth, setRecordingHealth] = useState<{
    status: RecordingStatus;
    error: string | null;
  }>({ status: "idle", error: null });
const updateStageState = useCallback(
  (updater: StageState | null | ((current: StageState | null) => StageState | null)): void => {
    setStageState((current) => {
      const nextStateBase = typeof updater === "function" ? updater(current) : updater;

      if (!nextStateBase) {
        latestStageStateRef.current = null;
        return null;
      }

      const manualParticipantIds = Array.from(manualStageParticipantIdsRef.current);

      if (manualParticipantIds.length === 0) {
        latestStageStateRef.current = nextStateBase;
        return nextStateBase;
      }

      const stageParticipantIds = Array.from(
        new Set([...(nextStateBase.stage_participant_ids ?? []), ...manualParticipantIds]),
      );

      const nextState: StageState = {
        ...nextStateBase,
        auto_director_enabled: false,
        stage_participant_ids: stageParticipantIds,
        primary_participant_id:
          nextStateBase.primary_participant_id ??
          manualPrimaryParticipantIdRef.current ??
          stageParticipantIds[0] ??
          null,
      };

      latestStageStateRef.current = nextState;
      return nextState;
    });
  },
  [],
);

  const updateProgramState = useCallback(
    (updater: StageState | null | ((current: StageState | null) => StageState | null)): void => {
      setProgramState((current) => {
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [],
  );
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

  const handlePreviewQuestion = useCallback(
    (question: string, region: string) => {
      triggerAudienceCue({
        region,
        questionLabel: question,
        durationMs: 12000,
      });
    },
    [triggerAudienceCue],
  );

  const handleHideQuestion = useCallback(() => {
    setShowAudienceCue(false);
  }, [setShowAudienceCue]);

  useEffect(() => {
    latestStageStateRef.current = stageState;
  }, [stageState]);

  useEffect(() => {
    if (!token || !serverUrl || !error) return;

    setSyncWarningText(error);

    const id = window.setTimeout(() => {
      setSyncWarningText(null);
    }, 3200);

    return () => window.clearTimeout(id);
  }, [error, serverUrl, token]);

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
snapGuideX,
snapGuideY,
setSnapGuideX,
setSnapGuideY,
selectedBlock,
    addCameraSlotBlock,
    deleteSelectedBlock,
    duplicateSelectedBlock,
    bringSelectedBlockToFront,

  } = useProducerBlocks();


  useEffect(() => {
    if (previewBlocks.length === 0) {
      if (selectedBlockId) {
        setSelectedBlockId(null);
      }
      return;
    }

    const selectedBlockStillExists = previewBlocks.some(
      (block) => block.id === selectedBlockId,
    );

    if (selectedBlockId && selectedBlockStillExists) {
      return;
    }

    const topMostBlock = [...previewBlocks].sort(
      (a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0),
    )[0];

    if (topMostBlock) {
      setSelectedBlockId(topMostBlock.id);
    }
  }, [previewBlocks, selectedBlockId, setSelectedBlockId]);

  const resolvedSelectedBlock = useMemo(() => {
    if (!selectedBlockId) return null;

    return previewBlocks.find((block) => block.id === selectedBlockId) ?? null;
  }, [previewBlocks, selectedBlockId]);

  useEffect(() => {
    function handleSelectedLayerDelete(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (!selectedBlockId) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      deleteSelectedBlock();
    }

    window.addEventListener("keydown", handleSelectedLayerDelete);
    return () => window.removeEventListener("keydown", handleSelectedLayerDelete);
  }, [deleteSelectedBlock, selectedBlockId]);

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
    
    updateSrc: updateSelectedBlockSrc,
    updateSize: updateSelectedBlockSize,
    updateOpacity: updateSelectedBlockOpacity,
    updateScale: updateSelectedBlockScale,
   updateRotation: updateSelectedBlockRotation,
     updateAnimationType: updateSelectedBlockAnimationType,
  updateAnimationProgress: updateSelectedBlockAnimationProgress,
  updateBlur: updateSelectedBlockBlur,
updateGlow: updateSelectedBlockGlow,
updateGlowColor: updateSelectedBlockGlowColor,
updateBorderRadius: updateSelectedBlockBorderRadius,
updateShadowIntensity: updateSelectedBlockShadowIntensity,
updateShadowColor: updateSelectedBlockShadowColor,
  updateLabel: updateSelectedBlockLabel,
    updateBlendMode: updateSelectedBlockBlendMode,
    updateGroupId: updateSelectedBlockGroupId,
    updateTimelineStart: updateSelectedBlockTimelineStart,
    updateTimelineDuration: updateSelectedBlockTimelineDuration,
    updatePosition: updateSelectedBlockPosition,
    toggleHidden: toggleSelectedBlockHidden,
    toggleLocked: toggleSelectedBlockLocked,
  } = useProducerBlockEditor({
    selectedBlockId,
    setPreviewBlocks,
  });

  const { handlePdfUpload, handleVideoUpload, handleImageUpload } =
    useProducerUploads({
      eventId,
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
    previewState: stageState,
    programBlocks,
    previewBlocks,
    setProgramState: updateProgramState,
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
    setRoomName,
    setParticipants,
    setParticipantsLoaded,
    setStageState: updateStageState,
    setProgramState: updateProgramState,
    setProgramBlocks,
    setLoadingText,
    setError,
    setSyncWarningText,
  });

  const handleRecoverControlPlane = useCallback(async (): Promise<void> => {
    if (recoveryBusy) return;

    try {
      setRecoveryBusy(true);
      setTransportHealth("recovering");
      setError(null);
      setSyncWarningText(null);

      const [tokenData] = await Promise.all([api.loadToken(), refreshAll()]);
      setToken(tokenData.token);
      setRoomName(tokenData.roomName ?? null);
      setLiveKitRoomKey((current) => current + 1);
      setTransportHealth("connecting");
      setOperatorNotice("Control state refreshed. Reconnecting live transport…");
    } catch (recoveryError: unknown) {
      const message =
        recoveryError instanceof Error
          ? recoveryError.message
          : "Producer recovery failed";
      setTransportHealth("degraded");
      setError(message);
      setSyncWarningText(`Recovery failed: ${message}`);
    } finally {
      setRecoveryBusy(false);
    }
  }, [api, recoveryBusy, refreshAll]);

  useProducerCompositionSync({
    api,
    eventId,
    stageState,
    previewBlocks,
    setPreviewBlocks,
    setStageState: updateStageState,
    setSyncWarningText,
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
    setStageState: (state) => updateStageState(state),
  });

  useEffect(() => {
    if (!participantsLoaded || !stageState || staleRouteCleanupBusyRef.current) return;

    const connectedParticipantIds = new Set(
      participants.map((participant) => participant.identity),
    );
    const staleRouteIds = getStaleProducerRouteIds({
      connectedParticipantIds,
      previewState: stageState,
      previewBlocks,
    });
    const staleRouteIdSet = new Set(staleRouteIds);
    const now = Date.now();

    for (const identity of staleRouteIds) {
      if (!staleRouteSinceRef.current.has(identity)) {
        staleRouteSinceRef.current.set(identity, now);
      }
    }

    for (const identity of Array.from(staleRouteSinceRef.current.keys())) {
      if (!staleRouteIdSet.has(identity)) {
        staleRouteSinceRef.current.delete(identity);
      }
    }

    const cleanupIds = staleRouteIds.filter(
      (identity) => now - (staleRouteSinceRef.current.get(identity) ?? now) >= 10_000,
    );
    if (cleanupIds.length === 0) return;

    staleRouteCleanupBusyRef.current = true;
    const cleanupIdSet = new Set(cleanupIds);

    for (const identity of cleanupIds) {
      manualStageParticipantIdsRef.current.delete(identity);
      if (manualPrimaryParticipantIdRef.current === identity) {
        manualPrimaryParticipantIdRef.current = null;
      }
    }

    void (async () => {
      try {
        for (const identity of cleanupIds) {
          await removeFromStage(identity);
          staleRouteSinceRef.current.delete(identity);
        }
        setPreviewBlocks((current) =>
          clearStaleCameraSlotAssignments(current, cleanupIdSet),
        );
        setOperatorNotice(
          `${cleanupIds.length} disconnected source${cleanupIds.length === 1 ? " was" : "s were"} removed from Preview automatically.`,
        );
      } catch (cleanupError: unknown) {
        const message = cleanupError instanceof Error
          ? cleanupError.message
          : "Automatic route cleanup failed";
        setSyncWarningText(`Automatic route cleanup needs attention: ${message}`);
      } finally {
        staleRouteCleanupBusyRef.current = false;
      }
    })();
  }, [
    participants,
    participantsLoaded,
    previewBlocks,
    removeFromStage,
    setPreviewBlocks,
    stageState,
  ]);

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
    eventId,
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

  const handleTransportCommitted = useCallback((mode: "cut" | "auto"): void => {
    setOperatorNotice(
      mode === "cut"
        ? "CUT committed. Preview is now on Program."
        : "Transition completed. Preview is now on Program.",
    );
  }, []);

  const healthSnapshot = useMemo(
    () =>
      getProducerHealthSnapshot({
        transportHealth,
        syncWarning: syncWarningText,
        participants,
        previewState: stageState,
        programState,
        previewBlocks,
        programBlocks,
      }),
    [
      participants,
      previewBlocks,
      programBlocks,
      programState,
      stageState,
      syncWarningText,
      transportHealth,
    ],
  );

  const validateTake = useCallback(
    (): string | null => healthSnapshot.takeBlockReason,
    [healthSnapshot.takeBlockReason],
  );

  const handleTakeBlocked = useCallback((reason: string): void => {
    setError(reason);
    setSyncWarningText(`TAKE blocked: ${reason}`);
  }, []);

  const { takeProgram, transportState } = useProducerTransport({
    runTake,
    sessionId,
    stageState,
    previewBlocks,
    selectedSceneId,
    selectedTransitionDurationMs,
    setProgramSceneId,
    setProgramSlideLabel,
    onCommitted: handleTransportCommitted,
    validateTake,
    onBlocked: handleTakeBlocked,
  });
  const { lastTransportActionAt } = transportState;

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

  const setAutoDirector = useCallback(async (enabled: boolean): Promise<void> => {
    const data = await api.setAutoDirector(enabled);
    updateStageState(data.state);
    setAutoDirectorEnabled(Boolean(data?.state?.auto_director_enabled));
  }, [api, updateStageState]);

  const setLayout = useCallback(async (
    layout: "solo" | "grid" | "screen_speaker",
  ): Promise<void> => {
    const data = await api.setLayout(layout);
    updateStageState(data.state);
  }, [api, updateStageState]);

  const setScreenShare = useCallback(async (
    participantId: string,
    trackId: string,
  ): Promise<void> => {
    const data = await api.setScreenShare(participantId, trackId);
    updateStageState(data.state);
  }, [api, updateStageState]);

  const clearScreenShare = useCallback(async (): Promise<void> => {
    const data = await api.clearScreenShare();
    updateStageState(data.state);
  }, [api, updateStageState]);

  const handleLeftRailTake = useCallback((): void => {
    takeProgram("cut");
  }, [takeProgram]);

  const handleCenterSwitcherTake = useCallback(
    (
      mode: "cut" | "auto",
      transitionType?: CinematicTransitionType,
      transitionDurationMs?: number,
    ): void => {
      takeProgram(mode, transitionType, { transitionDurationMs });
    },
    [takeProgram],
  );

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

  const handleToggleAudienceOriginCollapsed = useCallback((): void => {
    setAudienceOriginCollapsed((current) => !current);
  }, []);

  const handleToggleAssetDockExpanded = useCallback((): void => {
    setAssetDockExpanded((current) => !current);
  }, []);

  const handleClearSelectedBlock = useCallback((): void => {
    setSelectedBlockId(null);
  }, [setSelectedBlockId]);

  const handleSetParticipantAccentColor = useCallback(
    (identity: string, accentId: ParticipantAccentId): void => {
      setParticipantAppearanceOverrides((current) => ({
        ...current,
        [identity]: {
          ...current[identity],
          accentId,
        },
      }));
    },
    [],
  );

  const handleSetParticipantGlowLevel = useCallback(
    (identity: string, glowLevel: ParticipantGlowLevel): void => {
      setParticipantAppearanceOverrides((current) => ({
        ...current,
        [identity]: {
          ...current[identity],
          glowLevel,
        },
      }));
    },
    [],
  );

  const handleSetParticipantOutlineWeight = useCallback(
    (identity: string, outlineWeight: ParticipantOutlineWeight): void => {
      setParticipantAppearanceOverrides((current) => ({
        ...current,
        [identity]: {
          ...current[identity],
          outlineWeight,
        },
      }));
    },
    [],
  );

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
    void unpinParticipant()
      .then(() => setOperatorNotice("Pinned stage source cleared."))
      .catch(handleAsyncError);
  }, [unpinParticipant, handleAsyncError]);

  const handleClearPrimaryParticipant = useCallback((): void => {
    void clearPrimaryParticipant()
      .then(() => setOperatorNotice("Primary stage source cleared."))
      .catch(handleAsyncError);
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
      manualStageParticipantIdsRef.current.add(identity);
      manualPrimaryParticipantIdRef.current = manualPrimaryParticipantIdRef.current ?? identity;
      setAutoDirectorEnabled(false);
      updateStageState((current) => {
        if (!current) return current;

        const stageParticipantIds = Array.from(
          new Set([...(current.stage_participant_ids ?? []), identity]),
        );

        return {
          ...current,
          auto_director_enabled: false,
          stage_participant_ids: stageParticipantIds,
          primary_participant_id: current.primary_participant_id ?? identity,
        };
      });

      void api.setAutoDirector(false)
        .then(() => addToStage(identity))
        .then(() => {
          const participant = participants.find((item) => item.identity === identity);
          setOperatorNotice(`${participant?.name || identity} was sent to stage.`);
        })
        .catch(handleAsyncError);
    },
    [addToStage, handleAsyncError, participants, updateStageState, api],
  );

  const handleSetParticipantScreenShare = useCallback(
    (participantId: string, trackId: string): void => {
      setAutoDirectorEnabled(false);
      updateStageState((current) => {
        if (!current) return current;

        const stageParticipantIds = Array.from(
          new Set([...(current.stage_participant_ids ?? []), participantId]),
        );

        return {
          ...current,
          auto_director_enabled: false,
          layout: "screen_speaker",
          stage_participant_ids: stageParticipantIds,
          screen_share_participant_id: participantId,
          screen_share_track_id: trackId,
        };
      });

      void api.setAutoDirector(false)
        .then(() => setScreenShare(participantId, trackId))
        .then(() => setOperatorNotice("Screen share was routed to Preview."))
        .catch(handleAsyncError);
    },
    [handleAsyncError, setScreenShare, updateStageState, api],
  );

  const handleSetPrimaryParticipant = useCallback(
    (identity: string): void => {
      setAutoDirectorEnabled(false);
      updateStageState((current) => {
        if (!current) return current;

        const stageParticipantIds = Array.from(
          new Set([...(current.stage_participant_ids ?? []), identity]),
        );

        return {
          ...current,
          auto_director_enabled: false,
          stage_participant_ids: stageParticipantIds,
          primary_participant_id: identity,
        };
      });

      void api.setAutoDirector(false)
        .then(() => setPrimaryParticipant(identity))
        .then(() => {
          const participant = participants.find((item) => item.identity === identity);
          setOperatorNotice(`${participant?.name || identity} is now the primary stage source.`);
        })
        .catch(handleAsyncError);
    },
    [handleAsyncError, participants, setPrimaryParticipant, updateStageState, api],
  );

  const handlePinParticipant = useCallback(
    (identity: string): void => {
      void pinParticipant(identity)
        .then(() => setOperatorNotice("Participant pinned in the stage composition."))
        .catch(handleAsyncError);
    },
    [pinParticipant, handleAsyncError],
  );

  const handleRemoveParticipantFromStage = useCallback(
    (identity: string): void => {
      manualStageParticipantIdsRef.current.delete(identity);
      if (manualPrimaryParticipantIdRef.current === identity) {
        manualPrimaryParticipantIdRef.current = Array.from(manualStageParticipantIdsRef.current)[0] ?? null;
      }

      updateStageState((current) => {
        if (!current) return current;

        const stageParticipantIds = (current.stage_participant_ids ?? []).filter(
          (participantId) => participantId !== identity,
        );

        return {
          ...current,
          stage_participant_ids: stageParticipantIds,
          primary_participant_id:
            current.primary_participant_id === identity
              ? (stageParticipantIds[0] ?? null)
              : current.primary_participant_id,
          pinned_participant_id:
            current.pinned_participant_id === identity
              ? null
              : current.pinned_participant_id,
          screen_share_participant_id:
            current.screen_share_participant_id === identity
              ? null
              : current.screen_share_participant_id,
          screen_share_track_id:
            current.screen_share_participant_id === identity
              ? null
              : current.screen_share_track_id,
        };
      });

      void removeFromStage(identity)
        .then(() => {
          const participant = participants.find((item) => item.identity === identity);
          setOperatorNotice(`${participant?.name || identity} returned to backstage.`);
        })
        .catch(handleAsyncError);
    },
    [handleAsyncError, participants, removeFromStage, updateStageState],
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
      if (!window.confirm("Delete this scene preset? This cannot be undone.")) return;
      void sceneActions.deleteScene(sceneId);
    },
    [sceneActions],
  );

  const handleAddMediaAssetToPreview = useCallback(
    (block: PreviewBlock): void => {
      const nextBlockId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setPreviewBlocks((current) => {
        const baseBlocks = block.groupId === "source-route"
          ? current.filter((currentBlock) => currentBlock.groupId !== "source-route")
          : current;
        const nextZIndex = baseBlocks.reduce(
          (highest, currentBlock) => Math.max(highest, currentBlock.zIndex ?? 0),
          block.zIndex ?? 0,
        ) + 1;

        const nextBlock: PreviewBlock = {
          ...block,
          id: nextBlockId,
          zIndex: nextZIndex,
        };

        return [...baseBlocks, nextBlock];
      });

      window.requestAnimationFrame(() => {
        setSelectedBlockId(nextBlockId);
      });
    },
    [setPreviewBlocks, setSelectedBlockId],
  );

  const handleAssignParticipantToCameraSlot = useCallback(
    (blockId: string, participantId: string | null): void => {
      setPreviewBlocks((current) =>
        current.map((block) => {
          if (block.id !== blockId || block.type !== "camera-slot") {
            return block;
          }

          const assignedParticipant = participants.find(
            (participant) => participant.identity === participantId,
          );

          return {
            ...block,
            assignedParticipantId: participantId,
            assignedTrackSid: null,
            placeholderLabel:
              assignedParticipant?.name ||
              assignedParticipant?.identity ||
              "Camera Slot",
            placeholderSubLabel: participantId
              ? "Assigned camera source"
              : "Assign presenter or attendee",
          };
        }),
      );
    },
    [participants, setPreviewBlocks],
  );

  const handleToggleLayerHidden = useCallback(
    (blockId: string): void => {
      setPreviewBlocks((current) =>
        current.map((block) =>
          block.id === blockId
            ? {
                ...block,
                hidden: !block.hidden,
              }
            : block,
        ),
      );
    },
    [setPreviewBlocks],
  );

  const handleMoveLayerForward = useCallback(
    (blockId: string): void => {
      setPreviewBlocks((current) => {
        const sortedBlocks = [...current].sort(
          (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
        );
        const currentIndex = sortedBlocks.findIndex((block) => block.id === blockId);

        if (currentIndex < 0 || currentIndex === sortedBlocks.length - 1) {
          return current;
        }

        const currentBlock = sortedBlocks[currentIndex];
        const nextBlock = sortedBlocks[currentIndex + 1];

        return current.map((block) => {
          if (block.id === currentBlock.id) {
            return {
              ...block,
              zIndex: nextBlock.zIndex ?? currentBlock.zIndex,
            };
          }

          if (block.id === nextBlock.id) {
            return {
              ...block,
              zIndex: currentBlock.zIndex ?? nextBlock.zIndex,
            };
          }

          return block;
        });
      });
    },
    [setPreviewBlocks],
  );

  const handleMoveLayerBackward = useCallback(
    (blockId: string): void => {
      setPreviewBlocks((current) => {
        const sortedBlocks = [...current].sort(
          (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
        );
        const currentIndex = sortedBlocks.findIndex((block) => block.id === blockId);

        if (currentIndex <= 0) {
          return current;
        }

        const currentBlock = sortedBlocks[currentIndex];
        const previousBlock = sortedBlocks[currentIndex - 1];

        return current.map((block) => {
          if (block.id === currentBlock.id) {
            return {
              ...block,
              zIndex: previousBlock.zIndex ?? currentBlock.zIndex,
            };
          }

          if (block.id === previousBlock.id) {
            return {
              ...block,
              zIndex: currentBlock.zIndex ?? previousBlock.zIndex,
            };
          }

          return block;
        });
      });
    },
    [setPreviewBlocks],
  );

  const handleReorderLayers = useCallback(
    (orderedBlockIds: string[]): void => {
      setPreviewBlocks((current) => {
        const zIndexById = new Map<string, number>();
        const highestZIndex = orderedBlockIds.length;

        orderedBlockIds.forEach((blockId, index) => {
          zIndexById.set(blockId, highestZIndex - index);
        });

        return current.map((block) => {
          const nextZIndex = zIndexById.get(block.id);

          if (!nextZIndex) {
            return block;
          }

          return {
            ...block,
            zIndex: nextZIndex,
          };
        });
      });
    },
    [setPreviewBlocks],
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
    setSnapGuideX,
    setSnapGuideY,
  });
  const handleGoLive = useCallback((): void => {
    setPendingSafetyAction("go_live");
  }, []);

  const handleGoOffAir = useCallback((): void => {
    setPendingSafetyAction("go_off_air");
  }, []);

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

  const renderCameraSlotContent = useCallback(
    (block: PreviewBlock): JSX.Element | null => {
      if (block.type !== "camera-slot" || !block.assignedParticipantId) {
        return null;
      }

      return <CameraSlotLiveContent block={block} />;
    },
    [],
  );


  const isProgramLive = Boolean(programState?.is_live);

  const liveSafetyChecks = useMemo(() => {
    if (pendingSafetyAction === "go_off_air") {
      return [
        {
          label: "Audience is currently live",
          detail: isProgramLive
            ? "Program is visible to attendees."
            : "The event is already in holding.",
          ready: isProgramLive,
          required: true,
        },
        {
          label: "Producer Room remains connected",
          detail: "Off Air changes the attendee destination; it does not close this console.",
          ready: true,
        },
      ];
    }

    return [
      {
        label: "Program output exists",
        detail: hasProgramSource
          ? "A committed Program source is ready."
          : "TAKE a source to Program before going live.",
        ready: hasProgramSource,
        required: true,
      },
      {
        label: "Preview and Program are synchronized",
        detail: previewProgramDifferent
          ? "Preview contains unpublished changes. Program will go live unchanged."
          : "Preview matches the committed Program output.",
        ready: !previewProgramDifferent,
      },
      {
        label: "Stage has a routed participant",
        detail: onStageParticipants.length > 0
          ? `${onStageParticipants.length} participant${onStageParticipants.length === 1 ? "" : "s"} routed to stage.`
          : "No presenter is routed; Program may contain only media or graphics.",
        ready: onStageParticipants.length > 0,
      },
    ];
  }, [hasProgramSource, isProgramLive, onStageParticipants.length, pendingSafetyAction, previewProgramDifferent]);

  const handleCancelSafetyAction = useCallback((): void => {
    if (liveActionBusy) return;
    setPendingSafetyAction(null);
  }, [liveActionBusy]);

  const handleConfirmSafetyAction = useCallback(async (): Promise<void> => {
    if (!pendingSafetyAction || liveActionBusy) return;

    try {
      setLiveActionBusy(true);
      setError(null);
      const expectedVersion = stageState?.scene_version ?? null;
      const data = pendingSafetyAction === "go_live"
        ? await api.goLive(expectedVersion)
        : await api.goOffAir(expectedVersion);

      updateStageState(data.state ?? null);
      updateProgramState(data.programState ?? data.state ?? null);
      setOperatorNotice(
        pendingSafetyAction === "go_live"
          ? "Program is live to attendees."
          : "Audience returned to holding. Producer controls remain connected.",
      );
      setPendingSafetyAction(null);
    } catch (actionError: unknown) {
      handleAsyncError(actionError);
    } finally {
      setLiveActionBusy(false);
    }
  }, [api, handleAsyncError, liveActionBusy, pendingSafetyAction, stageState?.scene_version, updateProgramState, updateStageState]);

  useEffect(() => {
    if (!operatorNotice) return;
    const timeoutId = window.setTimeout(() => setOperatorNotice(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [operatorNotice]);


  // Top chrome props
  const topChromeProps = useMemo(
    () => ({
      eventId,
      headline: sessionTitle || stageState?.headline || "Live Production",
      layout: stageState?.layout,
      previewProgramDifferent,
      onStageCount: onStageParticipants.length,
      overlayCount: previewBlocks.length,
      isProgramLive,
      liveActionBusy,
      scopeLabel: producerScopeLabel,
      takeBusy,
      selectedSceneLabel,
      programSlideLabel,
      participantCount: participants.length,
      previewBlockCount: previewBlocks.length,
      programBlockCount: programBlocks.length,
      hasProgramSource,
      hasScreenShareRoute,
      lastTakeMode,
      hotkeySceneLabelText,
      lastTransportActionAt,
      onTake: handleCommandDeckTake,
    }),
    [
      eventId,
      stageState?.headline,
      sessionTitle,
      stageState?.layout,
      previewProgramDifferent,
      onStageParticipants.length,
      previewBlocks.length,
      isProgramLive,
      liveActionBusy,
      producerScopeLabel,
      takeBusy,
      selectedSceneLabel,
      programSlideLabel,
      participants.length,
      programBlocks.length,
      hasProgramSource,
      hasScreenShareRoute,
      lastTakeMode,
      hotkeySceneLabelText,
      lastTransportActionAt,
      handleCommandDeckTake,
    ],
  );

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

  const removeProgramBlock = useCallback(
    (blockId: string) => {
      if (!programBlocks.some((block) => block.id === blockId)) return;
      const confirmed = window.confirm(
        "Remove this layer from Program now?\n\nThis immediately changes what the audience is seeing.",
      );
      if (!confirmed) return;
      setProgramBlocks((current) => current.filter((block) => block.id !== blockId));
    },
    [programBlocks, setProgramBlocks],
  );

  // Center workspace props
  const centerSwitcherProps = useMemo(
    () => ({
      workspaceMode,
      triggerAudienceCue,
      onHideAudienceCue: handleHideAudienceCue,
      previewProgramDifferent,
      takeBusy,
      lastTakeMode,
      onTake: handleCenterSwitcherTake,
      onPreviewCanvasMouseMove,
      stopDraggingBlock,
      onClearSelectedBlock: handleClearSelectedBlock,
      stageState,
      onStageParticipants,
      participantAppearanceOverrides,
      previewBlocks,
      selectedBlockId,
      snapGuideX,
      snapGuideY,
      setSelectedBlockId,
      startDraggingBlock,
      startResizingBlock,
      programState,
      programBlocks,
      onRemoveProgramBlock: removeProgramBlock,
      renderCameraSlotContent,
      screenLayoutPreset,
      showAudienceCue,
      audienceCueRegion,
      audienceCueMoonMode,
      audienceCueQuestionLabel,
      audienceOriginCollapsed,
      onToggleAudienceOriginCollapsed: handleToggleAudienceOriginCollapsed,
      isTransitioning,
      transitionFromState,
      transitionFromBlocks,
      transitionFadingOut,
      sceneName,
      onSceneNameChange: setSceneName,
      onSaveScene: saveScene,
      sceneBusy,
      scenes,
      selectedSceneId,
      selectedSceneLabel,
      onApplyScene: handleApplyScene,
      onClearScreenShare: handleClearScreenShare,
      onUnpin: handleUnpinParticipant,
      onClearPrimary: handleClearPrimaryParticipant,
      addCameraSlotBlock,
      onAddMediaAssetToPreview: handleAddMediaAssetToPreview,
      onUploadPdf: handleUploadPdfClick,
      onUploadVideo: handleUploadVideoClick,
      onUploadImage: handleUploadImageClick,
      duplicateSelectedBlock,
      bringSelectedBlockToFront,
      deleteSelectedBlock,
      healthSnapshot,
      transportHealth,
    }),
    [
      workspaceMode,
      triggerAudienceCue,
      handleHideAudienceCue,
      previewProgramDifferent,
      takeBusy,
      lastTakeMode,
      handleCenterSwitcherTake,
      onPreviewCanvasMouseMove,
      stopDraggingBlock,
      handleClearSelectedBlock,
      stageState,
      onStageParticipants,
      previewBlocks,
      selectedBlockId,
      snapGuideX,
      snapGuideY,
      setSelectedBlockId,
      startDraggingBlock,
      startResizingBlock,
      programState,
      programBlocks,
      removeProgramBlock,
      renderCameraSlotContent,
      screenLayoutPreset,
      showAudienceCue,
      audienceCueRegion,
      audienceCueMoonMode,
      audienceCueQuestionLabel,
      audienceOriginCollapsed,
      handleToggleAudienceOriginCollapsed,
      isTransitioning,
      transitionFromState,
      transitionFromBlocks,
      transitionFadingOut,
      sceneName,
      setSceneName,
      saveScene,
      sceneBusy,
      scenes,
      selectedSceneId,
      selectedSceneLabel,
      handleApplyScene,
      handleClearScreenShare,
      handleUnpinParticipant,
      handleClearPrimaryParticipant,
      addCameraSlotBlock,
      handleAddMediaAssetToPreview,
      handleUploadPdfClick,
      handleUploadVideoClick,
      handleUploadImageClick,
      duplicateSelectedBlock,
      bringSelectedBlockToFront,
      deleteSelectedBlock,
      healthSnapshot,
      transportHealth,
    ],
  );

  const centerColumn = (
    <ProducerRoomCenterColumn>
      <CenterSwitcherColumn {...centerSwitcherProps} />
    </ProducerRoomCenterColumn>
  );

  // Rail props
  const leftRailProps = useMemo(
    () => ({
      takeBusy,
      previewProgramDifferent,
      isProgramLive,
      liveActionBusy,
      onTake: handleLeftRailTake,
      onGoLive: handleGoLive,
      onGoOffAir: handleGoOffAir,
      layout: stageState?.layout,
      onSetLayout: handleSetLayout,
      autoDirectorEnabled,
      screenLayoutPreset,
      onSetScreenLayoutPreset: setScreenLayoutPreset,
      onToggleAutoDirector: handleToggleAutoDirector,
      localMicLevel,
      monitorHeight,
      onMonitorHeightChange: setMonitorHeight,
      deviceAccessReady,
      videoDevices,
      audioDevices,
      selectedVideoDeviceId,
      selectedAudioDeviceId,
      onSelectVideoDevice: setSelectedVideoDeviceId,
      onSelectAudioDevice: setSelectedAudioDeviceId,
    }),
    [
      takeBusy,
      previewProgramDifferent,
      isProgramLive,
      liveActionBusy,
      handleLeftRailTake,
      handleGoLive,
      handleGoOffAir,
      stageState?.layout,
      handleSetLayout,
      autoDirectorEnabled,
      screenLayoutPreset,
      setScreenLayoutPreset,
      handleToggleAutoDirector,
      localMicLevel,
      monitorHeight,
      setMonitorHeight,
      deviceAccessReady,
      videoDevices,
      audioDevices,
      selectedVideoDeviceId,
      selectedAudioDeviceId,
      setSelectedVideoDeviceId,
      setSelectedAudioDeviceId,
    ],
  );

  const rightRailProps = useMemo(
    () => ({
      videoDevices,
      audioDevices,
      selectedVideoDeviceId,
      selectedAudioDeviceId,
      onSelectVideoDevice: setSelectedVideoDeviceId,
      onSelectAudioDevice: setSelectedAudioDeviceId,
      participants,
      participantAppearanceOverrides,
      onSetParticipantAccentColor: handleSetParticipantAccentColor,
      onSetParticipantGlowLevel: handleSetParticipantGlowLevel,
      onSetParticipantOutlineWeight: handleSetParticipantOutlineWeight,
      stageIds,
      selectedBlock: resolvedSelectedBlock,
      previewBlocks,
      selectedBlockId,
      onSelectBlock: setSelectedBlockId,
      onToggleLayerHidden: handleToggleLayerHidden,
      onMoveLayerForward: handleMoveLayerForward,
      onMoveLayerBackward: handleMoveLayerBackward,
      onReorderLayers: handleReorderLayers,
      onToggleHidden: toggleSelectedBlockHidden,
      onToggleLocked: toggleSelectedBlockLocked,
      onUpdateOpacity: updateSelectedBlockOpacity,
      onUpdateScale: updateSelectedBlockScale,
      onUpdateRotation: updateSelectedBlockRotation,
      onUpdateBlur: updateSelectedBlockBlur,
      onUpdateGlow: updateSelectedBlockGlow,
      onUpdateGlowColor: updateSelectedBlockGlowColor,
      onUpdateBorderRadius: updateSelectedBlockBorderRadius,
      onUpdateShadowIntensity: updateSelectedBlockShadowIntensity,
      onUpdateShadowColor: updateSelectedBlockShadowColor,
      onUpdateLabel: updateSelectedBlockLabel,
      onUpdateBlendMode: updateSelectedBlockBlendMode,
      onUpdateGroupId: updateSelectedBlockGroupId,
      onUpdateTimelineStart: updateSelectedBlockTimelineStart,
      onUpdateTimelineDuration: updateSelectedBlockTimelineDuration,
      onUpdateAnimationType: updateSelectedBlockAnimationType,
      onUpdateAnimationProgress: updateSelectedBlockAnimationProgress,
      onUpdatePosition: updateSelectedBlockPosition,
      onUpdateSize: updateSelectedBlockSize,
      onUpdateSrc: updateSelectedBlockSrc,
      onUpdateTextContent: updateSelectedTextBlockContent,
      onAssignParticipantToCameraSlot: handleAssignParticipantToCameraSlot,
      stageState,
      getScreenTrackSid,
      onAddToStage: handleAddParticipantToStage,
      onSetScreenShare: handleSetParticipantScreenShare,
      onClearPrimary: handleClearPrimaryParticipant,
      onSetPrimary: handleSetPrimaryParticipant,
      onUnpin: handleUnpinParticipant,
      onPin: handlePinParticipant,
      onRemoveFromStage: handleRemoveParticipantFromStage,
      onError: setError,
      eventId,
      sessionId,
      onPreviewQuestion: handlePreviewQuestion,
      onHideQuestion: handleHideQuestion,
    }),
    [
      videoDevices,
      audioDevices,
      selectedVideoDeviceId,
      selectedAudioDeviceId,
      setSelectedVideoDeviceId,
      setSelectedAudioDeviceId,
      participants,
      participantAppearanceOverrides,
      handleSetParticipantAccentColor,
      handleSetParticipantGlowLevel,
      handleSetParticipantOutlineWeight,
      stageIds,
      resolvedSelectedBlock,
      previewBlocks,
      selectedBlockId,
      setSelectedBlockId,
      handleToggleLayerHidden,
      handleMoveLayerForward,
      handleMoveLayerBackward,
      handleReorderLayers,
      toggleSelectedBlockHidden,
      toggleSelectedBlockLocked,
      updateSelectedBlockOpacity,
      updateSelectedBlockScale,
      updateSelectedBlockRotation,
      updateSelectedBlockBlur,
      updateSelectedBlockGlow,
      updateSelectedBlockGlowColor,
      updateSelectedBlockBorderRadius,
      updateSelectedBlockShadowIntensity,
      updateSelectedBlockShadowColor,
      updateSelectedBlockLabel,
      updateSelectedBlockBlendMode,
      updateSelectedBlockGroupId,
      updateSelectedBlockTimelineStart,
      updateSelectedBlockTimelineDuration,
      updateSelectedBlockAnimationType,
      updateSelectedBlockAnimationProgress,
      updateSelectedBlockPosition,
      updateSelectedBlockSize,
      updateSelectedBlockSrc,
      updateSelectedTextBlockContent,
      handleAssignParticipantToCameraSlot,
      stageState,
      getScreenTrackSid,
      handleAddParticipantToStage,
      handleSetParticipantScreenShare,
      handleClearPrimaryParticipant,
      handleSetPrimaryParticipant,
      handleUnpinParticipant,
      handlePinParticipant,
      handleRemoveParticipantFromStage,
      eventId,
      sessionId,
      handlePreviewQuestion,
      handleHideQuestion,
      setError,
    ],
  );

  // Dock props
  const handleRecordingHealthChange = useCallback(
    (status: RecordingStatus, recordingError: string | null): void => {
      setRecordingHealth((current) => {
        if (current.status === status && current.error === recordingError) {
          return current;
        }
        return { status, error: recordingError };
      });
    },
    [],
  );

  const bottomAssetDockProps = useMemo(
    () => ({
      workspaceMode,
      scenes,
      selectedSceneId,
      programSceneId,
      programSlideLabel,
      hotkeySceneId,
      previewBlocks,
      localMicLevel,
      eventId,
      recordingRoomName: roomName ?? sessionId,
      slideDeckName: localPdfDeck?.name ?? null,
      slideCount: localPdfDeck?.pageCount ?? 8,
onAddScene: startNewScene,

onSaveScene: saveScene,
      onAddMediaAssetToPreview: handleAddMediaAssetToPreview,
      onUploadPdf: handleUploadPdfClick,
      onSendSlideToPreview: transportActions.sendSlideToPreview,
      onTakeSlide: transportActions.takeSlide,
      onApplyScene: handleDockApplyScene,
      onDoubleClickScene: handleDockApplySceneAndTake,
      onDeleteScene: handleDockDeleteScene,
      previewProgramDifferent,
      takeBusy,
      onTakeProgram: (mode: "cut" | "auto") => takeProgram(mode),
      onRecordingHealthChange: handleRecordingHealthChange,
    }),
    [
      workspaceMode,
      scenes,
      selectedSceneId,
      programSceneId,
      programSlideLabel,
      hotkeySceneId,
      previewBlocks,
      localMicLevel,
      eventId,
      sessionId,
      roomName,
      localPdfDeck?.name,
      localPdfDeck?.pageCount,
      sceneActions,
      handleAddMediaAssetToPreview,
      handleUploadPdfClick,
      transportActions,
      handleDockApplyScene,
      handleDockApplySceneAndTake,
      handleDockDeleteScene,
      previewProgramDifferent,
      takeBusy,
      takeProgram,
      handleRecordingHealthChange,
    ],
  );

  const bottomDock = <BottomAssetDock {...bottomAssetDockProps} />;

  if (!token || !serverUrl) {
    return (
      <div className="relative flex h-[100dvh] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(125,211,252,0.060),transparent_34%),radial-gradient(circle_at_80%_14%,rgba(196,181,253,0.045),transparent_32%),linear-gradient(180deg,#07101f_0%,#050b16_52%,#02050b_100%)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-white sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.018] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.018)_0px,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_18px)]" />
        <div className="pointer-events-none absolute inset-x-[18%] top-0 h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent" />

        <div className="relative w-[min(560px,calc(100vw-48px))] overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,14,26,0.88),rgba(3,6,13,0.96))] p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.030)] backdrop-blur-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-sky-200/[0.12] bg-sky-300/[0.045] shadow-[0_0_28px_rgba(56,189,248,0.10)]">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300/70 shadow-[0_0_12px_rgba(125,211,252,0.30)]" />
          </div>

          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/38">
            Jupiter Producer Room
          </div>

          <div className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white/86">
            {error ? "Connection interrupted" : "Connecting producer console"}
          </div>

          <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/48">
            {error
              ? "The production surface could not complete its initial sync. Your route is still intact; retry the connection or return to the session overview."
              : loadingText}
          </div>

          {error ? (
            <div className="mt-4 rounded-[16px] border border-amber-300/12 bg-amber-300/[0.035] px-4 py-3 text-left text-xs font-semibold text-amber-50/62">
              {error}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-sky-200/14 bg-sky-300/[0.070] px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-sky-50/78 transition hover:bg-sky-300/[0.12]"
            >
              Retry
            </button>
            <a
              href="../"
              className="rounded-full border border-white/[0.07] bg-white/[0.030] px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/54 transition hover:bg-white/[0.055] hover:text-white/78"
            >
              Exit Producer
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={liveKitRoomKey}
      token={token}
      serverUrl={serverUrl}
      connect
      video={false}
      audio={false}
      onConnected={() => {
        setTransportHealth("connected");
        setSyncWarningText(null);
      }}
      onDisconnected={() => {
        setTransportHealth("degraded");
        setSyncWarningText("Live transport disconnected. Use Recover to reconnect safely.");
      }}
      onError={(liveKitError) => {
        setTransportHealth("degraded");
        setSyncWarningText(`Live transport error: ${liveKitError.message}`);
      }}
    >
      <RoomAudioRenderer />

      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#030714] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] text-center text-white md:hidden">
        <div className="max-w-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-300/10 text-2xl" aria-hidden="true">↻</div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200/60">Producer Room</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Rotate your iPhone</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">The live switcher opens in landscape so Preview, Program, audio, and TAKE remain safely separated. For the full control surface, use an iPad or computer.</p>
        </div>
      </div>

      <div className="fixed inset-0 z-[300] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_18%_-8%,rgba(59,130,246,0.08),transparent_32%),radial-gradient(circle_at_82%_2%,rgba(56,189,248,0.045),transparent_30%),linear-gradient(180deg,#080d19_0%,#050914_48%,#03060d_100%)] text-white">
        <ProducerRoomBackground />
        <ProducerRoomAtmosphere isLive={isProgramLive} />

        {pendingSafetyAction ? (
          <ProducerSafetyDialog
            action={pendingSafetyAction}
            checks={liveSafetyChecks}
            busy={liveActionBusy}
            onCancel={handleCancelSafetyAction}
            onConfirm={() => {
              void handleConfirmSafetyAction();
            }}
          />
        ) : null}

        <ProducerRoomContentStack>
          <ProducerUploadInputs
            pdfInputRef={pdfInputRef}
            videoInputRef={videoInputRef}
            imageInputRef={imageInputRef}
            onPdfUpload={handleProducerPdfInputChange}
            onVideoUpload={handleVideoUpload}
            onImageUpload={handleImageUpload}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <ProducerNavigationRail eventId={eventId} isLive={isProgramLive} />

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <ProducerRoomTopChrome {...topChromeProps} />
              <ProducerModeBar mode={workspaceMode} onModeChange={setWorkspaceMode} />
              {syncWarningText ? (
                <div className="relative z-[90] flex shrink-0 items-center justify-between gap-4 border-y border-amber-300/18 bg-[linear-gradient(90deg,rgba(46,30,8,0.94),rgba(18,12,5,0.98))] px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.28)]" role="alert">
                  <div className="min-w-0">
                    <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-amber-100/55">Producer sync notice</span>
                    <span className="ml-3 text-[10px] font-medium text-amber-50/78">{syncWarningText}</span>
                  </div>
                  <button type="button" disabled={recoveryBusy} onClick={() => void handleRecoverControlPlane()} className="shrink-0 rounded-[9px] border border-amber-200/20 bg-amber-100/[0.08] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-50/78 transition hover:bg-amber-100/[0.14] disabled:opacity-45">
                    {recoveryBusy ? "Recovering…" : "Recover"}
                  </button>
                </div>
              ) : null}
              {operatorNotice ? (
                <div className="relative z-[89] shrink-0 border-y border-emerald-300/14 bg-emerald-400/[0.075] px-4 py-2 text-center text-[10px] font-medium text-emerald-50/76" role="status" aria-live="polite">
                  {operatorNotice}
                </div>
              ) : null}
              <ProducerHealthBar
                snapshot={healthSnapshot}
                transportHealth={transportHealth}
                recordingStatus={recordingHealth.status}
                recordingError={recordingHealth.error}
                recoveryBusy={recoveryBusy}
                onRecover={() => {
                  void handleRecoverControlPlane();
                }}
              />
              <ProducerRoomWorkspaceFrame>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <ProducerRoomGrid>
                    <ProducerRoomWorkspace
                      leftRail={<ProducerLeftRail {...leftRailProps} />}
                      centerColumn={centerColumn}
                      rightRail={<ProducerRightRail {...rightRailProps} />}
                      bottomDock={workspaceMode === "show" && !standardToolsOpen ? undefined : bottomDock}
                    />
                  </ProducerRoomGrid>

                  {workspaceMode === "show" ? (
                    <button
                      type="button"
                      onClick={() => setStandardToolsOpen((current) => !current)}
                      aria-expanded={standardToolsOpen}
                      className="absolute bottom-2 left-1/2 z-[85] flex -translate-x-1/2 items-center gap-2 rounded-[10px] border border-white/[0.10] bg-[#101522]/95 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.10em] text-white/70 shadow-[0_12px_28px_rgba(0,0,0,0.38)] backdrop-blur-xl transition hover:border-sky-200/25 hover:text-white"
                    >
                      {standardToolsOpen ? "Close Production Tools" : "Production Tools"}
                      <span aria-hidden="true" className={`transition-transform ${standardToolsOpen ? "rotate-180" : ""}`}>
                        ▴
                      </span>
                    </button>
                  ) : null}
                </div>
              </ProducerRoomWorkspaceFrame>
            </main>
          </div>
        </ProducerRoomContentStack>
      </div>
    </LiveKitRoom>
  );
}
