"use client"

import type { JSX } from "react"

type ProducerParticipant = {
  identity: string
  name: string
  joinedAt: string | null
  state: string | number | null
  isPublisher: boolean
  metadata?: Record<string, unknown>
  cameraEnabled: boolean
  micEnabled: boolean
  screenShareEnabled: boolean
  tracks: Array<{
    sid: string
    name: string
    source: string | number
    muted?: boolean
  }>
}

function ParticipantStatusPill({
  isOnStage,
  isPrimary,
  isPinned,
}: {
  isOnStage: boolean
  isPrimary: boolean
  isPinned: boolean
}): JSX.Element {
  if (isPrimary) {
    return (
      <span className="rounded-full border border-sky-300/30 bg-sky-400/15 px-2.5 py-1 text-[11px] font-semibold text-sky-200">
        Primary
      </span>
    )
  }

  if (isPinned) {
    return (
      <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
        Pinned
      </span>
    )
  }

  if (isOnStage) {
    return (
      <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
        On Stage
      </span>
    )
  }

  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/60">
      Backstage
    </span>
  )
}

function SourceChip({
  label,
  active,
  tone = "neutral",
}: {
  label: string
  active: boolean
  tone?: "neutral" | "screen"
}): JSX.Element {
  const activeClass =
    tone === "screen"
      ? "border-violet-300/30 bg-violet-400/15 text-violet-200"
      : "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"

  const inactiveClass = "border-white/10 bg-white/5 text-white/45"

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        active ? activeClass : inactiveClass
      }`}
    >
      {label} {active ? "On" : "Off"}
    </span>
  )
}

export default function ParticipantCard({
  participant,
  isOnStage,
  isPrimary,
  isPinned,
  isUsingScreen,
  screenTrackSid,
  onAddToStage,
  onSetScreenShare,
  onClearPrimary,
  onSetPrimary,
  onUnpin,
  onPin,
  onRemoveFromStage,
  onError,
}: {
  participant: ProducerParticipant
  isOnStage: boolean
  isPrimary: boolean
  isPinned: boolean
  isUsingScreen: boolean
  screenTrackSid: string | null
  onAddToStage: (identity: string) => void
  onSetScreenShare: (participantId: string, trackId: string) => void
  onClearPrimary: () => void
  onSetPrimary: (identity: string) => void
  onUnpin: () => void
  onPin: (identity: string) => void
  onRemoveFromStage: (identity: string) => void
  onError: (message: string) => void
}): JSX.Element {
  return (
    <div
      onClick={() => {
        if (!isOnStage) {
          onAddToStage(participant.identity)
        }
      }}
      className={`group cursor-pointer rounded-[22px] border p-4 transition ${
        isPrimary
          ? "border-sky-300/50 bg-sky-400/10 shadow-[0_0_0_1px_rgba(125,211,252,0.08)]"
          : isPinned
            ? "border-amber-300/40 bg-amber-400/5"
            : isOnStage
              ? "border-emerald-300/20 bg-emerald-400/[0.05]"
              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
  <span
    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
      participant.micEnabled
        ? "animate-pulse bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]"
        : "bg-white/20"
    }`}
  />
  <div className="truncate text-base font-semibold text-white">
    {participant.name}
  </div>
</div>
            <div className="mt-1 truncate text-xs text-white/40">{participant.identity}</div>
          </div>

          <div className="shrink-0">
            <ParticipantStatusPill
              isOnStage={isOnStage}
              isPrimary={isPrimary}
              isPinned={isPinned}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <SourceChip label="Camera" active={participant.cameraEnabled} />
          <SourceChip label="Mic" active={participant.micEnabled} />
          <SourceChip label="Screen" active={participant.screenShareEnabled} tone="screen" />
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-white/45">
          {isUsingScreen ? (
            <span className="rounded-full border border-violet-300/30 bg-violet-400/15 px-2.5 py-1 font-medium text-violet-200">
              Screen selected for program
            </span>
          ) : null}

          {participant.joinedAt ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              Joined
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {participant.screenShareEnabled ? (
            <button
              onClick={() => {
                if (!screenTrackSid) {
                  onError("No screen-share track found for this participant")
                  return
                }

                onSetScreenShare(participant.identity, screenTrackSid)
              }}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                isUsingScreen
                  ? "bg-violet-300 text-slate-950"
                  : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {isUsingScreen ? "Screen Active" : "Use Screen"}
            </button>
          ) : null}

          {isOnStage ? (
            <>
              <button
                onClick={() => {
                  if (isPrimary) {
                    onClearPrimary()
                    return
                  }

                  onSetPrimary(participant.identity)
                }}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  isPrimary
                    ? "bg-sky-300 text-slate-950"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {isPrimary ? "Clear Primary" : "Make Primary"}
              </button>

              <button
                onClick={() => {
                  if (isPinned) {
                    onUnpin()
                    return
                  }

                  onPin(participant.identity)
                }}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  isPinned
                    ? "bg-amber-300 text-slate-950"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {isPinned ? "Unpin" : "Pin"}
              </button>

              <button
                onClick={() => onRemoveFromStage(participant.identity)}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                Remove
              </button>
            </>
          ) : (
            <button
              onClick={() => onAddToStage(participant.identity)}
              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-white/90"
            >
              Add to Stage
            </button>
          )}
        </div>
      </div>
    </div>
  )
}