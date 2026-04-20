"use client"

import type { ReactNode } from "react"
import type { PreviewBlock } from "./useProducerBlocks"
import StageVideoPreview from "./StageVideoPreview"
import AudienceOriginCue from "@/components/live/AudienceOriginCue"

type StageState = {
  event_id: string
  room_id: string | null
  is_live: boolean
  auto_director_enabled: boolean
  layout: "solo" | "grid" | "screen_speaker"
  stage_participant_ids: string[]
  primary_participant_id: string | null
  pinned_participant_id: string | null
  screen_share_participant_id: string | null
  screen_share_track_id: string | null
  scene_version: number
  headline: string | null
  message: string | null
  updated_by: string | null
  updated_at: string
}

function MonitorHeader({
  title,
  subtitle,
  badge,
  tone = "neutral",
}: {
  title: string
  subtitle: string
  badge?: ReactNode
  tone?: "neutral" | "preview" | "program"
}) {
  const toneClass =
    tone === "program"
      ? "text-red-200/80"
      : tone === "preview"
        ? "text-sky-200/80"
        : "text-white/40"

  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <div className={`text-xs uppercase tracking-[0.2em] ${toneClass}`}>{title}</div>
        <div className="text-sm text-white/55">{subtitle}</div>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  )
}

export default function SwitcherPanel({
  stageState,
  programState,
  onStageParticipantIds,
  previewBlocks,
  programBlocks,
  transitionFromState,
  transitionFromBlocks,
  isTransitioning,
  transitionFadingOut,
  previewProgramDifferent,
  selectedBlockId,
  setSelectedBlockId,
  onPreviewCanvasMouseMove,
  stopDraggingBlock,
  renderPlacedBlocks,
  setLayout,
  autoDirectorEnabled,
  setAutoDirector,
  takeProgram,
  takeBusy,
  setTakeBusy,
  goLive,
  goOffAir,
  setError,
  showAudienceCue,
  audienceCueRegion,
  audienceCueMoonMode,
  audienceCueQuestionLabel,
}: {
  stageState: StageState | null
  programState: StageState | null
  onStageParticipantIds: string[]
  previewBlocks: PreviewBlock[]
  programBlocks: PreviewBlock[]
  transitionFromState: StageState | null
  transitionFromBlocks: PreviewBlock[]
  isTransitioning: boolean
  transitionFadingOut: boolean
  previewProgramDifferent: boolean
  selectedBlockId: string | null
  setSelectedBlockId: (id: string | null) => void
  onPreviewCanvasMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void
  stopDraggingBlock: () => void
  renderPlacedBlocks: (
    blocks: PreviewBlock[],
    opts?: {
      selectable?: boolean
      showChrome?: boolean
      selectedBlockId?: string | null
    }
  ) => ReactNode
  setLayout: (layout: "solo" | "grid" | "screen_speaker") => Promise<void>
  autoDirectorEnabled: boolean
  setAutoDirector: (enabled: boolean) => Promise<void>
  takeProgram: () => Promise<StageState | null>
  takeBusy: boolean
  setTakeBusy: (value: boolean) => void
  goLive: () => Promise<void>
  goOffAir: () => Promise<void>
  setError: (value: string | null) => void
  showAudienceCue: boolean
  audienceCueRegion: string
  audienceCueMoonMode: boolean
  audienceCueQuestionLabel: string
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,42,0.92),rgba(5,8,22,0.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">Switcher</div>
          <div className="mt-1 text-lg font-semibold text-white">Preview → Program</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              void setLayout("solo").catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              stageState?.layout === "solo"
                ? "bg-white text-black"
                : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            Solo
          </button>

          <button
            onClick={() =>
              void setLayout("grid").catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              stageState?.layout === "grid"
                ? "bg-white text-black"
                : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            Grid
          </button>

          <button
            onClick={() =>
              void setLayout("screen_speaker").catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              stageState?.layout === "screen_speaker"
                ? "bg-white text-black"
                : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            Speaker + Screen
          </button>

          <button
            onClick={() =>
              void setAutoDirector(!autoDirectorEnabled).catch((e: unknown) =>
                setError(e instanceof Error ? e.message : "Unexpected error")
              )
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              autoDirectorEnabled
                ? "bg-emerald-400 text-slate-950"
                : "border border-white/15 bg-white/5 text-white"
            }`}
          >
            {autoDirectorEnabled ? "Auto Director On" : "Auto Director Off"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-sky-400/10 bg-[#07111f] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <MonitorHeader
            title="Preview"
            subtitle="What you are preparing"
            tone="preview"
            badge={
              <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
                {previewProgramDifferent ? "Changed" : "Ready"}
              </span>
            }
          />

          <div
            className="relative h-[520px] overflow-hidden rounded-[20px] border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:h-[560px] 2xl:h-[620px]"
            onMouseMove={onPreviewCanvasMouseMove}
            onMouseUp={stopDraggingBlock}
            onMouseLeave={stopDraggingBlock}
            onClick={() => setSelectedBlockId(null)}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />

            <StageVideoPreview
              stageState={stageState}
              participantIds={onStageParticipantIds}
            />

            {renderPlacedBlocks(previewBlocks, {
              selectable: true,
              showChrome: true,
              selectedBlockId,
            })}

            <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] font-medium text-white/65 backdrop-blur">
              PREVIEW
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-red-400/15 bg-[#170b0d] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <MonitorHeader
            title="Program"
            subtitle="What the audience is seeing"
            tone="program"
            badge={
              <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-200">
                {programState?.is_live ? "LIVE" : "HOLDING"}
              </span>
            }
          />

          <div className="relative h-[520px] overflow-hidden rounded-[20px] border border-red-400/10 bg-black shadow-[0_0_0_1px_rgba(239,68,68,0.06),inset_0_1px_0_rgba(255,255,255,0.04)] xl:h-[560px] 2xl:h-[620px]">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-black/35 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-black/35 to-transparent" />

            <div className="relative z-10 h-full">
              <StageVideoPreview
                stageState={programState}
                participantIds={programState?.stage_participant_ids || []}
              />

              {renderPlacedBlocks(programBlocks, {
                selectable: false,
                showChrome: false,
              })}

              <div className="absolute inset-0 z-30 pointer-events-none p-4">
                <AudienceOriginCue
                  visible={showAudienceCue}
                  region={audienceCueRegion}
                  moonMode={audienceCueMoonMode}
                  entering
                  questionLabel={audienceCueQuestionLabel}
                  compact
                  broadcast
                />
              </div>
            </div>

            {isTransitioning && transitionFromState ? (
              <div
                className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-500 ${
                  transitionFadingOut ? "opacity-0" : "opacity-100"
                }`}
              >
                <StageVideoPreview
                  stageState={transitionFromState}
                  participantIds={transitionFromState.stage_participant_ids || []}
                />

                {renderPlacedBlocks(transitionFromBlocks, {
                  selectable: false,
                  showChrome: false,
                })}
              </div>
            ) : null}

            <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full border border-red-400/20 bg-black/55 px-3 py-1 text-[11px] font-semibold text-red-200 backdrop-blur">
              <span
                className={`h-2 w-2 rounded-full ${
                  programState?.is_live ? "animate-pulse bg-red-400" : "bg-white/30"
                }`}
              />
              PROGRAM
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
        <button
          onClick={async () => {
            try {
              setTakeBusy(true)
              setError(null)
              await takeProgram()
            } catch (e: any) {
              setError(e.message)
            } finally {
              setTakeBusy(false)
            }
          }}
          disabled={takeBusy}
          className={`rounded-xl px-5 py-2.5 text-base font-bold text-slate-950 transition disabled:opacity-60 ${
            previewProgramDifferent
              ? "bg-amber-400 hover:bg-amber-300"
              : "bg-sky-400 hover:bg-sky-300"
          }`}
        >
          {takeBusy ? "Taking..." : "TAKE"}
        </button>

        <button
          onClick={() =>
            void goLive().catch((e: unknown) =>
              setError(e instanceof Error ? e.message : "Unexpected error")
            )
          }
          className="rounded-xl bg-red-500 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-red-400"
        >
          Go Live
        </button>

        <button
          onClick={() =>
            void goOffAir().catch((e: unknown) =>
              setError(e instanceof Error ? e.message : "Unexpected error")
            )
          }
          className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-white/10"
        >
          Off Air
        </button>
      </div>
    </div>
  )
}