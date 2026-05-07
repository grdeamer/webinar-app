import { useMemo, useState, type JSX } from "react"
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

function CommandStatusPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "neutral" | "red" | "violet" | "green"
}): JSX.Element {
  const toneClass =
    tone === "red"
      ? "border-red-300/16 bg-red-500/10 text-red-100/72"
      : tone === "violet"
        ? "border-violet-300/16 bg-violet-400/10 text-violet-100/72"
        : tone === "green"
          ? "border-emerald-300/16 bg-emerald-400/10 text-emerald-100/72"
          : "border-white/10 bg-black/24 text-white/42"

  return (
    <div className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${toneClass}`}>
      <span className="text-white/30">{label}</span>{" "}
      <span>{value}</span>
    </div>
  )
}

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

  const commandState = useMemo(() => {
    if (takeBusy) return "Transition Locked"
    if (!previewProgramDifferent) return "Program Safe"
    return "Preview Armed"
  }, [previewProgramDifferent, takeBusy])

  return (
    <div className="relative mb-3 space-y-2.5 rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.07),transparent_32%),linear-gradient(180deg,rgba(6,10,24,0.90),rgba(2,4,10,0.98))] px-3 py-3 shadow-[0_30px_120px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.055)] md:px-4 xl:px-5 2xl:px-6">
      {takeFlash ? <TakeFlashOverlay mode={takeFlash} /> : null}

      <CommandSurfaceHeader isLive={isLive} />

      <TelemetryStrip
        isLive={isLive}
        audienceCount={audienceCount}
        onStageCount={onStageCount}
        runtimeLabel={runtimeLabel}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.014))] px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/32">
            Switcher Command State
          </div>

          <div className="mt-1 text-sm font-semibold tracking-tight text-white">
            {commandState}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CommandStatusPill
            label="Program"
            value={isLive ? "Live" : "Standby"}
            tone={isLive ? "red" : "neutral"}
          />

          <CommandStatusPill
            label="Preview"
            value={previewProgramDifferent ? "Armed" : "Matched"}
            tone={previewProgramDifferent ? "violet" : "green"}
          />

          <CommandStatusPill
            label="Transition"
            value={takeBusy ? "Locked" : "Ready"}
            tone={takeBusy ? "red" : "green"}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.014))] px-3 py-2 shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/32">
            Transition Transport
          </div>
          <div className="mt-1 text-sm font-semibold tracking-tight text-white">
            {selectedTransitionType.replace("_", " ")} · {selectedTransitionDurationMs}ms transport
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
                    ? "border-violet-300/28 bg-violet-400/16 text-violet-100 shadow-[0_0_22px_rgba(168,85,247,0.20)]"
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