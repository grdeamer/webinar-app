import type { JSX } from "react"

type StageLayout = "solo" | "grid" | "screen_speaker"

export default function ProducerRoomHeader({
  headline,
  layout,
  previewProgramDifferent,
  onStageCount,
  overlayCount,
  isLive,
  scopeLabel,
}: {
  headline: string
  layout: StageLayout | null | undefined
  previewProgramDifferent: boolean
  onStageCount: number
  overlayCount: number
  isLive: boolean
  scopeLabel: string
}): JSX.Element {
  return (
    <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,rgba(8,15,28,0.96),rgba(3,8,20,0.86))] px-4 py-4 shadow-[0_28px_90px_rgba(0,0,0,0.52)] backdrop-blur-2xl md:px-6 xl:px-8 2xl:px-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-sky-300/25 bg-sky-400/12 shadow-[0_0_50px_rgba(56,189,248,0.28)]">
            <div className="h-7 w-7 rounded-full border border-sky-200/75 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.95),rgba(56,189,248,0.48)_35%,rgba(79,70,229,0.34)_70%)] shadow-[0_0_30px_rgba(125,211,252,0.7)]" />
            <div className="absolute h-10 w-14 -rotate-12 rounded-full border border-sky-200/35" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/35">
              <span>Jupiter</span>
              <span className="text-white/20">•</span>
              <span>Mission Control</span>
              <span className="text-white/20">•</span>
              <span>{scopeLabel}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-end gap-3">
              <h1 className="truncate text-[34px] font-semibold leading-none tracking-[-0.055em] text-white">
                {headline}
              </h1>

              <span className="rounded-full border border-sky-300/25 bg-sky-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.18)]">
                {layout === "screen_speaker"
                  ? "Speaker + Screen"
                  : layout === "grid"
                    ? "Grid"
                    : "Solo"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-2">
          <div className="relative overflow-hidden rounded-[26px] border border-red-400/25 bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.22),transparent_42%),linear-gradient(180deg,rgba(127,29,29,0.58),rgba(239,68,68,0.13))] p-4 shadow-[0_0_60px_rgba(239,68,68,0.18)]">
            <div className="text-[10px] uppercase tracking-[0.24em] text-red-100/70">
              Program
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  isLive
                    ? "animate-pulse bg-red-400 shadow-[0_0_24px_rgba(248,113,113,1)]"
                    : "bg-white/25"
                }`}
              />
              <span className="text-xl font-semibold tracking-[-0.03em] text-white">
                {isLive ? "On Air" : "Holding"}
              </span>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.028))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/35">
              Show State
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {previewProgramDifferent ? "Preview Changed" : "In Sync"}
            </div>
            <div className="mt-1 text-xs text-white/40">
              {onStageCount} talent · {overlayCount} overlays
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
