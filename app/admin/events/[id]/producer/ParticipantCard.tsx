"use client"

import { useMemo } from "react"
import type { JSX } from "react"
import { useParticipants } from "@livekit/components-react"
import {
  BadgeCheck,
  Camera,
  Headphones,
  MonitorUp,
  Pin,
  Radio,
  ShieldCheck,
  Signal,
  Star,
  UserRound,
  Volume2,
} from "lucide-react"

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

function compactIdentity(value: string) {
  return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/28 bg-sky-400/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.08)]">
        <Star size={10} className="text-sky-200" />
        Primary
      </span>
    )
  }

  if (isPinned) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/28 bg-amber-400/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.08)]">
        <Pin size={10} className="text-amber-200" />
        Pinned
      </span>
    )
  }

  if (isOnStage) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300/28 bg-red-400/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-red-100 shadow-[0_0_12px_rgba(239,68,68,0.08)]">
        <Radio size={10} className="text-red-200" />
        On Stage
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/46">
      <UserRound size={10} className="text-white/38" />
      Backstage
    </span>
  )
}

function SourceChip({
  label,
  active,
  icon,
  tone = "neutral",
}: {
  label: string
  active: boolean
  icon: JSX.Element
  tone?: "neutral" | "screen"
}): JSX.Element {
  const activeClass =
    tone === "screen"
      ? "border-violet-300/26 bg-violet-400/12 text-violet-200"
      : "border-emerald-300/26 bg-emerald-400/12 text-emerald-200"

  const inactiveClass = "border-white/10 bg-black/28 text-white/38"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
        active ? activeClass : inactiveClass
      }`}
    >
      <span className={active ? "opacity-90" : "opacity-45"}>{icon}</span>
      {label} {active ? "Ready" : "Off"}
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
    <div className="flex h-2.5 w-14 items-center gap-0.5 rounded-full border border-white/8 bg-black/35 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      {Array.from({ length: 10 }).map((_, index) => (
        <span
          key={`${identity}-meter-${index}`}
          className={`h-1.5 flex-1 rounded-full ${
            index < activeBars
              ? "bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.5)]"
              : "bg-white/10"
          }`}
        />
      ))}
    </div>
  )
}

function TalentTelemetryRow({
  micEnabled,
  cameraEnabled,
  screenShareEnabled,
  isOnStage,
}: {
  micEnabled: boolean
  cameraEnabled: boolean
  screenShareEnabled: boolean
  isOnStage: boolean
}): JSX.Element {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      <div className="rounded-2xl border border-white/10 bg-black/22 px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
          Mic
        </div>
        <div className={`mt-1 text-[10px] font-black uppercase ${micEnabled ? "text-emerald-100/72" : "text-white/34"}`}>
          {micEnabled ? "Ready" : "Muted"}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/22 px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
          Cam
        </div>
        <div className={`mt-1 text-[10px] font-black uppercase ${cameraEnabled ? "text-sky-100/72" : "text-white/34"}`}>
          {cameraEnabled ? "Live" : "Off"}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/22 px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
          Screen
        </div>
        <div className={`mt-1 text-[10px] font-black uppercase ${screenShareEnabled ? "text-violet-100/72" : "text-white/34"}`}>
          {screenShareEnabled ? "Ready" : "Idle"}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/22 px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
          Stage
        </div>
        <div className={`mt-1 text-[10px] font-black uppercase ${isOnStage ? "text-red-100/72" : "text-white/34"}`}>
          {isOnStage ? "Live" : "Ready"}
        </div>
      </div>
    </div>
  )
}

function TalentReadinessStrip({
  isOnStage,
  isPrimary,
  isPinned,
  micEnabled,
  cameraEnabled,
}: {
  isOnStage: boolean
  isPrimary: boolean
  isPinned: boolean
  micEnabled: boolean
  cameraEnabled: boolean
}): JSX.Element {
  const ready = micEnabled && cameraEnabled
  const routeLabel = isPrimary
    ? "Primary"
    : isPinned
      ? "Pinned"
      : isOnStage
        ? "On Stage"
        : "Backstage"

  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-black/20 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/38">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            ready
              ? "bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.5)]"
              : "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.38)]"
          }`}
        />
        {ready ? "Ready" : "Check Inputs"}
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
        <BadgeCheck size={9} className={ready ? "text-emerald-200/60" : "text-amber-200/60"} />
        {routeLabel}
      </div>
    </div>
  )
}

