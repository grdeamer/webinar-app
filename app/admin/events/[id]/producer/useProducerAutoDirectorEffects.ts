"use client"

import { useEffect, useMemo } from "react"
import type { ProducerParticipant, StageState } from "./producerRoomTypes"

type Params = {
  autoDirectorEnabled: boolean
  stageState: StageState | null
  participants: ProducerParticipant[]
  setScreenShare: (participantId: string, trackId: string) => Promise<void>
  clearScreenShare: () => Promise<void>
}

export default function useProducerAutoDirectorEffects({
  autoDirectorEnabled,
  stageState,
  participants,
  setScreenShare,
  clearScreenShare,
}: Params) {
  const stageIds = useMemo(
    () => new Set(stageState?.stage_participant_ids || []),
    [stageState]
  )

  const onStageParticipants = useMemo(
    () => participants.filter((p) => stageIds.has(p.identity)),
    [participants, stageIds]
  )

  const firstOnStageScreenShare = useMemo(
    () =>
      onStageParticipants.find((p) => {
        if (!p.screenShareEnabled) return false

        const screenTrack = p.tracks.find(
          (t) => t.source === 3 || t.source === "SCREEN_SHARE"
        )

        return Boolean(screenTrack?.sid)
      }),
    [onStageParticipants]
  )

  const selectedScreenStillExists = useMemo(
    () =>
      onStageParticipants.some((p) => {
        if (p.identity !== stageState?.screen_share_participant_id) return false

        return p.tracks.some(
          (t) =>
            (t.source === 3 || t.source === "SCREEN_SHARE") &&
            t.sid === stageState?.screen_share_track_id
        )
      }),
    [
      onStageParticipants,
      stageState?.screen_share_participant_id,
      stageState?.screen_share_track_id,
    ]
  )

  useEffect(() => {
    if (!autoDirectorEnabled) return
    if (!stageState) return
    if (stageState.layout !== "screen_speaker") return
    if (stageState.screen_share_track_id) return
    if (!firstOnStageScreenShare) return

    const screenTrack = firstOnStageScreenShare.tracks.find(
      (t) => t.source === 3 || t.source === "SCREEN_SHARE"
    )

    if (!screenTrack?.sid) return

    void setScreenShare(firstOnStageScreenShare.identity, screenTrack.sid).catch(
      (_err: unknown): void => {}
    )
  }, [autoDirectorEnabled, stageState, firstOnStageScreenShare, setScreenShare])

  useEffect(() => {
    if (!stageState?.screen_share_track_id) return
    if (selectedScreenStillExists) return

    void clearScreenShare().catch((_err: unknown): void => {})
  }, [stageState?.screen_share_track_id, selectedScreenStillExists, clearScreenShare])

  return {
    stageIds,
    onStageParticipants,
  }
}
