import type { JSX } from "react"

import BroadcastCommandDeck from "./BroadcastCommandDeck"
import OperationsSyncStrip from "./OperationsSyncStrip"
import ProducerRoomHeader from "./ProducerRoomHeader"
import type { CinematicTransitionType } from "./commandDeckTypes"
import type { StageState } from "./producerRoomTypes"

type ProducerRoomTopChromeProps = {
  headline: string
  layout: StageState["layout"] | undefined
  previewProgramDifferent: boolean
  onStageCount: number
  overlayCount: number
  isProgramLive: boolean
  scopeLabel: string
  takeBusy: boolean
  selectedSceneLabel: string | null
  programSlideLabel: string | null
  participantCount: number
  previewBlockCount: number
  programBlockCount: number
  hasProgramSource: boolean
  hasScreenShareRoute: boolean
  lastTakeMode: "cut" | "auto" | null
  hotkeySceneLabelText: string | null
  lastTransportActionAt: number | null
  onTake: (
    mode: "cut" | "auto",
    transitionType?: CinematicTransitionType,
    transitionDurationMs?: number
  ) => void
}

function TopChromeTransmissionShell({
  isLive,
  children,
}: {
  isLive: boolean
  children: JSX.Element
}): JSX.Element {
  return (
    <div className="relative isolate overflow-hidden">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-28 transition-opacity duration-700 ${
          isLive
            ? "bg-[radial-gradient(circle_at_50%_0%,rgba(248,113,113,0.10),transparent_62%)] opacity-90"
            : "bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.065),transparent_62%)] opacity-72"
        }`}
      />
      <div className="pointer-events-none absolute inset-x-6 top-0 z-0 h-px bg-gradient-to-r from-transparent via-white/11 to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.012)_42%,transparent_64%)] animate-[topChromeTransmissionSweep_14s_ease-in-out_infinite]" />

      <div className="pointer-events-none absolute right-6 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/28 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-white/42 backdrop-blur-md">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isLive
              ? "bg-red-300 shadow-[0_0_8px_rgba(252,165,165,0.42)]"
              : "bg-sky-300/75 shadow-[0_0_7px_rgba(125,211,252,0.28)]"
          }`}
        />
        {isLive ? "Broadcast Active" : "Standby Ready"}
      </div>

      <div className="relative z-10">{children}</div>

      <style jsx global>{`
        @keyframes topChromeTransmissionSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          42% {
            opacity: 0.36;
          }

          100% {
            transform: translateX(18%);
          }
        }
      `}</style>
    </div>
  )
}

export default function ProducerRoomTopChrome({
  headline,
  layout,
  previewProgramDifferent,
  onStageCount,
  overlayCount,
  isProgramLive,
  scopeLabel,
  takeBusy,
  selectedSceneLabel,
  programSlideLabel,
  participantCount,
  previewBlockCount,
  programBlockCount,
  hasProgramSource,
  hasScreenShareRoute,
  lastTakeMode,
  hotkeySceneLabelText,
  lastTransportActionAt,
  onTake,
}: ProducerRoomTopChromeProps): JSX.Element {
  return (
    <TopChromeTransmissionShell isLive={isProgramLive}>
      <>
        <ProducerRoomHeader
          headline={headline}
          layout={layout}
          previewProgramDifferent={previewProgramDifferent}
          onStageCount={onStageCount}
          overlayCount={overlayCount}
          isLive={isProgramLive}
          scopeLabel={scopeLabel}
        />

        <OperationsSyncStrip
          previewProgramDifferent={previewProgramDifferent}
          takeBusy={takeBusy}
          selectedSceneLabel={selectedSceneLabel}
          programSlideLabel={programSlideLabel}
          onStageCount={onStageCount}
          participantCount={participantCount}
          previewBlockCount={previewBlockCount}
          programBlockCount={programBlockCount}
          hasProgramSource={hasProgramSource}
          hasScreenShare={hasScreenShareRoute}
          lastTakeMode={lastTakeMode}
          hotkeySceneLabel={hotkeySceneLabelText}
          lastTransportActionAt={lastTransportActionAt}
          isLive={isProgramLive}
          layout={layout}
        />

        <BroadcastCommandDeck
          isLive={isProgramLive}
          audienceCount={participantCount}
          onStageCount={onStageCount}
          previewProgramDifferent={previewProgramDifferent}
          takeBusy={takeBusy}
          onTake={onTake}
        />
      </>
    </TopChromeTransmissionShell>
  )
}