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

function SyncPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "neutral" | "violet" | "sky" | "amber" | "emerald" | "red"
}): JSX.Element {
  const toneClass =
    tone === "violet"
      ? "border-violet-300/16 bg-violet-400/10 text-violet-100/62 shadow-[0_0_18px_rgba(167,139,250,0.10)]"
      : tone === "sky"
        ? "border-sky-300/16 bg-sky-400/10 text-sky-100/62 shadow-[0_0_18px_rgba(56,189,248,0.10)]"
        : tone === "amber"
          ? "border-amber-300/16 bg-amber-400/10 text-amber-100/62 shadow-[0_0_18px_rgba(251,191,36,0.10)]"
          : tone === "emerald"
            ? "border-emerald-300/16 bg-emerald-400/10 text-emerald-100/62 shadow-[0_0_18px_rgba(110,231,183,0.10)]"
            : tone === "red"
              ? "border-red-300/16 bg-red-400/10 text-red-100/62 shadow-[0_0_18px_rgba(248,113,113,0.10)]"
              : "border-white/8 bg-black/24 text-white/42"

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 backdrop-blur-md ${toneClass}`}>
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
    ? "Transport Locked"
    : previewProgramDifferent
      ? "Preview Armed"
      : "Program Synced"

  const commandTone = takeBusy
    ? "red"
    : previewProgramDifferent
      ? "amber"
      : "emerald"

  return (
    <div className="relative overflow-hidden border-b border-white/8 bg-black/18 px-4 py-2 md:px-5 xl:px-6 2xl:px-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.026)_42%,transparent_64%)] animate-[opsSyncDataSweep_7.5s_ease-in-out_infinite]" />
      <div
        className={`pointer-events-none absolute inset-x-10 bottom-0 h-px transition-opacity duration-700 ${
          isLive
            ? "bg-gradient-to-r from-transparent via-red-200/34 to-transparent opacity-100"
            : "bg-gradient-to-r from-transparent via-sky-200/22 to-transparent opacity-70"
        }`}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-2 overflow-hidden rounded-[22px] border border-white/8 bg-black/24 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_18px_60px_rgba(0,0,0,0.20)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.018)_0px,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_18px)] opacity-[0.16]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 animate-[opsSyncRailSweep_5.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/36">
          <SyncPill tone="violet">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(167,139,250,0.55)]" />
            Ops Sync
          </SyncPill>
          <SyncPill tone={commandTone as "amber" | "emerald" | "red"}>
            {commandState}
          </SyncPill>
          <SyncPill>Command: {formatTransportTimestamp(lastTransportActionAt)}</SyncPill>
          <SyncPill tone="sky">
            {selectedSceneLabel ? `Scene: ${selectedSceneLabel}` : "Scene Memory Idle"}
          </SyncPill>
          {hotkeySceneLabel ? (
            <SyncPill tone="violet">Hotkey Recall: {hotkeySceneLabel}</SyncPill>
          ) : null}
          <SyncPill tone="amber">
            {programSlideLabel ? `Deck: ${programSlideLabel}` : "Deck Standby"}
          </SyncPill>
        </div>

        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/34">
          <SyncPill tone="sky">
            Layout: {layout === "screen_speaker" ? "Speaker + Screen" : layout === "grid" ? "Grid" : "Solo"}
          </SyncPill>
          <SyncPill tone="emerald">{onStageCount} Talent Routed</SyncPill>
          <span className="hidden xl:inline-flex">
            <SyncPill>{previewBlockCount} Preview / {programBlockCount} Program Assets</SyncPill>
          </span>
          <span className="hidden 2xl:inline-flex">
            <SyncPill>{participantCount} Viewers</SyncPill>
          </span>
          <span className="hidden 2xl:inline-flex">
            <SyncPill tone={hasScreenShare ? "emerald" : "neutral"}>
              {hasScreenShare ? "Screen Route: Active" : "Screen Route: Idle"}
            </SyncPill>
          </span>
          <span className="hidden 2xl:inline-flex">
            <SyncPill tone={hasProgramSource ? "emerald" : "neutral"}>
              {hasProgramSource ? "Return: Clean" : "Return: No Source"}
            </SyncPill>
          </span>
          <span className="hidden 2xl:inline-flex">
            <SyncPill tone={isLive ? "red" : "neutral"}>
              {isLive ? "Audience Route: Live" : "Audience Route: Holding"}
            </SyncPill>
          </span>
          <span className="hidden 2xl:inline-flex">
            <SyncPill tone="red">{lastTakeMode ? `Last: ${lastTakeMode}` : "Take Standby"}</SyncPill>
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
            opacity: 0.75;
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
            opacity: 0.85;
          }

          100% {
            transform: translateX(820%);
          }
        }
      `}</style>
    </div>
  )
}