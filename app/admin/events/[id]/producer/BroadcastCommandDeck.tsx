import { useState, type JSX } from "react"
import type {
  BroadcastCommandDeckProps,
  CinematicTransitionType,
} from "./commandDeckTypes"
import { useRuntimeLabel, useTakeControls } from "./useCommandDeckControls"
import {
  CommandDeckStyles,
  CommandSurfaceHeader,
  LowerCommandGrid,
  TakeFlashOverlay,
  TelemetryStrip,
} from "./CommandDeckPanels"

export default function BroadcastCommandDeck({
  isLive,
  audienceCount,
  onStageCount,
  previewProgramDifferent,
  takeBusy,
  onTake,
}: BroadcastCommandDeckProps): JSX.Element {
  const runtimeLabel = useRuntimeLabel()

  const [selectedTransitionType, setSelectedTransitionType] =
    useState<CinematicTransitionType>("fade")

  const { takeFlash, triggerTake } = useTakeControls({
    previewProgramDifferent,
    takeBusy,
    onTake,
  })

  return (
    <div className="relative mb-4 space-y-3 px-3 md:px-4 xl:px-5 2xl:px-6">
      {takeFlash ? <TakeFlashOverlay mode={takeFlash} /> : null}

      <CommandSurfaceHeader isLive={isLive} />

      <TelemetryStrip
        isLive={isLive}
        audienceCount={audienceCount}
        onStageCount={onStageCount}
        runtimeLabel={runtimeLabel}
      />

      <LowerCommandGrid
        previewProgramDifferent={previewProgramDifferent}
        takeBusy={takeBusy}
        onTake={triggerTake}
        selectedTransitionType={selectedTransitionType}
        onTransitionTypeChange={setSelectedTransitionType}
      />

      <CommandDeckStyles />
    </div>
  )
}