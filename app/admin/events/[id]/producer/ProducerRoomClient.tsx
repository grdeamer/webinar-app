"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { JSX } from "react";
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useTracks } from "@livekit/components-react";

import { Track } from "livekit-client";

import useProducerRoomApi from "./useProducerRoomApi";
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

type ParticipantAccentId = "none" | "violet" | "cyan" | "green" | "amber" | "rose";
type ParticipantGlowLevel = "low" | "med" | "high";
type ParticipantOutlineWeight = "soft" | "standard" | "bold";

type ParticipantAppearanceOverride = {
  accentId?: ParticipantAccentId;
  glowLevel?: ParticipantGlowLevel;
  outlineWeight?: ParticipantOutlineWeight;
};

function ProducerRoomAtmosphere({ isLive }: { isLive: boolean }): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <div
        className={`absolute left-[-20%] top-[6%] h-[430px] w-[430px] rounded-full blur-3xl transition-opacity duration-1000 ${
          isLive ? "bg-red-300/[0.030] opacity-44" : "bg-sky-200/[0.036] opacity-40"
        } animate-[producerAtmosphereDrift_34s_ease-in-out_infinite]`}
      />
      <div className="absolute right-[-18%] top-[26%] h-[460px] w-[460px] rounded-full bg-violet-200/[0.026] blur-3xl animate-[producerAtmosphereCounterDrift_38s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-24%] left-[26%] h-[470px] w-[470px] rounded-full bg-cyan-200/[0.022] blur-3xl animate-[producerAtmosphereBloom_36s_ease-in-out_infinite]" />

      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.003)_38%,transparent_62%)] animate-[producerTransmissionSheen_42s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.008)_0px,rgba(255,255,255,0.008)_1px,transparent_1px,transparent_16px)] opacity-[0.018]" />

      {isLive ? (
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-red-200/24 to-transparent animate-[producerLiveScan_4.6s_ease-in-out_infinite]" />
      ) : null}

      <style jsx global>{`
        @keyframes producerAtmosphereDrift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(26px, 16px, 0) scale(1.04);
          }
        }

        @keyframes producerAtmosphereCounterDrift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(-22px, 12px, 0) scale(1.035);
          }
        }

        @keyframes producerAtmosphereBloom {
          0%,
          100% {
            opacity: 0.18;
            transform: scale(1);
          }

          50% {
            opacity: 0.32;
            transform: scale(1.04);
          }
        }

        @keyframes producerTransmissionSheen {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          45% {
            opacity: 0.14;
          }

          100% {
            transform: translateX(18%);
          }
        }

        @keyframes producerLiveScan {
          0%,
          100% {
            opacity: 0.15;
            transform: translateY(0);
          }

          50% {
            opacity: 0.28;
            transform: translateY(6px);
          }
        }
      `}</style>
    </div>
  );
}

function CameraSlotLiveContent({ block }: { block: PreviewBlock }): JSX.Element | null {
  const cameraTracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });

  if (!block.assignedParticipantId) return null;

  const assignedTrack = cameraTracks.find(
    (trackRef) => trackRef.participant.identity === block.assignedParticipantId,
  );

  if (!assignedTrack) return null;

  return (
    <VideoTrack
      trackRef={assignedTrack}
      className="h-full w-full object-cover"
    />
  );
}

