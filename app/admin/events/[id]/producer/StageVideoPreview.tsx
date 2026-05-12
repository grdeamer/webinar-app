"use client"

import { useMemo } from "react"
import { useTracks, VideoTrack } from "@livekit/components-react"
import { Track } from "livekit-client"
import { isTrackReference } from "@livekit/components-core"
import type { TrackReference } from "@livekit/components-core"
import {
  CompactEmptySignal,
  EmptyMonitorState,
  RoutedMonitorFrame,
} from "./monitorChrome"

type ScreenLayoutPreset = "classic" | "brand" | "speaker_focus" | "fullscreen"


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