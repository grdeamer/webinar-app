"use client"

import { useMemo, useRef, type JSX } from "react"
import { useTracks, VideoTrack } from "@livekit/components-react"
import { Track } from "livekit-client"
import { isTrackReference } from "@livekit/components-core"
import type { TrackReference } from "@livekit/components-core"
import {
  CompactEmptySignal,
  EmptyMonitorState,
  RoutedMonitorFrame,
  StatusPill,
} from "./monitorChrome"


type ScreenLayoutPreset = "classic" | "brand" | "speaker_focus" | "fullscreen"

type ParticipantAccentId = "none" | "violet" | "cyan" | "green" | "amber" | "rose"
type ParticipantGlowLevel = "low" | "med" | "high"
type ParticipantOutlineWeight = "soft" | "standard" | "bold"

type ParticipantAppearanceOverride = {
  accentId?: ParticipantAccentId
  glowLevel?: ParticipantGlowLevel
  outlineWeight?: ParticipantOutlineWeight
}

type StageIdentityAccentTone = {
  rgb: string
  border: string
  text: string
  badge: string
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

function SignalAtmosphere({
  live,
  tone = "neutral",
}: {
  live: boolean
  tone?: "neutral" | "screen" | "speaker"
}): JSX.Element {
  const glowClass =
    tone === "screen"
      ? "from-sky-300/10 via-sky-300/3"
      : tone === "speaker"
        ? "from-violet-300/9 via-violet-300/3"
        : live
          ? "from-red-300/8 via-red-300/3"
          : "from-white/5 via-white/[0.02]"

  return (
    <>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${glowClass} to-transparent`} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.014)_42%,transparent_64%)] animate-[stageSignalSweep_14s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_8px)]" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </>
  )

}

function getStageIdentityAccentTone(accentId?: string | null): StageIdentityAccentTone {
  switch (accentId) {
    case "violet":
      return {
        rgb: "168,85,247",
        border: "border-violet-300/36",
        text: "text-violet-100/70",
        badge: "border-violet-200/16 bg-violet-400/[0.10] text-violet-100/62",
      }
    case "cyan":
      return {
        rgb: "34,211,238",
        border: "border-cyan-300/36",
        text: "text-cyan-100/70",
        badge: "border-cyan-200/16 bg-cyan-400/[0.10] text-cyan-100/62",
      }
    case "green":
      return {
        rgb: "16,185,129",
        border: "border-emerald-300/36",
        text: "text-emerald-100/70",
        badge: "border-emerald-200/16 bg-emerald-400/[0.10] text-emerald-100/62",
      }
    case "amber":
      return {
        rgb: "251,191,36",
        border: "border-amber-300/36",
        text: "text-amber-100/70",
        badge: "border-amber-200/16 bg-amber-400/[0.10] text-amber-100/62",
      }
    case "rose":
      return {
        rgb: "244,63,94",
        border: "border-rose-300/36",
        text: "text-rose-100/70",
        badge: "border-rose-200/16 bg-rose-400/[0.10] text-rose-100/62",
      }
    default:
      return {
        rgb: "148,163,184",
        border: "border-white/12",
        text: "text-white/52",
        badge: "border-white/10 bg-white/[0.045] text-white/52",
      }
  }
}

function getTrackParticipantLabel(trackRef: TrackReference): string {
  return trackRef.participant.name || trackRef.participant.identity
}

function getStageIdentityInitials(trackRef: TrackReference): string {
  const label = getTrackParticipantLabel(trackRef)
  const parts = label.trim().split(/\s+/).filter(Boolean).slice(0, 2)

  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return parts.map((part) => part[0]).join("").toUpperCase()
}


function getTrackAccentTone(
  trackRef: TrackReference,
  participantAppearanceOverrides: Record<string, ParticipantAppearanceOverride>,
): StageIdentityAccentTone {
  return getStageIdentityAccentTone(
    participantAppearanceOverrides[trackRef.participant.identity]?.accentId ?? null,
  )
}

function getTrackIsSpeaking(trackRef: TrackReference): boolean {
  return Boolean(trackRef.participant.isSpeaking)
}

function StageIdentityOverlay({
  trackRef,
  participantAppearanceOverrides,
  label = "Live Source",
}: {
  trackRef: TrackReference
  participantAppearanceOverrides: Record<string, ParticipantAppearanceOverride>
  label?: string
}): JSX.Element {
  const accentTone = getTrackAccentTone(trackRef, participantAppearanceOverrides)
  const participantLabel = getTrackParticipantLabel(trackRef)
  const initials = getStageIdentityInitials(trackRef)
  const isSpeaking = getTrackIsSpeaking(trackRef)

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-30 flex items-end justify-between gap-3">
      {isSpeaking ? (
        <div
          className="absolute -inset-x-2 -bottom-2 h-24 rounded-[24px] opacity-70 blur-2xl animate-[stageSpeakerEnergy_1.8s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(circle at bottom, rgba(${accentTone.rgb}, 0.24), transparent 62%)`,
          }}
        />
      ) : null}
      <div
        className={`min-w-0 rounded-[14px] border bg-black/46 px-3 py-2 backdrop-blur-md ${accentTone.border}`}
        style={{
          boxShadow: isSpeaking
            ? `0 0 38px rgba(${accentTone.rgb}, 0.30), inset 0 1px 0 rgba(255,255,255,0.06)`
            : `0 0 28px rgba(${accentTone.rgb}, 0.16), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/78">
          {participantLabel}
        </div>
        <div className={`mt-0.5 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.12em] ${accentTone.text}`}>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: `rgba(${accentTone.rgb}, 0.82)`,
              boxShadow: `0 0 8px rgba(${accentTone.rgb}, 0.44)`,
            }}
          />
          {isSpeaking ? "Voice Active" : label}
        </div>
      </div>

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] border bg-black/42 text-[10px] font-black tracking-[0.08em] text-white/74 backdrop-blur-md ${accentTone.border}`}
        style={{
          boxShadow: isSpeaking
            ? `0 0 34px rgba(${accentTone.rgb}, 0.34), inset 0 1px 0 rgba(255,255,255,0.07)`
            : `0 0 24px rgba(${accentTone.rgb}, 0.18), inset 0 1px 0 rgba(255,255,255,0.045)`,
          transform: isSpeaking ? "scale(1.035)" : undefined,
        }}
      >
        {initials}
      </div>
    </div>
  )
}

