"use client"

import { useMemo } from "react"
import { useTracks, VideoTrack } from "@livekit/components-react"
import { Track } from "livekit-client"
import { isTrackReference } from "@livekit/components-core"
import type { TrackReference } from "@livekit/components-core"

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
}: {
  stageState: StageState | null
  participantIds: string[]
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
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/40">
        Stage is empty
      </div>
    )
  }

  if (stageState.layout === "solo") {
    const primary = pickPrimaryCamera()

    if (!primary) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/40">
          No live camera tracks on stage
        </div>
      )
    }

    const isPrimary = stageState.primary_participant_id === primary.participant.identity
    const isPinned = stageState.pinned_participant_id === primary.participant.identity

    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-black ${
          isPrimary ? "ring-2 ring-sky-400" : ""
        }`}
      >
        <VideoTrack trackRef={primary} className="aspect-video h-full w-full object-cover" />

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
      </div>
    )
  }

  if (stageState.layout === "screen_speaker") {
    const screenTrack = pickScreenTrack()
    const speakerTrack = pickSpeakerForScreenLayout()

    if (!screenTrack && !speakerTrack) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/40">
          No screen share or speaker video available
        </div>
      )
    }

    if (!screenTrack && speakerTrack) {
      const isPrimary = stageState.primary_participant_id === speakerTrack.participant.identity
      const isPinned = stageState.pinned_participant_id === speakerTrack.participant.identity

      return (
        <div
          className={`relative overflow-hidden rounded-2xl bg-black ${
            isPrimary ? "ring-2 ring-sky-400" : ""
          }`}
        >
          <VideoTrack trackRef={speakerTrack} className="aspect-video h-full w-full object-cover" />

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
        </div>
      )
    }

    return (
      <div className="grid min-h-[420px] gap-4 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="relative overflow-hidden rounded-2xl bg-black">
          {screenTrack ? (
            <VideoTrack trackRef={screenTrack} className="aspect-video h-full w-full object-contain" />
          ) : (
            <div className="flex aspect-video items-center justify-center text-white/40">
              No screen share
            </div>
          )}

          <div className="pointer-events-none absolute left-3 top-3">
            <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-950">
              SCREEN
            </span>
          </div>
        </div>

        <div
          className={`relative overflow-hidden rounded-2xl bg-black ${
            speakerTrack && stageState.primary_participant_id === speakerTrack.participant.identity
              ? "ring-2 ring-sky-400"
              : ""
          }`}
        >
          {speakerTrack ? (
            <VideoTrack trackRef={speakerTrack} className="aspect-video h-full w-full object-cover" />
          ) : (
            <div className="flex aspect-video items-center justify-center text-white/40">
              No speaker camera
            </div>
          )}

          {speakerTrack ? (
            <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
              {stageState.primary_participant_id === speakerTrack.participant.identity ? (
                <span className="rounded bg-sky-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  PRIMARY
                </span>
              ) : null}

              {stageState.pinned_participant_id === speakerTrack.participant.identity ? (
                <span className="rounded bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  PINNED
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (onStageCameraTracks.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-white/40">
        No live camera tracks on stage
      </div>
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
          <div
            key={trackRef.participant.identity}
            className={`relative overflow-hidden rounded-2xl bg-black ${
              isPrimary ? "ring-2 ring-sky-400" : ""
            }`}
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
          </div>
        )
      })}
    </div>
  )
}