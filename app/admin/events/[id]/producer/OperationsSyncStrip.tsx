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
      ? "border-violet-300/10 bg-violet-400/[0.045] text-violet-100/44 shadow-[0_0_8px_rgba(167,139,250,0.032)]"
      : tone === "sky"
        ? "border-sky-300/10 bg-sky-400/[0.045] text-sky-100/44 shadow-[0_0_8px_rgba(56,189,248,0.032)]"
        : tone === "amber"
          ? "border-amber-300/10 bg-amber-400/[0.045] text-amber-100/44 shadow-[0_0_8px_rgba(251,191,36,0.03)]"
          : tone === "emerald"
            ? "border-emerald-300/10 bg-emerald-400/[0.045] text-emerald-100/44 shadow-[0_0_8px_rgba(110,231,183,0.03)]"
            : tone === "red"
              ? "border-red-300/10 bg-red-400/[0.05] text-red-100/48 shadow-[0_0_8px_rgba(248,113,113,0.035)]"
              : "border-white/[0.05] bg-white/[0.022] text-white/28"

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 backdrop-blur-sm ${toneClass}`}>
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
  lastTransportActionAt: number | null
  isLive: boolean
  layout: StageState["layout"] | null | undefined
}): JSX.Element {
  void formatTransportTimestamp
  void programSlideLabel
  void participantCount
  void previewBlockCount
  void programBlockCount
  void lastTransportActionAt
  void layout

  const commandState = takeBusy
    ? "Taking"
    : previewProgramDifferent
      ? "Preview Armed"
      : "Stable"

  const commandTone = takeBusy
    ? "red"
    : previewProgramDifferent
      ? "amber"
      : "emerald"

  return (
    <div className="relative overflow-hidden border-b border-white/[0.05] bg-[linear-gradient(180deg,rgba(0,0,0,0.10),rgba(0,0,0,0.03))] px-4 py-1 md:px-5 xl:px-6 2xl:px-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.004)_42%,transparent_64%)] animate-[opsSyncDataSweep_28s_ease-in-out_infinite]" />
      <div
        className={`pointer-events-none absolute inset-x-10 bottom-0 h-px transition-opacity duration-700 ${
          isLive
            ? "bg-gradient-to-r from-transparent via-red-200/12 to-transparent opacity-48"
            : "bg-gradient-to-r from-transparent via-sky-200/10 to-transparent opacity-34"
        }`}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-1.5 overflow-hidden rounded-[18px] border border-white/[0.05] bg-white/[0.02] px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.01)_0px,rgba(255,255,255,0.01)_1px,transparent_1px,transparent_28px)] opacity-[0.04]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 animate-[opsSyncRailSweep_24s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.018] to-transparent" />
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-white/26">
          <SyncPill tone={commandTone as "amber" | "emerald" | "red"}>
            {commandState}
          </SyncPill>
          <span className="hidden lg:inline-flex">
            <SyncPill tone="sky">
              {selectedSceneLabel ? `Scene · ${selectedSceneLabel}` : "Scene Idle"}
            </SyncPill>
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-white/24">
          {hasScreenShare ? (
            <span className="hidden xl:inline-flex">
              <SyncPill tone="emerald">Screen Active</SyncPill>
            </span>
          ) : null}
          {!hasProgramSource ? (
            <span className="hidden xl:inline-flex">
              <SyncPill tone="amber">Program Waiting</SyncPill>
            </span>
          ) : null}
          {isLive ? (
            <span className="hidden xl:inline-flex">
              <SyncPill tone="red">Audience Live</SyncPill>
            </span>
          ) : null}
          <SyncPill tone="emerald">Stage · {onStageCount}</SyncPill>
          <span className="hidden 2xl:inline-flex">
            {lastTakeMode ? (
              <SyncPill tone="red">{lastTakeMode}</SyncPill>
            ) : null}
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
            opacity: 0.08;
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
            opacity: 0.09;
          }

          100% {
            transform: translateX(620%);
          }
        }
      `}</style>
    </div>
  )
}