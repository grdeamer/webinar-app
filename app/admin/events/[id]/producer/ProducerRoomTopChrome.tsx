

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
  )
}