function TalentConfidenceReturn({
  isOnStage,
  isPrimary,
}: {
  isOnStage: boolean
  isPrimary: boolean
}): JSX.Element {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3 rounded-[20px] border px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        isPrimary
          ? "border-sky-300/18 bg-sky-400/8 text-sky-100/62"
          : isOnStage
            ? "border-red-300/16 bg-red-400/8 text-red-100/58"
            : "border-white/8 bg-black/18 text-white/38",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em]">
        <Headphones size={11} />
        Return Feed
      </div>

      <div className="rounded-full border border-white/10 bg-black/24 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/42">
        {isPrimary ? "Primary" : isOnStage ? "Stage" : "Standby"}
      </div>
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
      className={`group cursor-pointer rounded-[24px] border p-3 shadow-[0_18px_55px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 active:translate-y-0 ${
        isPrimary
          ? "border-sky-300/45 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_36%),rgba(56,189,248,0.08)] shadow-[0_0_0_1px_rgba(125,211,252,0.06),0_22px_60px_rgba(56,189,248,0.055)]"
          : isPinned
            ? "border-amber-300/36 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.10),transparent_36%),rgba(251,191,36,0.045)]"
            : isOnStage
              ? "border-red-300/24 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.09),transparent_36%),rgba(239,68,68,0.045)] shadow-[0_0_24px_rgba(239,68,68,0.055)]"
              : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.014))] hover:border-white/16 hover:bg-white/[0.04]"
      }`}
    >
      <div className="space-y-2.5">
        <TalentReadinessStrip
          isOnStage={isOnStage}
          isPrimary={isPrimary}
          isPinned={isPinned}
          micEnabled={participant.micEnabled}
          cameraEnabled={participant.cameraEnabled}
        />
        <TalentConfidenceReturn
          isOnStage={isOnStage}
          isPrimary={isPrimary}
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${
                  participant.micEnabled
                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 shadow-[0_0_10px_rgba(52,211,153,0.08)]"
                    : "border-white/10 bg-black/28 text-white/34"
                }`}
              >
                <UserRound size={13} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {participant.name}
                </div>
                <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/28">
                  Contributor
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/8 bg-black/18 px-2 py-1.5">
              <div className="min-w-0 flex-1 truncate text-[10px] font-medium text-white/36">
                {compactIdentity(participant.identity)}
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

        <div className="flex flex-wrap gap-1.5">
          <SourceChip label="Cam" active={participant.cameraEnabled} icon={<Camera size={10} />} />
          <SourceChip label="Mic" active={participant.micEnabled} icon={<Volume2 size={10} />} />
          <SourceChip label="Screen" active={participant.screenShareEnabled} icon={<MonitorUp size={10} />} tone="screen" />
        </div>

        <TalentTelemetryRow
          micEnabled={participant.micEnabled}
          cameraEnabled={participant.cameraEnabled}
          screenShareEnabled={participant.screenShareEnabled}
          isOnStage={isOnStage}
        />

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/45">
          {isUsingScreen ? (
            <span className="rounded-full border border-violet-300/30 bg-violet-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-violet-100 shadow-[0_0_16px_rgba(168,85,247,0.14)]">
              Screen Active
            </span>
          ) : null}

          {participant.joinedAt ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/12 bg-emerald-400/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100/58">
              <ShieldCheck size={10} className="text-emerald-200/60" />
              Connected
            </span>
          ) : null}

          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/12 bg-sky-400/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-sky-100/56">
            <Signal size={10} />
            Signal Stable
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/12 bg-violet-400/8 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-violet-100/56">
            <Headphones size={10} />
            Confidence Ready
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/24 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/42">
            <Radio size={10} />
            Return Ready
          </span>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/32">
              Routing Actions
            </div>

            <div className="rounded-full border border-white/10 bg-black/24 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/38">
              Ready
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                    ? "border-violet-200/50 bg-violet-300 text-black shadow-[0_0_14px_rgba(168,85,247,0.12)]"
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
                      ? "border-sky-200/50 bg-sky-300 text-black shadow-[0_0_14px_rgba(56,189,248,0.12)]"
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
                      ? "border-amber-200/50 bg-amber-300 text-black shadow-[0_0_14px_rgba(251,191,36,0.12)]"
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
                className="rounded-xl border border-emerald-200/70 bg-emerald-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[0_0_14px_rgba(52,211,153,0.11)] transition hover:-translate-y-0.5 hover:bg-emerald-100 active:translate-y-0"
              >
                Cue Talent
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}