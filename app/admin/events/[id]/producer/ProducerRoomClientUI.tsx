"use client";

import type { JSX } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";

import ProducerModeBar, { type ProducerWorkspaceMode } from "./ProducerModeBar";
import ProducerHealthBar from "./ProducerHealthBar";
import ProducerRoomTopChrome from "./ProducerRoomTopChrome";
import ProducerRoomWorkspace from "./ProducerRoomWorkspace";
import ProducerNavigationRail from "./ProducerNavigationRail";
import ProducerSafetyDialog, {
  type ProducerSafetyAction,
} from "./ProducerSafetyDialog";
import BottomAssetDock, { type RecordingStatus } from "./BottomAssetDock";
import {
  ProducerRoomBackground,
  ProducerRoomCenterColumn,
  ProducerRoomContentStack,
  ProducerRoomGrid,
  ProducerRoomWorkspaceFrame,
  ProducerUploadInputs,
} from "./ProducerRoomShell";
import {
  type ProducerHealthSnapshot,
  type ProducerTransportHealth,
} from "./producerHealthUtils";

type ProducerRoomClientUIProps = {
  token: string | null;
  serverUrl: string | null;
  liveKitRoomKey: number;
  error: string | null;
  loadingText: string;
  isProgramLive: boolean;
  pendingSafetyAction: ProducerSafetyAction | null;
  liveSafetyChecks: {
    label: string;
    detail: string;
    ready: boolean;
    required?: boolean;
  }[];
  liveActionBusy: boolean;
  handleCancelSafetyAction: () => void;
  handleConfirmSafetyAction: () => void;
  syncWarningText: string | null;
  recoveryBusy: boolean;
  handleRecoverControlPlane: () => void;
  operatorNotice: string | null;
  healthSnapshot: ProducerHealthSnapshot;
  transportHealth: ProducerTransportHealth;
  recordingHealth: { status: RecordingStatus; error: string | null };
  workspaceMode: ProducerWorkspaceMode;
  setWorkspaceMode: (mode: ProducerWorkspaceMode) => void;
  standardToolsOpen: boolean;
  setStandardToolsOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  eventId: string;
  topChromeNode: JSX.Element;
  leftRailNode: JSX.Element;
  centerColumn: JSX.Element;
  rightRailNode: JSX.Element;
  bottomDock: JSX.Element;
  pdfInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  handleProducerPdfInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: Error) => void;
};

function ProducerRoomAtmosphere({ isLive }: { isLive: boolean }): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <div className="absolute -right-[12vw] -top-[26vw] aspect-square w-[48vw] max-w-[760px] rounded-full border border-blue-200/[0.08] bg-[radial-gradient(circle_at_32%_32%,rgba(112,157,255,0.28),transparent_22%),radial-gradient(circle_at_48%_54%,rgba(35,83,177,0.54),rgba(7,20,54,0.78)_56%,rgba(2,7,20,0.92)_76%)] opacity-28 shadow-[-30px_40px_110px_rgba(57,111,224,0.12)]" />
      <div
        className={`absolute left-[-20%] top-[6%] h-[430px] w-[430px] rounded-full blur-3xl transition-opacity duration-1000 ${
          isLive ? "bg-red-300/[0.030] opacity-44" : "bg-sky-200/[0.036] opacity-40"
        } animate-[producerAtmosphereDrift_34s_ease-in-out_infinite]`}
      />
      <div className="absolute right-[-18%] top-[26%] h-[460px] w-[460px] rounded-full bg-sky-200/[0.018] blur-3xl animate-[producerAtmosphereCounterDrift_38s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-24%] left-[26%] h-[470px] w-[470px] rounded-full bg-cyan-200/[0.022] blur-3xl animate-[producerAtmosphereBloom_36s_ease-in-out_infinite]" />

      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.003)_38%,transparent_62%)] animate-[producerTransmissionSheen_42s_ease-in-out_infinite]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.008)_0px,rgba(255,255,255,0.008)_1px,transparent_1px,transparent_16px)] opacity-[0.018]" />

      {isLive ? (
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-red-200/24 to-transparent animate-[producerLiveScan_4.6s_ease-in-out_infinite]" />
      ) : null}

    </div>
  );
}

export default function ProducerRoomClientUI({
  token,
  serverUrl,
  liveKitRoomKey,
  error,
  loadingText,
  isProgramLive,
  pendingSafetyAction,
  liveSafetyChecks,
  liveActionBusy,
  handleCancelSafetyAction,
  handleConfirmSafetyAction,
  syncWarningText,
  recoveryBusy,
  handleRecoverControlPlane,
  operatorNotice,
  healthSnapshot,
  transportHealth,
  recordingHealth,
  workspaceMode,
  setWorkspaceMode,
  standardToolsOpen,
  setStandardToolsOpen,
  eventId,
  topChromeNode,
  leftRailNode,
  centerColumn,
  rightRailNode,
  bottomDock,
  pdfInputRef,
  videoInputRef,
  imageInputRef,
  handleProducerPdfInputChange,
  handleVideoUpload,
  handleImageUpload,
  onConnected,
  onDisconnected,
  onError,
}: ProducerRoomClientUIProps) {
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
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      onError={onError}
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
              {topChromeNode}
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
                      leftRail={leftRailNode}
                      centerColumn={centerColumn}
                      rightRail={rightRailNode}
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