export default function StageVideoPreview({
  stageState,
  participantIds,
  participantAppearanceOverrides = {},
  screenLayoutPreset = "classic",
}: {
  stageState: StageState | null
  participantIds: string[]
  participantAppearanceOverrides?: Record<string, ParticipantAppearanceOverride>
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

  const lastPrimaryCameraRef = useRef<TrackReference | null>(null)
  const lastSpeakerCameraRef = useRef<TrackReference | null>(null)
  const lastScreenTrackRef = useRef<TrackReference | null>(null)
  const lastGridCameraTracksRef = useRef<TrackReference[]>([])

  function isStillRouted(trackRef: TrackReference | null): trackRef is TrackReference {
    return Boolean(trackRef && stageIdSet.has(trackRef.participant.identity))
  }

  function rememberStableTrack(
    ref: React.MutableRefObject<TrackReference | null>,
    nextTrack: TrackReference | null,
  ): TrackReference | null {
    if (nextTrack) {
      ref.current = nextTrack
      return nextTrack
    }

    return isStillRouted(ref.current) ? ref.current : null
  }

  function rememberStableCameraGrid(nextTracks: TrackReference[]): TrackReference[] {
    if (nextTracks.length > 0) {
      lastGridCameraTracksRef.current = nextTracks
      return nextTracks
    }

    return lastGridCameraTracksRef.current.filter(isStillRouted)
  }

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
    const primary = rememberStableTrack(lastPrimaryCameraRef, pickPrimaryCamera())

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
        <StageIdentityOverlay
          trackRef={primary}
          participantAppearanceOverrides={participantAppearanceOverrides}
          label={isPinned ? "Pinned Source" : isPrimary ? "Primary Source" : "Live Source"}
        />
      </RoutedMonitorFrame>
    )
  }

  if (stageState.layout === "screen_speaker") {
    const screenTrack = rememberStableTrack(lastScreenTrackRef, pickScreenTrack())
    const speakerTrack = rememberStableTrack(lastSpeakerCameraRef, pickSpeakerForScreenLayout())

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
          <StageIdentityOverlay
            trackRef={speakerTrack}
            participantAppearanceOverrides={participantAppearanceOverrides}
            label={isPinned ? "Pinned Source" : isPrimary ? "Primary Source" : "Speaker Source"}
          />
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
          <StatusPill label="Primary" tone="primary" />
        ) : null}

        {speakerIsPinned ? (
          <StatusPill label="Pinned" tone="pinned" />
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
            <StatusPill label="Fullscreen Screen" tone="screen" />
          </div>
        </RoutedMonitorFrame>
      )
    }

    if (screenLayoutPreset === "brand") {
      return (
        <div className="group relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-sky-300/15 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.24),transparent_30%),radial-gradient(circle_at_82%_70%,rgba(168,85,247,0.20),transparent_32%),linear-gradient(135deg,#020617,#0f172a_48%,#111827)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <SignalAtmosphere live={stageState.is_live} tone="screen" />

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_38%,rgba(255,255,255,0.035))]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_24px)]" />

          <div className="pointer-events-none absolute left-6 top-5 rounded-full border border-sky-300/25 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-sky-100/80 backdrop-blur">
            Jupiter Stage
          </div>

          <div className="relative w-[86%] overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-[0_30px_100px_rgba(56,189,248,0.22)]">
            <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.045)_42%,transparent_64%)] animate-[stageMonitorSweep_7s_ease-in-out_infinite]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 z-20 h-px bg-gradient-to-r from-transparent via-sky-200/24 to-transparent" />
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
              <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.04)_42%,transparent_64%)] animate-[stageMonitorSweep_8s_ease-in-out_infinite]" />
              <VideoTrack
                trackRef={speakerTrack}
                className="aspect-video w-full object-cover"
              />
              <StageIdentityOverlay
                trackRef={speakerTrack}
                participantAppearanceOverrides={participantAppearanceOverrides}
                label="Speaker Source"
              />
              {speakerBadges}
            </div>
          ) : null}
        </div>
      )
    }

    if (screenLayoutPreset === "speaker_focus") {
      return (
        <div className="group relative min-h-[420px] overflow-hidden rounded-2xl bg-black p-5">
          <SignalAtmosphere live={stageState.is_live} tone="speaker" />
          {screenTrack ? (
            <div className="absolute right-5 top-7 w-[54%] overflow-hidden rounded-[24px] border border-white/10 bg-black opacity-80 shadow-2xl">
              <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.04)_42%,transparent_64%)] animate-[stageMonitorSweep_7.4s_ease-in-out_infinite]" />
              <VideoTrack
                trackRef={screenTrack}
                className="aspect-video h-full w-full object-contain"
              />
              <div className="pointer-events-none absolute left-3 top-3">
                <StatusPill label="Screen" tone="screen" />
              </div>
            </div>
          ) : null}

          {speakerTrack ? (
            <div className="absolute bottom-5 left-5 w-[46%] max-w-[460px] overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
              <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.05)_42%,transparent_64%)] animate-[stageMonitorSweep_6.8s_ease-in-out_infinite]" />
              <VideoTrack
                trackRef={speakerTrack}
                className="aspect-video w-full object-cover"
              />
              <StageIdentityOverlay
                trackRef={speakerTrack}
                participantAppearanceOverrides={participantAppearanceOverrides}
                label="Speaker Focus"
              />
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
      <div className="relative grid min-h-[420px] gap-4 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="pointer-events-none absolute inset-y-4 right-[28%] z-20 w-px bg-gradient-to-b from-transparent via-violet-200/20 to-transparent" />
        <RoutedMonitorFrame mode="program">
          {screenTrack ? (
            <VideoTrack trackRef={screenTrack} className="aspect-video h-full w-full object-contain" />
          ) : (
            <CompactEmptySignal label="No screen share" />
          )}
          <div className="pointer-events-none absolute left-3 top-3">
            <StatusPill label="Screen" tone="screen" />
          </div>
        </RoutedMonitorFrame>

        <RoutedMonitorFrame
          mode={speakerIsPrimary ? "program" : "confidence"}
        >
          {speakerTrack ? (
            <>
              <VideoTrack trackRef={speakerTrack} className="aspect-video h-full w-full object-cover" />
              <StageIdentityOverlay
                trackRef={speakerTrack}
                participantAppearanceOverrides={participantAppearanceOverrides}
                label={speakerIsPrimary ? "Primary Source" : "Speaker Source"}
              />
            </>
          ) : (
            <CompactEmptySignal label="No speaker camera" />
          )}
          {speakerBadges}
        </RoutedMonitorFrame>
      </div>
    )
  }

  const stableGridCameraTracks = rememberStableCameraGrid(onStageCameraTracks)

  if (stableGridCameraTracks.length === 0) {
    return (
      <EmptyMonitorState
        title="No Active Cameras"
        subtitle="No participant camera feeds are currently routed to this monitor"
      />
    )
  }

  return (
    <div
      className={`relative grid min-h-[420px] gap-4 ${
        stableGridCameraTracks.length === 1
          ? "grid-cols-1"
          : stableGridCameraTracks.length === 2
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_24px)]" />
      {stableGridCameraTracks.map((trackRef) => {
        const isPrimary = stageState.primary_participant_id === trackRef.participant.identity
        const isPinned = stageState.pinned_participant_id === trackRef.participant.identity

        return (
          <RoutedMonitorFrame
            key={trackRef.participant.identity}
            mode={isPrimary ? "program" : isPinned ? "confidence" : "preview"}
          >
            <VideoTrack trackRef={trackRef} className="aspect-video h-full w-full object-cover" />
            <StageIdentityOverlay
              trackRef={trackRef}
              participantAppearanceOverrides={participantAppearanceOverrides}
              label={isPrimary ? "Primary Source" : isPinned ? "Pinned Source" : "Stage Source"}
            />
            <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
              {isPrimary ? (
                <StatusPill label="Primary" tone="primary" />
              ) : null}

              {isPinned ? (
                <StatusPill label="Pinned" tone="pinned" />
              ) : null}
            </div>
          </RoutedMonitorFrame>
        )
      })}
      <style jsx global>{`
        @keyframes stageSignalSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-18%);
          }

          46% {
            opacity: 0.26;
          }

          100% {
            transform: translateX(18%);
          }
        }

        @keyframes stageMonitorSweep {
          0%,
          100% {
            opacity: 0;
            transform: translateX(-120%);
          }

          42% {
            opacity: 0.28;
          }

          100% {
            transform: translateX(220%);
          }
        }

        @keyframes stageSpeakerEnergy {
          0%,
          100% {
            opacity: 0.22;
            transform: scale(0.98);
          }

          50% {
            opacity: 0.72;
            transform: scale(1.04);
          }
        }
      `}</style>
    </div>
  )
}
