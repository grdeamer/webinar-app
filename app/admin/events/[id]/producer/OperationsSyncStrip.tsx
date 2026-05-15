import type { JSX } from "react"
import type { StageState } from "./producerRoomTypes"

function formatTransportTimestamp(value: number | null): string {
  if (!value) return "Ready"

  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

function SyncPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "neutral" | "violet" | "sky" | "amber" | "emerald" | "red"
}): JSX.Element {
  const toneClass =
    tone === "violet"
      ? "border-violet-300/12 bg-violet-400/[0.07] text-violet-100/55 shadow-[0_0_10px_rgba(167,139,250,0.055)]"
      : tone === "sky"
        ? "border-sky-300/12 bg-sky-400/[0.07] text-sky-100/55 shadow-[0_0_10px_rgba(56,189,248,0.055)]"
        : tone === "amber"
          ? "border-amber-300/12 bg-amber-400/[0.07] text-amber-100/55 shadow-[0_0_10px_rgba(251,191,36,0.055)]"
          : tone === "emerald"
            ? "border-emerald-300/12 bg-emerald-400/[0.07] text-emerald-100/55 shadow-[0_0_10px_rgba(110,231,183,0.055)]"
            : tone === "red"
              ? "border-red-300/12 bg-red-400/[0.075] text-red-100/58 shadow-[0_0_10px_rgba(248,113,113,0.06)]"
              : "border-white/7 bg-black/20 text-white/36"

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 backdrop-blur-sm ${toneClass}`}>
      {children}
    </span>
  )
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
    ? "Transition Active"
    : previewProgramDifferent
      ? "Preview Ready"
      : "Program Stable"

  const commandTone = takeBusy
    ? "red"
    : previewProgramDifferent
      ? "amber"
      : "emerald"

  return (
    <div className="relative overflow-hidden border-b border-white/7 bg-black/14 px-4 py-1.5 md:px-5 xl:px-6 2xl:px-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/9 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.009)_42%,transparent_64%)] animate-[opsSyncDataSweep_16s_ease-in-out_infinite]" />
      <div
        className={`pointer-events-none absolute inset-x-10 bottom-0 h-px transition-opacity duration-700 ${
          isLive
            ? "bg-gradient-to-r from-transparent via-red-200/22 to-transparent opacity-80"
            : "bg-gradient-to-r from-transparent via-sky-200/14 to-transparent opacity-55"
        }`}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-2 overflow-hidden rounded-[20px] border border-white/7 bg-black/18 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_12px_36px_rgba(0,0,0,0.16)] backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.014)_0px,rgba(255,255,255,0.014)_1px,transparent_1px,transparent_22px)] opacity-[0.07]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-20 animate-[opsSyncRailSweep_14s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/3 to-transparent" />
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/36">
          <SyncPill tone="violet">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-violet-300/75 shadow-[0_0_6px_rgba(167,139,250,0.32)]" />
            Control Bar
          </SyncPill>
          <SyncPill tone={commandTone as "amber" | "emerald" | "red"}>
            {commandState}
          </SyncPill>
          <span className="hidden xl:inline-flex">
            <SyncPill>Updated: {formatTransportTimestamp(lastTransportActionAt)}</SyncPill>
          </span>
          <span className="hidden lg:inline-flex">
            <SyncPill tone="sky">
              {selectedSceneLabel ? `Scene: ${selectedSceneLabel}` : "Scene Standby"}
            </SyncPill>
          </span>
          {hotkeySceneLabel ? (
            <span className="hidden xl:inline-flex">
              <SyncPill tone="violet">Quick Recall: {hotkeySceneLabel}</SyncPill>
            </span>
          ) : null}
          <span className="hidden xl:inline-flex">
            <SyncPill tone="amber">
              {programSlideLabel ? `Slides: ${programSlideLabel}` : "Slides Standby"}
            </SyncPill>
          </span>
        </div>

        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/34">
          <span className="hidden lg:inline-flex">
            <SyncPill tone="sky">
              Layout: {layout === "screen_speaker" ? "Speaker + Screen" : layout === "grid" ? "Grid" : "Solo"}
            </SyncPill>
          </span>
          <SyncPill tone="emerald">{onStageCount} On Stage</SyncPill>
          <span className="hidden 2xl:inline-flex">
            <SyncPill>{previewBlockCount} Preview / {programBlockCount} Program Assets</SyncPill>
          </span>
          <span className="hidden 2xl:inline-flex">
            <SyncPill>{participantCount} Connected</SyncPill>
          </span>
          <span className="hidden 2xl:inline-flex">
            <SyncPill tone={hasScreenShare ? "emerald" : "neutral"}>
              {hasScreenShare ? "Screen Share: Active" : "Screen Share: Idle"}
            </SyncPill>
          </span>
          <span className="hidden 2xl:inline-flex">
            <SyncPill tone={hasProgramSource ? "emerald" : "neutral"}>
              {hasProgramSource ? "Program Feed: Stable" : "Program Feed: Waiting"}
            </SyncPill>
          </span>
          <span className="hidden 2xl:inline-flex">
            <SyncPill tone={isLive ? "red" : "neutral"}>
              {isLive ? "Audience: Live" : "Audience: Holding"}
            </SyncPill>
          </span>
          <span className="hidden 2xl:inline-flex">
            <SyncPill tone={lastTakeMode ? "red" : "neutral"}>{lastTakeMode ? `Transition: ${lastTakeMode}` : "Transition Ready"}</SyncPill>
          </span>
        </div>
      </div>
      <style jsx global>{`
        @keyframes opsSyncDataSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          46% {
            opacity: 0.24;
          }

          100% {
            transform: translateX(18%);
          }
        }

        @keyframes opsSyncRailSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-120%);
          }

          38% {
            opacity: 0.26;
          }

          100% {
            transform: translateX(820%);
          }
        }
      `}</style>
    </div>
  )
}