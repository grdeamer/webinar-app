"use client";

import React from "react";
import type { JSX } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";

import { ProducerRoomAtmosphere } from "./ProducerRoomClientChrome";
import ProducerLeftRail from "./ProducerLeftRail";
import ProducerRightRail from "./ProducerRightRail";
import { type RecordingStatus } from "./BottomAssetDock";
import ProducerRoomTopChrome from "./ProducerRoomTopChrome";
import { type ProducerWorkspaceMode } from "./ProducerModeBar";
import ProducerRoomWorkspace from "./ProducerRoomWorkspace";
import { ProducerAdvancedWorkspace, ProducerPrepareWorkspace } from "./ProducerOperationalWorkspaces";
import ProducerV1Header from "./ProducerV1Header";
import { getProducerThemeStyle } from "./producerTheme";
import ProducerSafetyDialog, {
  type ProducerSafetyAction,
} from "./ProducerSafetyDialog";
import {
  ProducerRoomBackground,
  ProducerRoomContentStack,
  ProducerRoomGrid,
  ProducerRoomWorkspaceFrame,
  ProducerUploadInputs,
} from "./ProducerRoomShell";

import {
  type ProducerHealthSnapshot,
  type ProducerTransportHealth,
} from "./producerHealthUtils";

export type ProducerRoomClientViewProps = {
  token: string | null;
  serverUrl: string | null;
  liveKitRoomKey: number;
  setTransportHealth: React.Dispatch<
    React.SetStateAction<ProducerTransportHealth>
  >;
  setSyncWarningText: React.Dispatch<React.SetStateAction<string | null>>;
  isProgramLive: boolean;
  eventId: string;
  eventTitle: string;
  eventAccent: string;
  pendingSafetyAction: ProducerSafetyAction | null;
  liveSafetyChecks: {
    label: string;
    detail: string;
    ready: boolean;
    required?: boolean;
  }[];
  liveActionBusy: boolean;
  handleCancelSafetyAction: () => void;
  handleConfirmSafetyAction: () => Promise<void>;
  pdfInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  handleProducerPdfInputChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  handleVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  loadingText: string;
  syncWarningText: string | null;
  operatorNotice: string | null;
  recoveryBusy: boolean;
  handleRecoverControlPlane: () => Promise<void>;
  healthSnapshot: ProducerHealthSnapshot;
  transportHealth: ProducerTransportHealth;
  recordingHealth: { status: RecordingStatus; error: string | null };
  workspaceMode: ProducerWorkspaceMode;
  setWorkspaceMode: React.Dispatch<React.SetStateAction<ProducerWorkspaceMode>>;
  standardToolsOpen: boolean;
  setStandardToolsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  topChromeProps: React.ComponentProps<typeof ProducerRoomTopChrome>;
  centerColumn: React.ReactNode;
  leftRailProps: React.ComponentProps<typeof ProducerLeftRail>;
  rightRailProps: React.ComponentProps<typeof ProducerRightRail>;
  bottomDock: React.ReactNode;
  operationalWorkspaceProps: React.ComponentProps<typeof ProducerPrepareWorkspace>;
};

