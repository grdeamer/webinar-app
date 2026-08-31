"use client"

import { useMemo } from "react"
import type { CinematicTransitionType } from "./commandDeckTypes"
import type { ProducerRoomApi } from "@/lib/producer/producerRoomApi"
import type {
  ProducerParticipant,
  SceneSnapshot,
  StageState,
} from "./producerRoomTypes"

type StageLayout = "solo" | "grid" | "screen_speaker"

type EventTransitionPayload = {
  active: boolean
  type?: CinematicTransitionType | "none"
  headline?: string
  message?: string
  durationMs?: number
}
async function readJson<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch((): null => null)
  const record = data as Record<string, unknown> | null

  if (!res.ok) {
    throw new Error(
      record && typeof record.error === "string"
        ? record.error
        : "Request failed"
    )
  }

  return data as T
}

export default function useProducerRoomApi(
  eventId: string,
  sessionId: string
) {
  return useMemo(() => {
  const scoped = (path: string) =>
    `${path}${path.includes("?") ? "&" : "?"}session_id=${encodeURIComponent(
      sessionId
    )}`

  async function loadToken() {
    const consoleKey = `jupiter:producer-console:${eventId}`
    let consoleId = window.sessionStorage.getItem(consoleKey)
    if (!consoleId) {
      consoleId = crypto.randomUUID()
      window.sessionStorage.setItem(consoleKey, consoleId)
    }

    const res = await fetch(`/api/admin/events/${eventId}/live/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "producer",
        display_name: "Producer",
        session_id: sessionId,
        console_id: consoleId,
      }),
    })

    return readJson<{ token: string; roomName?: string | null }>(res)
  }

  async function loadParticipants() {
    const res = await fetch(
      scoped(`/api/admin/events/${eventId}/live/participants`),
      {
        cache: "no-store",
      }
    )

    return readJson<{ participants: ProducerParticipant[] }>(res)
  }

  async function loadStageState() {
    const res = await fetch(
      scoped(`/api/admin/events/${eventId}/live/stage-state`),
      {
        cache: "no-store",
      }
    )

    return readJson<{ state: StageState | null }>(res)
  }

  async function loadProgramState() {
    const res = await fetch(
      scoped(`/api/admin/events/${eventId}/live/program-state`),
      {
        cache: "no-store",
      }
    )

    return readJson<{ state: StageState | null }>(res)
  }

  async function loadScenes() {
    const res = await fetch(
      scoped(`/api/admin/events/${eventId}/live/scenes`),
      {
        cache: "no-store",
      }
    )

    return readJson<{ scenes: unknown[] }>(res)
  }

  async function postStage<T = { state: StageState }>(
    payload: Record<string, unknown>,
    expectedPreviewVersion?: number | null
  ): Promise<T> {
    const res = await fetch(`/api/admin/events/${eventId}/live/stage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        session_id: sessionId,
        commandId: crypto.randomUUID(),
        expectedPreviewVersion: expectedPreviewVersion ?? null,
      }),
    })

    return readJson<T>(res)
  }

  async function addToStage(participantId: string) {
    return postStage({
      action: "add_to_stage",
      participantId,
    })
  }

  async function removeFromStage(participantId: string) {
    return postStage({
      action: "remove_from_stage",
      participantId,
    })
  }

  async function pinParticipant(participantId: string) {
    return postStage({
      action: "pin_participant",
      participantId,
    })
  }

  async function unpinParticipant() {
    return postStage({
      action: "unpin_participant",
    })
  }

  async function setPrimaryParticipant(participantId: string) {
    return postStage({
      action: "set_primary",
      participantId,
    })
  }

  async function clearPrimaryParticipant() {
    return postStage({
      action: "clear_primary",
    })
  }

  async function goLive(expectedPreviewVersion?: number | null) {
    return postStage<{
      state: StageState
      programState: StageState | null
    }>({
      action: "go_live",
    }, expectedPreviewVersion)
  }

  async function goOffAir(expectedPreviewVersion?: number | null) {
    return postStage<{
      state: StageState
      programState: StageState | null
    }>({
      action: "go_off_air",
    }, expectedPreviewVersion)
  }

  async function setScreenShare(
    participantId: string,
    trackId: string
  ) {
    return postStage({
      action: "set_screen_share",
      participantId,
      trackId,
    })
  }

  async function clearScreenShare() {
    return postStage({
      action: "clear_screen_share",
    })
  }

  async function setLayout(layout: StageLayout) {
    const res = await fetch(`/api/admin/events/${eventId}/live/layout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        layout,
        session_id: sessionId,
      }),
    })

    return readJson<{ state: StageState }>(res)
  }

  async function setAutoDirector(enabled: boolean) {
    const res = await fetch(
      `/api/admin/events/${eventId}/live/auto-director`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled,
          session_id: sessionId,
        }),
      }
    )

    return readJson<{ state: StageState }>(res)
  }

  async function savePreviewComposition(
    blocks: unknown[],
    expectedVersion: number | null
  ) {
    const res = await fetch(`/api/admin/events/${eventId}/live/composition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks,
        expectedVersion,
        session_id: sessionId,
      }),
    })

    return readJson<{ state: StageState }>(res)
  }

  async function takeProgram(input: {
    expectedPreviewVersion: number | null
    programBlocks: unknown[]
    transition: Record<string, unknown>
    liveMomentType?: "audience_origin" | null
  }) {
    const res = await fetch(`/api/admin/events/${eventId}/live/take`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        commandId: crypto.randomUUID(),
        expectedPreviewVersion: input.expectedPreviewVersion,
        programBlocks: input.programBlocks,
        transition: input.transition,
        live_moment_type: input.liveMomentType,
      }),
    })

    return readJson<{ state: StageState | null }>(res)
  }

  async function savePreviewState(
    _input: Parameters<ProducerRoomApi["savePreviewState"]>[0]
  ): Promise<{ state: StageState }> {
    throw new Error("savePreviewState is not implemented for admin sessions")
  }

  async function saveScene(input: {
    name: string
    sceneId?: string | null
    previewBlocks: unknown[]
    screenLayoutPreset: string
    thumbnailUrl?: string | null
  }) {
    const res = await fetch(`/api/admin/events/${eventId}/live/scenes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...input,
        session_id: sessionId,
      }),
    })

    return readJson<{ scene?: { id: string } }>(res)
  }

  async function applyScene(sceneId: string) {
    const res = await fetch(
      `/api/admin/events/${eventId}/live/scenes/${sceneId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      }
    )

    return readJson<{ state: StageState }>(res)
  }

  async function renameScene(sceneId: string, name: string) {
    const res = await fetch(
      `/api/admin/events/${eventId}/live/scenes/${sceneId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }
    )
    return readJson<Record<string, unknown>>(res)
  }

  async function deleteScene(sceneId: string) {
    const res = await fetch(
      `/api/admin/events/${eventId}/live/scenes/${sceneId}`,
      { method: "DELETE" }
    )
    return readJson<Record<string, unknown>>(res)
  }
  async function setEventTransition({
    active,
    type = "fade",
    headline = "Moving you to the next experience",
    message = "Stand by while Jupiter prepares your next destination.",
    durationMs = 1600,
  }: EventTransitionPayload) {
    const res = await fetch(`/api/admin/events/${eventId}/live-state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transition_active: active,
        transition_type: type,
        transition_duration_ms: durationMs,
        headline,
        message,
        session_id: sessionId,
      }),
    })

    return readJson<Record<string, unknown>>(res)
  }

  async function clearEventTransition() {
    return setEventTransition({
      active: false,
      type: "none",
      headline: "",
      message: "",
      durationMs: 0,
    })
  }
    return {
      loadToken,
      loadParticipants,
      loadStageState,
      loadProgramState,
      loadScenes,
      addToStage,
      removeFromStage,
      pinParticipant,
      unpinParticipant,
      setPrimaryParticipant,
      clearPrimaryParticipant,
      goLive,
      goOffAir,
      setScreenShare,
      clearScreenShare,
      setLayout,
      setAutoDirector,
      savePreviewState,
      savePreviewComposition,
      takeProgram,
      saveScene,
      applyScene,
      renameScene,
      deleteScene,
      setEventTransition,
      clearEventTransition,
    }
  }, [eventId, sessionId])
}
