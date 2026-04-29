"use client"

type StageLayout = "solo" | "grid" | "screen_speaker"
type CinematicTransitionType = "fade" | "warp" | "curtain" | "none"

type EventTransitionPayload = {
  active: boolean
  type?: CinematicTransitionType
  headline?: string
  message?: string
  durationMs?: number
}
async function readJson(res: Response) {
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || "Request failed")
  }

  return data
}

export default function useProducerRoomApi(
  eventId: string,
  sessionId: string
) {
  const scoped = (path: string) =>
    `${path}${path.includes("?") ? "&" : "?"}session_id=${encodeURIComponent(
      sessionId
    )}`

  async function loadToken() {
    const res = await fetch(`/api/admin/events/${eventId}/live/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "producer",
        display_name: "Producer",
        session_id: sessionId,
      }),
    })

    return readJson(res)
  }

  async function loadParticipants() {
    const res = await fetch(
      scoped(`/api/admin/events/${eventId}/live/participants`),
      {
        cache: "no-store",
      }
    )

    return readJson(res)
  }

  async function loadStageState() {
    const res = await fetch(
      scoped(`/api/admin/events/${eventId}/live/stage-state`),
      {
        cache: "no-store",
      }
    )

    return readJson(res)
  }

  async function loadProgramState() {
    const res = await fetch(
      scoped(`/api/admin/events/${eventId}/live/program-state`),
      {
        cache: "no-store",
      }
    )

    return readJson(res)
  }

  async function loadScenes() {
    const res = await fetch(
      scoped(`/api/admin/events/${eventId}/live/scenes`),
      {
        cache: "no-store",
      }
    )

    return readJson(res)
  }

  async function postStage(payload: Record<string, unknown>) {
    const res = await fetch(`/api/admin/events/${eventId}/live/stage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        session_id: sessionId,
      }),
    })

    return readJson(res)
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

  async function goLive() {
    return postStage({
      action: "go_live",
    })
  }

  async function goOffAir() {
    return postStage({
      action: "go_off_air",
    })
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

    return readJson(res)
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

    return readJson(res)
  }

  async function takeProgram() {
    const res = await fetch(`/api/admin/events/${eventId}/live/take`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    })

    return readJson(res)
  }

  async function saveScene(name: string) {
    const res = await fetch(`/api/admin/events/${eventId}/live/scenes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        session_id: sessionId,
      }),
    })

    return readJson(res)
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

    return readJson(res)
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

    return readJson(res)
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
    takeProgram,
    saveScene,
    applyScene,
    setEventTransition,
    clearEventTransition,
  }
}