export default function ProducerRoomClientView(
  props: ProducerRoomClientViewProps,
): JSX.Element {
  const {
    token,
    serverUrl,
    liveKitRoomKey,
    setTransportHealth,
    setSyncWarningText,
    isProgramLive,
    eventTitle,
    eventAccent,
    pendingSafetyAction,
    liveSafetyChecks,
    liveActionBusy,
    handleCancelSafetyAction,
    handleConfirmSafetyAction,
    pdfInputRef,
    videoInputRef,
    imageInputRef,
    handleProducerPdfInputChange,
    handleVideoUpload,
    handleImageUpload,
    error,
    loadingText,
    syncWarningText,
    operatorNotice,
    recoveryBusy,
    handleRecoverControlPlane,
    transportHealth,
    workspaceMode,
    setWorkspaceMode,
    standardToolsOpen,
    topChromeProps,
    centerColumn,
    leftRailProps,
    rightRailProps,
    bottomDock,
    operationalWorkspaceProps,
  } = props;

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
        setSyncWarningText(
          "Live transport disconnected. Use Recover to reconnect safely.",
        );
      }}
      onError={(liveKitError) => {
        setTransportHealth("degraded");
        setSyncWarningText(`Live transport error: ${liveKitError.message}`);
      }}
    >
      <RoomAudioRenderer />

      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#030714] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] text-center text-white md:hidden">
        <div className="max-w-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-300/10 text-2xl" aria-hidden="true">
            ↻
          </div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200/60">
            Producer Room
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Rotate your iPhone
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            The live switcher opens in landscape so Preview, Program, audio, and
            TAKE remain safely separated. For the full control surface, use an
            iPad or computer.
          </p>
        </div>
      </div>

      <div
        className="fixed inset-0 z-[300] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_18%_-8%,rgba(var(--producer-brand-primary),0.13),transparent_34%),radial-gradient(circle_at_82%_2%,rgba(var(--producer-brand-secondary),0.08),transparent_31%),linear-gradient(180deg,#080d19_0%,#050914_48%,#03060d_100%)] text-white"
        style={getProducerThemeStyle(eventAccent)}
        data-event-title={eventTitle}
      >
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
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <ProducerV1Header
                eventTitle={eventTitle}
                stageTitle={topChromeProps.headline}
                mode={workspaceMode}
                transportHealth={transportHealth}
                isProgramLive={isProgramLive}
                liveActionBusy={leftRailProps.liveActionBusy}
                onModeChange={setWorkspaceMode}
                onGoLive={leftRailProps.onGoLive}
                onGoOffAir={leftRailProps.onGoOffAir}
              />
              {syncWarningText ? (
                <div
                  className="relative z-[90] flex shrink-0 items-center justify-between gap-4 border-y border-amber-300/18 bg-[linear-gradient(90deg,rgba(46,30,8,0.94),rgba(18,12,5,0.98))] px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
                  role="alert"
                >
                  <div className="min-w-0">
                    <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-amber-100/55">
                      Producer sync notice
                    </span>
                    <span className="ml-3 text-[10px] font-medium text-amber-50/78">
                      {syncWarningText}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={recoveryBusy}
                    onClick={() => void handleRecoverControlPlane()}
                    className="shrink-0 rounded-[9px] border border-amber-200/20 bg-amber-100/[0.08] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-50/78 transition hover:bg-amber-100/[0.14] disabled:opacity-45"
                  >
                    {recoveryBusy ? "Recovering…" : "Recover"}
                  </button>
                </div>
              ) : null}
              {operatorNotice ? (
                <div
                  className="relative z-[89] shrink-0 border-y border-emerald-300/14 bg-emerald-400/[0.075] px-4 py-2 text-center text-[10px] font-medium text-emerald-50/76"
                  role="status"
                  aria-live="polite"
                >
                  {operatorNotice}
                </div>
              ) : null}
              <ProducerRoomWorkspaceFrame>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {workspaceMode === "show" ? (
                    <ProducerRoomGrid>
                      <ProducerRoomWorkspace
                        leftRail={<ProducerLeftRail {...leftRailProps} />}
                        centerColumn={centerColumn}
                        rightRail={<ProducerRightRail {...rightRailProps} />}
                        bottomDock={bottomDock}
                        bottomDockExpanded={standardToolsOpen}
                      />
                    </ProducerRoomGrid>
                  ) : workspaceMode === "prepare" ? (
                    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_300px] gap-3 overflow-hidden p-4 pt-3">
                      <div className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#07111d]/72">
                        <ProducerPrepareWorkspace {...operationalWorkspaceProps} />
                      </div>
                      <div className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#07111d]/82">
                        <ProducerRightRail {...rightRailProps} />
                      </div>
                    </div>
                  ) : (
                    <ProducerAdvancedWorkspace {...operationalWorkspaceProps} />
                  )}
                </div>
              </ProducerRoomWorkspaceFrame>
            </main>
          </div>
        </ProducerRoomContentStack>
      </div>
    </LiveKitRoom>
  );
}
