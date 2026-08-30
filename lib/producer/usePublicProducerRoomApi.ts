"use client"

import { useMemo } from "react"
import type { ProducerParticipant, StageState } from "@/app/admin/events/[id]/producer/producerRoomTypes"
import type { CinematicTransitionType, ProducerRoomApi, StageLayout } from "./producerRoomApi"

type Params = {
  eventId: string
  roomName: string | null
  stageEndpoint: string
  token: string
}

async function readJson(res: Response): Promise<unknown> {
  const data = await res.json().catch((): null => null)

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Request failed"
    throw new Error(message)
  }

  return data
}

function isStageLayout(value: unknown): value is StageLayout {
  return value === "solo" || value === "grid" || value === "screen_speaker"
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function toQaOrigin(state: StageState) {
  return {
    cueVisible: Boolean(state.qa_origin_cue_visible),
    region: state.qa_origin_region ?? null,
    moonMode: state.qa_origin_moon_mode ?? false,
    questionLabel: state.qa_origin_question_label ?? null,
    treatment: state.qa_origin_treatment ?? null,
    lat: typeof state.qa_origin_lat === "number" ? state.qa_origin_lat : null,
    lng: typeof state.qa_origin_lng === "number" ? state.qa_origin_lng : null,
  }
}

function normalizePublicStageState(
  raw: unknown,
  base: {
    eventId: string
    roomName: string | null
    isLive?: boolean
    autoDirectorEnabled?: boolean
  }
): StageState | null {
  if (!raw || typeof raw !== "object") return null

  const record = raw as Record<string, unknown>

  const programLayout = isStageLayout(record.program_layout) ? record.program_layout : null
  const previewLayout = isStageLayout(record.preview_layout) ? record.preview_layout : "solo"

  return {
    event_id: base.eventId,
    room_id: base.roomName || null,
    is_live: base.isLive ?? false,
    auto_director_enabled: base.autoDirectorEnabled ?? false,
    layout: previewLayout,
    stage_participant_ids: toStringArray(record.preview_stage_participant_ids),
    primary_participant_id:
      typeof record.preview_primary_participant_id === "string"
        ? record.preview_primary_participant_id
        : null,
    pinned_participant_id: null,
    screen_share_participant_id: null,
    screen_share_track_id: null,
    scene_version: 0,
    headline: null,
    message: null,
    updated_by: null,
    updated_at: new Date().toISOString(),
    program_layout: programLayout,
    program_stage_participant_ids: toStringArray(record.program_stage_participant_ids),
    program_primary_participant_id:
      typeof record.program_primary_participant_id === "string"
        ? record.program_primary_participant_id
        : null,
    qa_origin_cue_visible: Boolean(record.qa_origin_cue_visible),
    qa_origin_region:
      typeof record.qa_origin_region === "string" ? record.qa_origin_region : null,
    qa_origin_moon_mode: stateOrDefault(record.qa_origin_moon_mode, false),
    qa_origin_question_label:
      typeof record.qa_origin_question_label === "string"
        ? record.qa_origin_question_label
        : null,
    qa_origin_treatment:
      record.qa_origin_treatment === "qa_origin_blend" ? "qa_origin_blend" : "default",
    qa_origin_lat: typeof record.qa_origin_lat === "number" ? record.qa_origin_lat : null,
    qa_origin_lng: typeof record.qa_origin_lng === "number" ? record.qa_origin_lng : null,
    live_moment_type:
      typeof record.live_moment_type === "string" ? record.live_moment_type : null,
    transition_type:
      typeof record.transition_type === "string" ? record.transition_type : null,
    transition_started_at:
      typeof record.transition_started_at === "string"
        ? record.transition_started_at
        : null,
  }
}

function stateOrDefault<T>(value: unknown, fallback: T): T {
  return value === undefined ? fallback : (value as T)
}

function mapTransitionType(type: CinematicTransitionType): "cut" | "fade" | "dip_to_black" {
  if (type === "none") return "cut"
  if (type === "curtain") return "dip_to_black"
  return "fade"
}

export default function usePublicProducerRoomApi({
  eventId,
  roomName,
  stageEndpoint,
  token,
}: Params): ProducerRoomApi {
  const scenesEndpoint = `${stageEndpoint}/scenes`

  return useMemo<ProducerRoomApi>(
    () => {
      async function loadToken() {
        return { token, roomName }
      }

      async function loadParticipants() {
        return { participants: [] as ProducerParticipant[] }
      }

      async function loadStageState() {
        const res = await fetch(stageEndpoint, { cache: "no-store" })
        const data = (await readJson(res)) as { state?: unknown } | null
        return {
          state: data?.state
            ? normalizePublicStageState(data.state, { eventId, roomName })
            : null,
        }
      }

      async function loadProgramState() {
        const res = await fetch(stageEndpoint, { cache: "no-store" })
        const data = (await readJson(res)) as { state?: unknown } | null
        return {
          state: data?.state
            ? normalizePublicStageState(data.state, {
                eventId,
                roomName,
                isLive: true,
              })
            : null,
        }
      }

      async function loadScenes() {
        const res = await fetch(scenesEndpoint, { cache: "no-store" })
        const data = (await readJson(res)) as { scenes?: unknown } | null
        return { scenes: Array.isArray(data?.scenes) ? data.scenes : [] }
      }

      async function savePreviewState(input: Parameters<ProducerRoomApi["savePreviewState"]>[0]) {
        const res = await fetch(stageEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            layout: input.layout,
            stage_participant_ids: input.stageParticipantIds,
            primary_participant_id: input.primaryParticipantId,
            live_moment_type: input.liveMomentType,
            qa_origin_cue_visible: input.qaOrigin?.cueVisible,
            qa_origin_region: input.qaOrigin?.region,
            qa_origin_moon_mode: input.qaOrigin?.moonMode,
            qa_origin_question_label: input.qaOrigin?.questionLabel,
            qa_origin_treatment: input.qaOrigin?.treatment,
            qa_origin_lat: input.qaOrigin?.lat,
            qa_origin_lng: input.qaOrigin?.lng,
          }),
        })

        const data = (await readJson(res)) as { state?: unknown } | null
        const state = data?.state
          ? normalizePublicStageState(data.state, { eventId, roomName })
          : null

        if (!state) throw new Error("Failed to save preview state")
        return { state }
      }

      async function withCurrentPreview<T>(
        callback: (current: StageState) => Promise<T>
      ): Promise<T> {
        const { state } = await loadStageState()
        if (!state) throw new Error("Stage state is not available")
        return callback(state)
      }

      async function addToStage(participantId: string) {
        return withCurrentPreview(async (current) => {
          const stageParticipantIds = Array.from(
            new Set([...current.stage_participant_ids, participantId])
          )
          const primaryParticipantId = current.primary_participant_id ?? participantId
          const { state } = await savePreviewState({
            layout: current.layout,
            stageParticipantIds,
            primaryParticipantId,
            qaOrigin: toQaOrigin(current),
          })
          return { state: { ...state, auto_director_enabled: false } }
        })
      }

      async function removeFromStage(participantId: string) {
        return withCurrentPreview(async (current) => {
          const stageParticipantIds = current.stage_participant_ids.filter(
            (id) => id !== participantId
          )
          const primaryParticipantId =
            current.primary_participant_id === participantId
              ? stageParticipantIds[0] ?? null
              : current.primary_participant_id
          const { state } = await savePreviewState({
            layout: current.layout,
            stageParticipantIds,
            primaryParticipantId,
            qaOrigin: toQaOrigin(current),
          })
          return { state }
        })
      }

      async function pinParticipant(_participantId: string) {
        return withCurrentPreview(async (current) => ({ state: current }))
      }

      async function unpinParticipant() {
        return withCurrentPreview(async (current) => ({ state: current }))
      }

      async function setPrimaryParticipant(participantId: string) {
        return withCurrentPreview(async (current) => {
          const stageParticipantIds = current.stage_participant_ids.includes(participantId)
            ? current.stage_participant_ids
            : [...current.stage_participant_ids, participantId]
          const { state } = await savePreviewState({
            layout: current.layout,
            stageParticipantIds,
            primaryParticipantId: participantId,
            qaOrigin: toQaOrigin(current),
          })
          return { state: { ...state, auto_director_enabled: false } }
        })
      }

      async function clearPrimaryParticipant() {
        return withCurrentPreview(async (current) => {
          const { state } = await savePreviewState({
            layout: current.layout,
            stageParticipantIds: current.stage_participant_ids,
            primaryParticipantId: null,
            qaOrigin: toQaOrigin(current),
          })
          return { state: { ...state, auto_director_enabled: false } }
        })
      }

      async function goLive(_expectedPreviewVersion?: number | null) {
        const res = await fetch(`${stageEndpoint}/take`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transition_type: "cut",
            live_moment_type: null,
          }),
        })

        const data = (await readJson(res)) as { state?: unknown } | null
        const raw = data?.state
        const state = raw ? normalizePublicStageState(raw, { eventId, roomName }) : null
        return {
          state,
          programState: raw
            ? normalizePublicStageState(raw, { eventId, roomName, isLive: true })
            : null,
        }
      }

      async function goOffAir(_expectedPreviewVersion?: number | null) {
        const { state } = await loadStageState()
        return { state, programState: state }
      }

      async function setScreenShare(_participantId: string, _trackId: string) {
        return withCurrentPreview(async (current) => ({ state: current }))
      }

      async function clearScreenShare() {
        return withCurrentPreview(async (current) => ({ state: current }))
      }

      async function setLayout(layout: StageLayout) {
        return withCurrentPreview(async (current) => {
          const { state } = await savePreviewState({
            layout,
            stageParticipantIds: current.stage_participant_ids,
            primaryParticipantId: current.primary_participant_id,
            qaOrigin: toQaOrigin(current),
          })
          return { state: { ...state, auto_director_enabled: false } }
        })
      }

      async function setAutoDirector(enabled: boolean) {
        return withCurrentPreview(async (current) => {
          const { state } = await savePreviewState({
            layout: current.layout,
            stageParticipantIds: current.stage_participant_ids,
            primaryParticipantId: current.primary_participant_id,
            qaOrigin: toQaOrigin(current),
          })
          return { state: { ...state, auto_director_enabled: enabled } }
        })
      }

      async function savePreviewComposition(
        _blocks: unknown[],
        _expectedVersion: number | null
      ): Promise<{ state: StageState }> {
        throw new Error("savePreviewComposition is not implemented for public sessions")
      }

      async function takeProgram(input: Parameters<ProducerRoomApi["takeProgram"]>[0]) {
        const transition = input.transition as Record<string, unknown>
        const type = (transition?.type as CinematicTransitionType) ?? "none"

        const res = await fetch(`${stageEndpoint}/take`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transition_type: mapTransitionType(type),
            live_moment_type: input.liveMomentType,
          }),
        })

        const data = (await readJson(res)) as { state?: unknown } | null
        return {
          state: data?.state
            ? normalizePublicStageState(data.state, { eventId, roomName })
            : null,
        }
      }

      async function saveScene(input: Parameters<ProducerRoomApi["saveScene"]>[0]) {
        return withCurrentPreview(async (current) => {
          const layout = isStageLayout(input.screenLayoutPreset)
            ? input.screenLayoutPreset
            : current.layout

          const res = await fetch(scenesEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: input.name,
              layout,
              stage_participant_ids: current.stage_participant_ids,
              primary_participant_id: current.primary_participant_id,
            }),
          })

          const data = (await readJson(res)) as
            | { scene?: { id: string | number } }
            | null
          return { scene: data?.scene }
        })
      }

      async function applyScene(sceneId: string) {
        const { scenes } = await loadScenes()
        const scene = scenes.find((item): item is Record<string, unknown> & { id: string } =>
          item !== null &&
          typeof item === "object" &&
          "id" in (item as Record<string, unknown>) &&
          (item as Record<string, unknown>).id === sceneId
        )

        if (!scene) throw new Error("Scene not found")

        const layout = isStageLayout(scene.layout) ? scene.layout : "solo"
        const stageParticipantIds = toStringArray(scene.stage_participant_ids)
        const primaryParticipantId =
          typeof scene.primary_participant_id === "string"
            ? scene.primary_participant_id
            : null

        const { state: current } = await loadStageState()
        return savePreviewState({
          layout,
          stageParticipantIds,
          primaryParticipantId,
          qaOrigin: current ? toQaOrigin(current) : undefined,
        })
      }

      async function renameScene(_sceneId: string, _name: string): Promise<unknown> {
        throw new Error("renameScene is not implemented for public sessions")
      }

      async function deleteScene(sceneId: string) {
        const res = await fetch(`${scenesEndpoint}/${sceneId}`, {
          method: "DELETE",
        })
        return readJson(res)
      }

      async function setEventTransition(
        _payload: Parameters<ProducerRoomApi["setEventTransition"]>[0]
      ): Promise<unknown> {
        return undefined
      }

      async function clearEventTransition(): Promise<unknown> {
        return undefined
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
    },
    [eventId, roomName, stageEndpoint, token]
  )
}
