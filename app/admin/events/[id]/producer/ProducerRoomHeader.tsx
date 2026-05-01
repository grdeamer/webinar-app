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
    <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.1),transparent_32%),linear-gradient(180deg,rgba(8,15,28,0.94),rgba(3,8,20,0.84))] px-4 py-3 shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl md:px-5 xl:px-6 2xl:px-7">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border border-sky-300/25 bg-sky-400/12 shadow-[0_0_36px_rgba(56,189,248,0.24)]">
            <div className="h-6 w-6 rounded-full border border-sky-200/75 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.95),rgba(56,189,248,0.48)_35%,rgba(79,70,229,0.34)_70%)] shadow-[0_0_24px_rgba(125,211,252,0.65)]" />
            <div className="absolute h-8 w-12 -rotate-12 rounded-full border border-sky-200/35" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-white/35">
              <span>Jupiter</span>
              <span className="text-white/20">•</span>
              <span>Mission Control</span>
              <span className="text-white/20">•</span>
              <span>{scopeLabel}</span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-end gap-2.5">
              <h1 className="truncate text-[28px] font-semibold leading-none tracking-[-0.05em] text-white xl:text-[30px]">
                {headline}
              </h1>

              <span className="rounded-full border border-sky-300/25 bg-sky-500/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.16)]">
                {layout === "screen_speaker"
                  ? "Speaker + Screen"
                  : layout === "grid"
                    ? "Grid"
                    : "Solo"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[430px] xl:grid-cols-2">
          <div className="relative overflow-hidden rounded-[22px] border border-red-400/25 bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.2),transparent_42%),linear-gradient(180deg,rgba(127,29,29,0.5),rgba(239,68,68,0.11))] p-3 shadow-[0_0_42px_rgba(239,68,68,0.15)]">
            <div className="text-[9px] uppercase tracking-[0.22em] text-red-100/65">
              Program
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isLive
                    ? "animate-pulse bg-red-400 shadow-[0_0_24px_rgba(248,113,113,1)]"
                    : "bg-white/25"
                }`}
              />
              <span className="text-base font-semibold tracking-[-0.03em] text-white">
                {isLive ? "On Air" : "Holding"}
              </span>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.024))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/35">
              Show State
            </div>
            <div className="mt-1.5 text-base font-semibold text-white">
              {previewProgramDifferent ? "Preview Changed" : "In Sync"}
            </div>
            <div className="mt-0.5 text-[11px] text-white/40">
              {onStageCount} talent · {overlayCount} overlays
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
