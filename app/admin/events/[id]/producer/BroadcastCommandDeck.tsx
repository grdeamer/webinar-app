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

  const [selectedTransitionDurationMs, setSelectedTransitionDurationMs] =
    useState(600)

  const { takeFlash, triggerTake } = useTakeControls({
    previewProgramDifferent,
    takeBusy,
    onTake: (mode, transitionType) => {
      onTake(mode, transitionType, selectedTransitionDurationMs)
    },
  })

  return (
    <div className="relative mb-3 space-y-2.5 rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.06),transparent_32%),linear-gradient(180deg,rgba(6,10,24,0.86),rgba(2,4,10,0.96))] px-3 py-3 shadow-[0_28px_100px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.055)] md:px-4 xl:px-5 2xl:px-6">
      {takeFlash ? <TakeFlashOverlay mode={takeFlash} /> : null}

      <CommandSurfaceHeader isLive={isLive} />

      <TelemetryStrip
        isLive={isLive}
        audienceCount={audienceCount}
        onStageCount={onStageCount}
        runtimeLabel={runtimeLabel}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.014))] px-3 py-2 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/32">
            Transition Transport
          </div>
          <div className="mt-1 text-sm font-semibold tracking-tight text-white">
            {selectedTransitionType.replace("_", " ")} · {selectedTransitionDurationMs}ms
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[250, 400, 600, 900, 1400].map((duration) => {
            const active = selectedTransitionDurationMs === duration

            return (
              <button
                key={duration}
                type="button"
                onClick={() => setSelectedTransitionDurationMs(duration)}
                className={[
                  "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200",
                  active
                    ? "border-violet-300/28 bg-violet-400/14 text-violet-100 shadow-[0_0_18px_rgba(168,85,247,0.16)]"
                    : "border-white/10 bg-black/28 text-white/42 hover:border-white/18 hover:bg-white/[0.05] hover:text-white",
                ].join(" ")}
              >
                {duration}ms
              </button>
            )
          })}
        </div>
      </div>

      <LowerCommandGrid
        previewProgramDifferent={previewProgramDifferent}
        takeBusy={takeBusy}
        onTake={triggerTake}
        selectedTransitionType={selectedTransitionType}
        onTransitionTypeChange={setSelectedTransitionType}
        selectedTransitionDurationMs={selectedTransitionDurationMs}
        onTransitionDurationChange={setSelectedTransitionDurationMs}
      />

      <CommandDeckStyles />
    </div>
  )
}