"use client"

import { useMemo } from "react"
import { useTracks, VideoTrack } from "@livekit/components-react"
import { Track } from "livekit-client"
import { isTrackReference } from "@livekit/components-core"
import type { TrackReference } from "@livekit/components-core"

type ScreenLayoutPreset = "classic" | "brand" | "speaker_focus" | "fullscreen"

function MonitorBadge({
  label,
  tone = "neutral",
}: {
  label: string
  tone?: "neutral" | "live" | "preview" | "confidence"
}) {
  const toneClass =
    tone === "live"
      ? "border-red-300/22 bg-red-400/14 text-red-100"
      : tone === "preview"
        ? "border-sky-300/22 bg-sky-400/14 text-sky-100"
        : tone === "confidence"
          ? "border-violet-300/22 bg-violet-400/14 text-violet-100"
          : "border-white/10 bg-black/40 text-white/72"

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] backdrop-blur-md shadow-[0_0_18px_rgba(0,0,0,0.18)] ${toneClass}`}
    >
      {label}
    </span>
  )
}

function RoutedMonitorFrame({
  children,
  mode = "program",
}: {
  children: React.ReactNode
  mode?: "program" | "preview" | "confidence"
}) {
  const ringClass =
    mode === "program"
      ? "ring-red-400/40"
      : mode === "preview"
        ? "ring-sky-400/40"
        : "ring-violet-400/40"

  const glowClass =
    mode === "program"
      ? "from-red-400/18 via-red-300/5"
      : mode === "preview"
        ? "from-sky-400/18 via-sky-300/5"
        : "from-violet-400/18 via-violet-300/5"

  const pulseClass =
    mode === "program"
      ? "shadow-red-500/22"
      : mode === "preview"
        ? "shadow-sky-500/18"
        : "shadow-violet-500/18"

  const edgePulseClass =
    mode === "program"
      ? "border-red-300/24 shadow-[0_0_42px_rgba(248,113,113,0.16)]"
      : mode === "preview"
        ? "border-sky-300/20 shadow-[0_0_36px_rgba(56,189,248,0.12)]"
        : "border-violet-300/20 shadow-[0_0_36px_rgba(167,139,250,0.12)]"

  return (
    <div
      className={`group relative overflow-hidden rounded-[28px] border border-white/12 bg-[#020308] shadow-[0_34px_140px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.055),inset_0_-28px_60px_rgba(0,0,0,0.72)] ring-1 ${ringClass} ${pulseClass}`}
    >
      <div className={`pointer-events-none absolute inset-0 z-10 rounded-[28px] border opacity-70 ${edgePulseClass} ${mode === "program" ? "animate-pulse" : ""}`} />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${glowClass} to-transparent`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.075),transparent_34%),radial-gradient(circle_at_50%_105%,rgba(0,0,0,0.78),transparent_44%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.12),transparent_18%,transparent_56%,rgba(255,255,255,0.045)_72%,transparent_88%)] opacity-45 mix-blend-screen" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_5px)] opacity-[0.18]" />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035),inset_0_0_42px_rgba(255,255,255,0.035)]" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2">
        <MonitorBadge
          label={
            mode === "program"
              ? "Program"
              : mode === "preview"
                ? "Preview"
                : "Confidence"
          }
          tone={
            mode === "program"
              ? "live"
              : mode === "preview"
                ? "preview"
                : "confidence"
          }
        />
        <MonitorBadge label="Routed" />
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/42 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/45 backdrop-blur-md">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/45" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300/85 shadow-[0_0_10px_rgba(110,231,183,0.7)]" />
        </span>
        Signal
      </div>

      {children}
      <div className="pointer-events-none absolute inset-0 z-10 rounded-[28px] ring-1 ring-inset ring-white/6" />
      <div className="pointer-events-none absolute inset-x-6 bottom-0 z-10 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
    </div>
  )
}

function EmptyMonitorState({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,#050816,#02040b)] shadow-[0_30px_120px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_24%,transparent_68%,rgba(255,255,255,0.035)_82%,transparent_100%)] opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_1px,transparent_1px,transparent_6px)] opacity-[0.18]" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/40 shadow-[0_0_40px_rgba(56,189,248,0.12)] backdrop-blur-md">
          <div className="h-3 w-3 rounded-full bg-red-400/80 shadow-[0_0_18px_rgba(248,113,113,0.7)]" />
        </div>

        <div className="text-sm font-black uppercase tracking-[0.28em] text-white/82">
          {title}
        </div>

        <div className="mt-2 max-w-sm text-xs tracking-[0.14em] text-white/38">
          {subtitle}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white/42 backdrop-blur-md">
        No Signal
      </div>
    </div>
  )
}

function CompactEmptySignal({ label }: { label: string }) {
  return (
    <div className="relative flex aspect-video min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(248,113,113,0.10),transparent_34%),linear-gradient(180deg,#05070f,#020308)] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.018)_0px,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_6px)] opacity-40" />
      <div className="relative z-10 flex flex-col items-center gap-2 px-4">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400/80 shadow-[0_0_16px_rgba(248,113,113,0.72)]" />
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/46">
          {label}
        </div>
      </div>
    </div>
  )
}

export type StageState = {
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

export default function StageVideoPreview({
  stageState,
  participantIds,
  screenLayoutPreset = "classic",
}: {
  stageState: StageState | null
  participantIds: string[]
  screenLayoutPreset?: ScreenLayoutPreset
}) {
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }])
  const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }])

  const stageIdSet = useMemo(() => new Set(participantIds), [participantIds])

  const onStageCameraTracks = useMemo<TrackReference[]>(() => {
    return cameraTracks.filter(
      (trackRef): trackRef is TrackReference =>
        isTrackReference(trackRef) && stageIdSet.has(trackRef.participant.identity)
    )
  }, [cameraTracks, stageIdSet])

  const onStageScreenTracks = useMemo<TrackReference[]>(() => {
    return screenTracks.filter(
      (trackRef): trackRef is TrackReference =>
        isTrackReference(trackRef) && stageIdSet.has(trackRef.participant.identity)
    )
  }, [screenTracks, stageIdSet])

  function pickPrimaryCamera() {
    if (!stageState || onStageCameraTracks.length === 0) return null

    if (stageState.pinned_participant_id) {
      const pinned = onStageCameraTracks.find(
        (t) => t.participant.identity === stageState.pinned_participant_id
      )
      if (pinned) return pinned
    }

    if (stageState.primary_participant_id) {
      const primary = onStageCameraTracks.find(
        (t) => t.participant.identity === stageState.primary_participant_id
      )
      if (primary) return primary
    }

    const firstOrdered = stageState.stage_participant_ids
      .map((id) => onStageCameraTracks.find((t) => t.participant.identity === id) || null)
      .find(Boolean)

    return firstOrdered || onStageCameraTracks[0] || null
  }

  function pickScreenTrack() {
    if (!stageState || onStageScreenTracks.length === 0) return null

    if (stageState.screen_share_track_id) {
      const exact = onStageScreenTracks.find(
        (t) => t.publication.trackSid === stageState.screen_share_track_id
      )
      if (exact) return exact
    }

    if (stageState.screen_share_participant_id) {
      const byParticipant = onStageScreenTracks.find(
        (t) => t.participant.identity === stageState.screen_share_participant_id
      )
      if (byParticipant) return byParticipant
    }

    return onStageScreenTracks[0] || null
  }

  function pickSpeakerForScreenLayout() {
    if (!stageState || onStageCameraTracks.length === 0) return null

    if (stageState.pinned_participant_id) {
      const pinned = onStageCameraTracks.find(
        (t) => t.participant.identity === stageState.pinned_participant_id
      )
      if (pinned) return pinned
    }

    if (stageState.primary_participant_id) {
      const primary = onStageCameraTracks.find(
        (t) => t.participant.identity === stageState.primary_participant_id
      )
      if (primary) return primary
    }

    if (stageState.screen_share_participant_id) {
      const sharer = onStageCameraTracks.find(
        (t) => t.participant.identity === stageState.screen_share_participant_id
      )
      if (sharer) return sharer
    }

    return onStageCameraTracks[0] || null
  }

  if (!stageState || participantIds.length === 0) {
    return (
      <EmptyMonitorState
        title="Stage Offline"
        subtitle="No routed participants currently assigned to the live stage"
      />
    )
  }

  if (stageState.layout === "solo") {
    const primary = pickPrimaryCamera()

    if (!primary) {
      return (
        <EmptyMonitorState
          title="No Camera Signal"
          subtitle="No active camera feeds are currently routed to the stage"
        />
      )
    }

    const isPrimary = stageState.primary_participant_id === primary.participant.identity
    const isPinned = stageState.pinned_participant_id === primary.participant.identity

    return (
      <RoutedMonitorFrame mode={isPrimary ? "program" : "preview"}>
        <VideoTrack trackRef={primary} className="aspect-video h-full w-full object-cover" />
      </RoutedMonitorFrame>
    )
  }

  if (stageState.layout === "screen_speaker") {
    const screenTrack = pickScreenTrack()
    const speakerTrack = pickSpeakerForScreenLayout()

    if (!screenTrack && !speakerTrack) {
      return (
        <EmptyMonitorState
          title="No Presentation Feed"
          subtitle="No screen share or speaker feed is currently available"
        />
      )
    }

    if (!screenTrack && speakerTrack) {
      const isPrimary = stageState.primary_participant_id === speakerTrack.participant.identity
      const isPinned = stageState.pinned_participant_id === speakerTrack.participant.identity

      return (
        <RoutedMonitorFrame mode={isPrimary ? "program" : "preview"}>
          <VideoTrack trackRef={speakerTrack} className="aspect-video h-full w-full object-cover" />
        </RoutedMonitorFrame>
      )
    }

    const speakerIsPrimary =
      speakerTrack && stageState.primary_participant_id === speakerTrack.participant.identity
    const speakerIsPinned =
      speakerTrack && stageState.pinned_participant_id === speakerTrack.participant.identity

    const speakerBadges = speakerTrack ? (
      <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
        {speakerIsPrimary ? (
          <span className="rounded bg-sky-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
            PRIMARY
          </span>
        ) : null}

        {speakerIsPinned ? (
          <span className="rounded bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-slate-950">
            PINNED
          </span>
        ) : null}
      </div>
    ) : null

    if (screenLayoutPreset === "fullscreen") {
      return (
        <RoutedMonitorFrame mode="program">
          {screenTrack ? (
            <VideoTrack
              trackRef={screenTrack}
              className="aspect-video h-full min-h-[420px] w-full object-contain"
            />
          ) : (
            <CompactEmptySignal label="No screen share" />
          )}

          <div className="pointer-events-none absolute left-3 top-14 z-20">
            <span className="rounded-full border border-white/12 bg-white/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.16)]">
              Fullscreen Screen
            </span>
          </div>
        </RoutedMonitorFrame>
      )
    }

    if (screenLayoutPreset === "brand") {
      return (
        <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-sky-300/15 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.24),transparent_30%),radial-gradient(circle_at_82%_70%,rgba(168,85,247,0.20),transparent_32%),linear-gradient(135deg,#020617,#0f172a_48%,#111827)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_38%,rgba(255,255,255,0.035))]" />
          <div className="pointer-events-none absolute left-6 top-5 rounded-full border border-sky-300/25 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-sky-100/80 backdrop-blur">
            Jupiter Stage
          </div>

          <div className="relative w-[86%] overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-[0_30px_100px_rgba(56,189,248,0.22)]">
            {screenTrack ? (
              <VideoTrack
                trackRef={screenTrack}
                className="aspect-video h-full w-full object-contain"
              />
            ) : (
              <CompactEmptySignal label="No screen share" />
            )}
          </div>

          {speakerTrack ? (
            <div className="absolute bottom-5 right-5 w-52 max-w-[28%] overflow-hidden rounded-2xl border border-sky-200/20 bg-black shadow-[0_20px_70px_rgba(56,189,248,0.18)]">
              <VideoTrack
                trackRef={speakerTrack}
                className="aspect-video w-full object-cover"
              />
              <div className="border-t border-white/10 bg-black/80 px-3 py-2 text-xs text-white/80">
                {speakerTrack.participant.name || speakerTrack.participant.identity}
              </div>
              {speakerBadges}
            </div>
          ) : null}
        </div>
      )
    }

    if (screenLayoutPreset === "speaker_focus") {
      return (
        <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-black p-5">
          {screenTrack ? (
            <div className="absolute right-5 top-7 w-[54%] overflow-hidden rounded-[24px] border border-white/10 bg-black opacity-80 shadow-2xl">
              <VideoTrack
                trackRef={screenTrack}
                className="aspect-video h-full w-full object-contain"
              />
              <div className="pointer-events-none absolute left-3 top-3">
                <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  SCREEN
                </span>
              </div>
            </div>
          ) : null}

          {speakerTrack ? (
            <div className="absolute bottom-5 left-5 w-[46%] max-w-[460px] overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
              <VideoTrack
                trackRef={speakerTrack}
                className="aspect-video w-full object-cover"
              />
              <div className="border-t border-white/10 bg-black/80 px-3 py-2 text-xs text-white/80">
                {speakerTrack.participant.name || speakerTrack.participant.identity}
              </div>
              {speakerBadges}
            </div>
          ) : (
            <EmptyMonitorState
              title="No Speaker Camera"
              subtitle="The speaker focus layout is waiting for an active camera feed"
            />
          )}
        </div>
      )
    }

    return (
      <div className="grid min-h-[420px] gap-4 lg:grid-cols-[1.45fr_0.55fr]">
        <RoutedMonitorFrame mode="program">
          {screenTrack ? (
            <VideoTrack trackRef={screenTrack} className="aspect-video h-full w-full object-contain" />
          ) : (
            <CompactEmptySignal label="No screen share" />
          )}
          <div className="pointer-events-none absolute left-3 top-3">
            <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
              SCREEN
            </span>
          </div>
        </RoutedMonitorFrame>

        <RoutedMonitorFrame
          mode={speakerIsPrimary ? "program" : "confidence"}
        >
          {speakerTrack ? (
            <VideoTrack trackRef={speakerTrack} className="aspect-video h-full w-full object-cover" />
          ) : (
            <CompactEmptySignal label="No speaker camera" />
          )}
          {speakerBadges}
        </RoutedMonitorFrame>
      </div>
    )
  }

  if (onStageCameraTracks.length === 0) {
    return (
      <EmptyMonitorState
        title="No Active Cameras"
        subtitle="No participant camera feeds are currently routed to this monitor"
      />
    )
  }

  return (
    <div
      className={`grid min-h-[420px] gap-4 ${
        onStageCameraTracks.length === 1
          ? "grid-cols-1"
          : onStageCameraTracks.length === 2
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2"
      }`}
    >
      {onStageCameraTracks.map((trackRef) => {
        const isPrimary = stageState.primary_participant_id === trackRef.participant.identity
        const isPinned = stageState.pinned_participant_id === trackRef.participant.identity

        return (
          <RoutedMonitorFrame
            key={trackRef.participant.identity}
            mode={isPrimary ? "program" : isPinned ? "confidence" : "preview"}
          >
            <VideoTrack trackRef={trackRef} className="aspect-video h-full w-full object-cover" />
            <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
              {isPrimary ? (
                <span className="rounded bg-sky-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  PRIMARY
                </span>
              ) : null}

              {isPinned ? (
                <span className="rounded bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  PINNED
                </span>
              ) : null}
            </div>
          </RoutedMonitorFrame>
        )
      })}
    </div>
  )
}