"use client"

import { useMemo } from "react"
import type { JSX } from "react"
import { useParticipants } from "@livekit/components-react"

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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/30 bg-sky-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.16)]">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,0.8)]" />
        Primary
      </span>
    )
  }

  if (isPinned) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.16)]">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]" />
        Pinned
      </span>
    )
  }

  if (isOnStage) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.16)]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
        On Stage
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
      <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
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

  const inactiveClass = "border-white/10 bg-black/30 text-white/42"

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
        active ? activeClass : inactiveClass
      }`}
    >
      {label} {active ? "On" : "Off"}
    </span>
  )
}
function ParticipantSpeakingMeter({
  identity,
  micEnabled,
}: {
  identity: string
  micEnabled: boolean
}): JSX.Element {
  const livekitParticipants = useParticipants()

  const participant = useMemo(
    () => livekitParticipants.find((p) => p.identity === identity),
    [livekitParticipants, identity]
  )

  const level = micEnabled ? participant?.audioLevel ?? 0 : 0
  const activeBars = Math.max(0, Math.round(level * 10))

  return (
    <div className="flex h-2.5 w-16 items-center gap-0.5 rounded-full border border-white/8 bg-black/35 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      {Array.from({ length: 10 }).map((_, index) => (
        <span
          key={`${identity}-meter-${index}`}
          className={`h-1.5 flex-1 rounded-full ${
            index < activeBars
              ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]"
              : "bg-white/10"
          }`}
        />
      ))}
    </div>
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
      className={`group cursor-pointer rounded-[26px] border p-3.5 shadow-[0_18px_55px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 active:translate-y-0 ${
        isPrimary
          ? "border-sky-300/45 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_36%),rgba(56,189,248,0.08)] shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_22px_70px_rgba(56,189,248,0.08)]"
          : isPinned
            ? "border-amber-300/36 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_36%),rgba(251,191,36,0.045)]"
            : isOnStage
              ? "border-emerald-300/24 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_36%),rgba(52,211,153,0.045)]"
              : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] hover:border-white/16 hover:bg-white/[0.045]"
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
  <span
    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
      participant.micEnabled
        ? "animate-pulse bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]"
        : "bg-white/12 border border-white/10"
    }`}
  />
  <div className="truncate text-base font-semibold text-white">
    {participant.name}
  </div>
</div>
            <div className="mt-1 flex items-center gap-2">
  <div className="min-w-0 flex-1 truncate text-[11px] font-medium text-white/38">
    {participant.identity}
  </div>
  <ParticipantSpeakingMeter
    identity={participant.identity}
    micEnabled={participant.micEnabled}
  />
</div>
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
            <span className="rounded-full border border-violet-300/30 bg-violet-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-violet-100 shadow-[0_0_16px_rgba(168,85,247,0.14)]">
              Screen selected
            </span>
          ) : null}

          {participant.joinedAt ? (
            <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
              Connected
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-[20px] border border-white/8 bg-black/18 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]" onClick={(e) => e.stopPropagation()}>
          {participant.screenShareEnabled ? (
            <button
              onClick={() => {
                if (!screenTrackSid) {
                  onError("No screen-share track found for this participant")
                  return
                }

                onSetScreenShare(participant.identity, screenTrackSid)
              }}
              className={`rounded-xl border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 active:translate-y-0 ${
                isUsingScreen
                  ? "border-violet-200/50 bg-violet-300 text-black shadow-[0_0_20px_rgba(168,85,247,0.20)]"
                  : "border-white/12 bg-white/[0.045] text-white/70 hover:border-white/20 hover:bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
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
                className={`rounded-xl border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 active:translate-y-0 ${
                  isPrimary
                    ? "border-sky-200/50 bg-sky-300 text-black shadow-[0_0_20px_rgba(56,189,248,0.20)]"
                    : "border-sky-300/18 bg-sky-400/8 text-sky-100/70 hover:border-sky-300/32 hover:bg-sky-400/12"
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
                className={`rounded-xl border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5 active:translate-y-0 ${
                  isPinned
                    ? "border-amber-200/50 bg-amber-300 text-black shadow-[0_0_20px_rgba(251,191,36,0.20)]"
                    : "border-amber-300/18 bg-amber-400/8 text-amber-100/70 hover:border-amber-300/32 hover:bg-amber-400/12"
                }`}
              >
                {isPinned ? "Unpin" : "Pin"}
              </button>

              <button
                onClick={() => onRemoveFromStage(participant.identity)}
                className="rounded-xl border border-red-300/18 bg-red-500/8 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-red-100/70 transition hover:-translate-y-0.5 hover:border-red-300/30 hover:bg-red-500/14 active:translate-y-0"
              >
                Remove
              </button>
            </>
          ) : (
            <button
              onClick={() => onAddToStage(participant.identity)}
              className="rounded-xl border border-emerald-200/70 bg-emerald-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[0_0_22px_rgba(52,211,153,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-100 active:translate-y-0"
            >
              Add to Stage
            </button>
          )}
        </div>
      </div>
    </div>
  )
}