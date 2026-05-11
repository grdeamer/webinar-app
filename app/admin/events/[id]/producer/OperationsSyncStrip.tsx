import type { JSX } from "react"
import type { StageState } from "./producerRoomTypes"

function formatTransportTimestamp(value: number | null): string {
  if (!value) return "No commands yet"

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default function OperationsSyncStrip({
  previewProgramDifferent,
  takeBusy,
  selectedSceneLabel,
  programSlideLabel,
  onStageCount,
  participantCount,
  previewBlockCount,
  programBlockCount,
  hasProgramSource,
  hasScreenShare,
  lastTakeMode,
  hotkeySceneLabel,
  lastTransportActionAt,
  isLive,
  layout,
}: {
  previewProgramDifferent: boolean
  takeBusy: boolean
  selectedSceneLabel: string | null
  programSlideLabel: string | null
  onStageCount: number
  participantCount: number
  previewBlockCount: number
  programBlockCount: number
  hasProgramSource: boolean
  hasScreenShare: boolean
  lastTakeMode: "cut" | "auto" | null
  hotkeySceneLabel: string | null
  lastTransportActionAt: number | null
  isLive: boolean
  layout: StageState["layout"] | null | undefined
}): JSX.Element {
  const commandState = takeBusy
    ? "Transport Locked"
    : previewProgramDifferent
      ? "Preview Armed"
      : "Program Synced"

  return (
    <div className="border-b border-white/8 bg-black/18 px-4 py-2 md:px-5 xl:px-6 2xl:px-7">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[22px] border border-white/8 bg-black/20 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/36">
          <span className="rounded-full border border-violet-300/14 bg-violet-400/8 px-2.5 py-1 text-violet-100/58">
            Ops Sync
          </span>
          <span className="rounded-full border border-white/8 bg-black/24 px-2.5 py-1">
            {commandState}
          </span>
          <span className="rounded-full border border-white/8 bg-black/24 px-2.5 py-1">
            Command: {formatTransportTimestamp(lastTransportActionAt)}
          </span>
          <span className="rounded-full border border-sky-300/12 bg-sky-400/8 px-2.5 py-1 text-sky-100/54">
            {selectedSceneLabel ? `Scene: ${selectedSceneLabel}` : "Scene Memory Idle"}
          </span>
          {hotkeySceneLabel ? (
            <span className="rounded-full border border-violet-300/16 bg-violet-400/10 px-2.5 py-1 text-violet-100/62">
              Hotkey Recall: {hotkeySceneLabel}
            </span>
          ) : null}
          <span className="rounded-full border border-amber-300/12 bg-amber-400/8 px-2.5 py-1 text-amber-100/54">
            {programSlideLabel ? `Deck: ${programSlideLabel}` : "Deck Standby"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/34">
          <span className="rounded-full border border-sky-300/12 bg-sky-400/8 px-2.5 py-1 text-sky-100/54">
            Layout: {layout === "screen_speaker" ? "Speaker + Screen" : layout === "grid" ? "Grid" : "Solo"}
          </span>
          <span className="rounded-full border border-emerald-300/12 bg-emerald-400/8 px-2.5 py-1 text-emerald-100/54">
            {onStageCount} Talent Routed
          </span>
          <span className="hidden rounded-full border border-white/8 bg-black/24 px-2.5 py-1 text-white/42 xl:inline-flex">
            {previewBlockCount} Preview / {programBlockCount} Program Assets
          </span>
          <span className="hidden rounded-full border border-white/8 bg-black/24 px-2.5 py-1 text-white/42 2xl:inline-flex">
            {participantCount} Viewers
          </span>
          <span className="hidden rounded-full border border-white/8 bg-black/24 px-2.5 py-1 text-white/42 2xl:inline-flex">
            {hasScreenShare ? "Screen Route: Active" : "Screen Route: Idle"}
          </span>
          <span className="hidden rounded-full border border-white/8 bg-black/24 px-2.5 py-1 text-white/42 2xl:inline-flex">
            {hasProgramSource ? "Return: Clean" : "Return: No Source"}
          </span>
          <span className="hidden rounded-full border border-white/8 bg-black/24 px-2.5 py-1 text-white/42 2xl:inline-flex">
            {isLive ? "Audience Route: Live" : "Audience Route: Holding"}
          </span>
          <span className="hidden rounded-full border border-red-300/12 bg-red-400/8 px-2.5 py-1 text-red-100/54 2xl:inline-flex">
            {lastTakeMode ? `Last: ${lastTakeMode}` : "Take Standby"}
          </span>
        </div>
      </div>
    </div>
  )
}