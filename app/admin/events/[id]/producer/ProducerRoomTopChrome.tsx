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
    <div className="group/topchrome relative isolate overflow-hidden border-b border-white/[0.035] bg-[linear-gradient(180deg,rgba(8,12,22,0.12),rgba(8,12,22,0.035),transparent)]">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-16 transition-opacity duration-700 ${
          isLive
            ? "bg-[radial-gradient(circle_at_50%_0%,rgba(248,113,113,0.024),transparent_66%)] opacity-46"
            : "bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.018),transparent_66%)] opacity-32"
        }`}
      />
      <div className="pointer-events-none absolute inset-x-10 top-0 z-0 h-px bg-gradient-to-r from-transparent via-white/[0.032] to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.004)_42%,transparent_64%)] animate-[topChromeTransmissionSweep_26s_ease-in-out_infinite]" />

      <div className="pointer-events-none absolute right-5 top-3 z-20 hidden items-center gap-1.5 rounded-full border border-white/6 bg-white/[0.026] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.11em] text-white/22 backdrop-blur-md 2xl:flex">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isLive
              ? "bg-red-300/75 shadow-[0_0_5px_rgba(252,165,165,0.24)]"
              : "bg-sky-300/70 shadow-[0_0_5px_rgba(125,211,252,0.18)]"
          }`}
        />
        {isLive ? "Live" : "Standby"}
      </div>

      <div className="relative z-10 px-0 pb-1">{children}</div>

      <style jsx global>{`
        @keyframes topChromeTransmissionSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          42% {
            opacity: 0.08;
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
      <div className="space-y-1.5">
        <ProducerRoomHeader
          headline={headline}
          layout={layout}
          previewProgramDifferent={previewProgramDifferent}
          onStageCount={onStageCount}
          overlayCount={overlayCount}
          isLive={isProgramLive}
          scopeLabel={scopeLabel}
        />

        <div className="opacity-52 saturate-[0.74] contrast-[0.94] transition-opacity duration-300 group-hover/topchrome:opacity-76 hover:opacity-86">
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
            lastTransportActionAt={lastTransportActionAt}
            isLive={isProgramLive}
            layout={layout}
          />
        </div>

        <div className="opacity-72 saturate-[0.84] contrast-[0.96] transition-opacity duration-300 group-hover/topchrome:opacity-90 hover:opacity-100">
          <BroadcastCommandDeck
            isLive={isProgramLive}
            audienceCount={participantCount}
            onStageCount={onStageCount}
            previewProgramDifferent={previewProgramDifferent}
            takeBusy={takeBusy}
            onTake={onTake}
          />
        </div>
      </div>
    </TopChromeTransmissionShell>
  )
}