export default function ProducerRoomClient({
  eventId,
  sessionId,
}: {
  eventId: string;
  sessionId: string;
}): JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ProducerParticipant[]>([]);
  const [participantAppearanceOverrides, setParticipantAppearanceOverrides] =
    useState<Record<string, ParticipantAppearanceOverride>>({});
  const [stageState, setStageState] = useState<StageState | null>(null);
  const latestStageStateRef = useRef<StageState | null>(null);
  const latestCommittedProgramStateRef = useRef<StageState | null>(null);
  const manualStageParticipantIdsRef = useRef<Set<string>>(new Set());
  const manualPrimaryParticipantIdRef = useRef<string | null>(null);
  const [loadingText, setLoadingText] = useState("Connecting producer...");
  const [error, setError] = useState<string | null>(null);
  const [syncWarningText, setSyncWarningText] = useState<string | null>(null);

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
  const [monitorHeight, setMonitorHeight] = useState(640);
  const [audienceOriginCollapsed, setAudienceOriginCollapsed] = useState(true);
  const [assetDockExpanded, setAssetDockExpanded] = useState(true);
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
        const nextState = typeof updater === "function" ? updater(current) : updater;
        const committedProgramState = latestCommittedProgramStateRef.current;

        if (
          committedProgramState &&
          (!nextState || (nextState?.stage_participant_ids?.length ?? 0) === 0)
        ) {
          return committedProgramState;
        }

        return nextState;
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
    addTestTextBlock,
    addTestVideoBlock,
    addTestPdfBlock,
    addTestImageBlock,
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
    setStageState: updateStageState,
    setProgramState: updateProgramState,
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
    setStageState: (state) => updateStageState(state),
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
      const previewState = latestStageStateRef.current ?? stageState;

      if (previewState) {
        const committedProgramState: StageState = {
          ...previewState,
          is_live: Boolean(previewState.is_live ?? programState?.is_live),
        };

        latestCommittedProgramStateRef.current = committedProgramState;
        updateProgramState(committedProgramState);
        setProgramBlocks(previewBlocks);

        window.setTimeout(() => {
          if (!latestCommittedProgramStateRef.current) return;
          updateProgramState(latestCommittedProgramStateRef.current);
          setProgramBlocks(previewBlocks);
        }, 250);

        window.setTimeout(() => {
          if (!latestCommittedProgramStateRef.current) return;
          updateProgramState(latestCommittedProgramStateRef.current);
          setProgramBlocks(previewBlocks);
        }, 900);
      }

      setLastTransportActionAt(Date.now());
      void mode;
      void transitionType;
      void transitionDurationMs;
    },
    [previewBlocks, programState?.is_live, setProgramBlocks, stageState, updateProgramState],
  );

  const handleLeftRailTake = useCallback((): void => {
    const previewState = latestStageStateRef.current ?? stageState;

    if (previewState) {
      const committedProgramState: StageState = {
        ...previewState,
        is_live: Boolean(previewState.is_live ?? programState?.is_live),
      };

      latestCommittedProgramStateRef.current = committedProgramState;
      updateProgramState(committedProgramState);
      setProgramBlocks(previewBlocks);

      window.setTimeout(() => {
        if (!latestCommittedProgramStateRef.current) return;
        updateProgramState(latestCommittedProgramStateRef.current);
        setProgramBlocks(previewBlocks);
      }, 250);

      window.setTimeout(() => {
        if (!latestCommittedProgramStateRef.current) return;
        updateProgramState(latestCommittedProgramStateRef.current);
        setProgramBlocks(previewBlocks);
      }, 900);
    }

    setLastTransportActionAt(Date.now());
  }, [previewBlocks, programState?.is_live, setProgramBlocks, stageState, updateProgramState]);

  const handleCenterSwitcherTake = useCallback(
    (mode: "cut" | "auto"): void => {
      const previewState = latestStageStateRef.current ?? stageState;

      if (previewState) {
        const committedProgramState: StageState = {
          ...previewState,
          is_live: Boolean(previewState.is_live ?? programState?.is_live),
        };

        latestCommittedProgramStateRef.current = committedProgramState;
        updateProgramState(committedProgramState);
        setProgramBlocks(previewBlocks);

        window.setTimeout(() => {
          if (!latestCommittedProgramStateRef.current) return;
          updateProgramState(latestCommittedProgramStateRef.current);
          setProgramBlocks(previewBlocks);
        }, 250);

        window.setTimeout(() => {
          if (!latestCommittedProgramStateRef.current) return;
          updateProgramState(latestCommittedProgramStateRef.current);
          setProgramBlocks(previewBlocks);
        }, 900);
      }

      setLastTransportActionAt(Date.now());
      void mode;
    },
    [previewBlocks, programState?.is_live, setProgramBlocks, stageState, updateProgramState],
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
        .catch(handleAsyncError);
    },
    [addToStage, handleAsyncError, updateStageState, api],
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
        .catch(handleAsyncError);
    },
    [handleAsyncError, setPrimaryParticipant, updateStageState, api],
  );

  const handlePinParticipant = useCallback(
    (identity: string): void => {
      void pinParticipant(identity).catch(handleAsyncError);
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

      void removeFromStage(identity).catch(handleAsyncError);
    },
    [handleAsyncError, removeFromStage, updateStageState],
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

  const handleAddMediaAssetToPreview = useCallback(
    (block: PreviewBlock): void => {
      const nextBlockId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setPreviewBlocks((current) => {
        const nextZIndex = current.reduce(
          (highest, currentBlock) => Math.max(highest, currentBlock.zIndex ?? 0),
          block.zIndex ?? 0,
        ) + 1;

        const nextBlock: PreviewBlock = {
          ...block,
          id: nextBlockId,
          zIndex: nextZIndex,
        };

        return [...current, nextBlock];
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
  async function setAutoDirector(enabled: boolean) {
    const data = await api.setAutoDirector(enabled);
    updateStageState(data.state);
    setAutoDirectorEnabled(Boolean(data?.state?.auto_director_enabled));
  }

  async function goLive() {
    const data = await api.goLive();
    updateStageState(data.state);
  }

  async function goOffAir() {
    const data = await api.goOffAir();
    updateStageState(data.state);
  }

  async function setLayout(layout: "solo" | "grid" | "screen_speaker") {
    const data = await api.setLayout(layout);
    updateStageState(data.state);
  }

  async function setScreenShare(participantId: string, trackId: string) {
    const data = await api.setScreenShare(participantId, trackId);
    updateStageState(data.state);
  }

  async function clearScreenShare() {
    const data = await api.clearScreenShare();
    updateStageState(data.state);
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


  // Top chrome props
  const topChromeProps = useMemo(
    () => ({
      headline: stageState?.headline || "Live Production",
      layout: stageState?.layout,
      previewProgramDifferent,
      onStageCount: onStageParticipants.length,
      overlayCount: previewBlocks.length,
      isProgramLive,
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
      stageState?.headline,
      stageState?.layout,
      previewProgramDifferent,
      onStageParticipants.length,
      previewBlocks.length,
      isProgramLive,
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

  // Center workspace props
  const centerSwitcherProps = useMemo(
    () => ({
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
      addTestTextBlock,
      addTestVideoBlock,
      addTestPdfBlock,
      addTestImageBlock,
      addCameraSlotBlock,
      onAddMediaAssetToPreview: handleAddMediaAssetToPreview,
      onUploadPdf: handleUploadPdfClick,
      onUploadVideo: handleUploadVideoClick,
      onUploadImage: handleUploadImageClick,
      duplicateSelectedBlock,
      bringSelectedBlockToFront,
      deleteSelectedBlock,
    }),
    [
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
      addTestTextBlock,
      addTestVideoBlock,
      addTestPdfBlock,
      addTestImageBlock,
      addCameraSlotBlock,
      handleAddMediaAssetToPreview,
      handleUploadPdfClick,
      handleUploadVideoClick,
      handleUploadImageClick,
      duplicateSelectedBlock,
      bringSelectedBlockToFront,
      deleteSelectedBlock,
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
    }),
    [
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
      setError,
    ],
  );

  // Dock props
  const bottomAssetDockProps = useMemo(
    () => ({
      scenes,
      selectedSceneId,
      programSceneId,
      programSlideLabel,
      hotkeySceneId,
      previewBlocks,
      localMicLevel,
      recordingRoomName: roomName ?? sessionId,
      slideDeckName: localPdfDeck?.name ?? null,
      slideCount: localPdfDeck?.pageCount ?? 8,
onAddScene: () => {
  console.log("New Scene")
  startNewScene()
},

onSaveScene: () => {
  console.log("Save Scene")
  saveScene()
},
      onAddMediaAssetToPreview: handleAddMediaAssetToPreview,
      onUploadPdf: handleUploadPdfClick,
      onSendSlideToPreview: transportActions.sendSlideToPreview,
      onTakeSlide: transportActions.takeSlide,
      onApplyScene: handleDockApplyScene,
      onDoubleClickScene: handleDockApplySceneAndTake,
      onDeleteScene: handleDockDeleteScene,
    }),
    [
      scenes,
      selectedSceneId,
      programSceneId,
      programSlideLabel,
      hotkeySceneId,
      previewBlocks,
      localMicLevel,
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
    ],
  );

  const bottomDock = <BottomAssetDock {...bottomAssetDockProps} />;

  if (!token || !serverUrl) {
    return (
      <div className="relative flex h-[100dvh] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(125,211,252,0.060),transparent_34%),radial-gradient(circle_at_80%_14%,rgba(196,181,253,0.045),transparent_32%),linear-gradient(180deg,#07101f_0%,#050b16_52%,#02050b_100%)] p-8 text-white">
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
    <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio>
      <RoomAudioRenderer />

      <div className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_16%_0%,rgba(125,211,252,0.060),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(196,181,253,0.042),transparent_30%),radial-gradient(circle_at_50%_102%,rgba(34,211,238,0.024),transparent_42%),linear-gradient(180deg,#07101f_0%,#050b16_48%,#02050b_100%)] text-white">
        <ProducerRoomBackground />
        <ProducerRoomAtmosphere isLive={isProgramLive} />

        {syncWarningText ? (
          <div className="pointer-events-none absolute left-1/2 top-10 z-[999] w-[min(480px,calc(100vw-32px))] -translate-x-1/2 rounded-[15px] border border-amber-300/14 bg-[linear-gradient(180deg,rgba(35,23,8,0.86),rgba(10,7,4,0.92))] px-3.5 py-2.5 text-center shadow-[0_14px_38px_rgba(0,0,0,0.36),0_0_18px_rgba(251,191,36,0.055)] backdrop-blur-xl">
            <div className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-100/44">
              Producer Sync Notice
            </div>
            <div className="mt-1 text-[11px] font-semibold text-amber-50/70">
              {syncWarningText}
            </div>
          </div>
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

          <ProducerRoomTopChrome {...topChromeProps} />
          <ProducerRoomWorkspaceFrame>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ProducerRoomGrid>
                <ProducerRoomWorkspace
                  leftRail={<ProducerLeftRail {...leftRailProps} />}
                  centerColumn={centerColumn}
                  rightRail={<ProducerRightRail {...rightRailProps} />}
                  bottomDock={bottomDock}
                />
              </ProducerRoomGrid>
            </div>
          </ProducerRoomWorkspaceFrame>
        </ProducerRoomContentStack>
      </div>
    </LiveKitRoom>
  );
}
