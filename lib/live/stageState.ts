import { supabaseAdmin } from "@/lib/supabase/admin"
import { buildEventRoomName, getLiveProvider } from "@/lib/live/config"
import { getEventLiveState, upsertEventLiveState } from "@/lib/app/liveState"
import type {
  EventLiveRoomRecord,
  EventLiveStageStateRecord,
  LiveAudienceMode,
  LiveParticipantRole,
  LiveStageLayout,
  ProducerStageActionInput,
} from "@/lib/types"

function normalizeStageIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(String).filter(Boolean)
}

function dedupe(items: string[]) {
  return Array.from(new Set(items))
}

export async function getEventLiveRoom(eventId: string): Promise<EventLiveRoomRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("event_live_rooms")
    .select("id,event_id,provider,room_name,audience_mode,enabled,created_at,updated_at")
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) {
    if (error.code === "42P01") return null
    throw new Error(error.message)
  }

  return (data as EventLiveRoomRecord | null) ?? null
}

export async function ensureEventLiveRoom(args: {
  eventId: string
  audienceMode?: LiveAudienceMode
  enabled?: boolean
}) {
  const row = {
    event_id: args.eventId,
    provider: getLiveProvider(),
    room_name: buildEventRoomName(args.eventId),
    audience_mode: args.audienceMode ?? "embedded",
    enabled: args.enabled ?? true,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_rooms")
    .upsert(row, { onConflict: "event_id" })
    .select("id,event_id,provider,room_name,audience_mode,enabled,created_at,updated_at")
    .single()

  if (error) throw new Error(error.message)
  return data as EventLiveRoomRecord
}

export async function getEventLiveStageState(
  eventId: string
): Promise<EventLiveStageStateRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("event_live_stage_state")
    .select(
      "event_id,room_id,is_live,auto_director_enabled,layout,stage_participant_ids,primary_participant_id,pinned_participant_id,screen_share_participant_id,screen_share_track_id,scene_version,headline,message,updated_by,updated_at"
    )
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) {
    if (error.code === "42P01") return null
    throw new Error(error.message)
  }

  if (!data) return null

  return {
    ...(data as Omit<EventLiveStageStateRecord, "stage_participant_ids">),
    stage_participant_ids: normalizeStageIds((data as any).stage_participant_ids),
  }
}

export async function ensureEventLiveStageState(eventId: string) {
  const room = await ensureEventLiveRoom({ eventId })

  const row: {
    event_id: string
    room_id: string | null
    is_live: boolean
    auto_director_enabled: boolean
    layout: LiveStageLayout
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
  } = {
    event_id: eventId,
    room_id: room.id,
    is_live: false,
    auto_director_enabled: true,
    layout: "solo",
    stage_participant_ids: [],
    primary_participant_id: null,
    pinned_participant_id: null,
    screen_share_participant_id: null,
    screen_share_track_id: null,
    scene_version: 1,
    headline: null,
    message: null,
    updated_by: null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_stage_state")
    .upsert(row, { onConflict: "event_id" })
    .select(
      "event_id,room_id,is_live,auto_director_enabled,layout,stage_participant_ids,primary_participant_id,pinned_participant_id,screen_share_participant_id,screen_share_track_id,scene_version,headline,message,updated_by,updated_at"
    )
    .single()

  if (error) throw new Error(error.message)

  return {
    ...(data as Omit<EventLiveStageStateRecord, "stage_participant_ids">),
    stage_participant_ids: normalizeStageIds((data as any).stage_participant_ids),
  } satisfies EventLiveStageStateRecord
}

export async function setEventLiveLayout(args: {
  eventId: string
  layout: LiveStageLayout
  updatedBy?: string | null
}) {
  const current =
    (await getEventLiveStageState(args.eventId)) ||
    (await ensureEventLiveStageState(args.eventId))

  const patch = {
    event_id: args.eventId,
    room_id: current.room_id,
    is_live: current.is_live,
    auto_director_enabled: current.auto_director_enabled,
    layout: args.layout,
    stage_participant_ids: current.stage_participant_ids,
    primary_participant_id: current.primary_participant_id,
    pinned_participant_id: current.pinned_participant_id,
    screen_share_participant_id: current.screen_share_participant_id,
    screen_share_track_id: current.screen_share_track_id,
    scene_version: (current.scene_version || 1) + 1,
    headline: current.headline,
    message: current.message,
    updated_by: args.updatedBy ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_stage_state")
    .upsert(patch, { onConflict: "event_id" })
    .select(
      "event_id,room_id,is_live,auto_director_enabled,layout,stage_participant_ids,primary_participant_id,pinned_participant_id,screen_share_participant_id,screen_share_track_id,scene_version,headline,message,updated_by,updated_at"
    )
    .single()

  if (error) throw new Error(error.message)

  return {
    ...(data as Omit<EventLiveStageStateRecord, "stage_participant_ids">),
    stage_participant_ids: normalizeStageIds((data as any).stage_participant_ids),
  } satisfies EventLiveStageStateRecord
}

export async function applyProducerStageAction(args: {
  eventId: string
  input: ProducerStageActionInput
  updatedBy?: string | null
}) {
  const current =
    (await getEventLiveStageState(args.eventId)) ||
    (await ensureEventLiveStageState(args.eventId))

  let stageIds = [...current.stage_participant_ids]
  let isLive = current.is_live
  let primary = current.primary_participant_id
  let pinned = current.pinned_participant_id
  let screenShareParticipantId = current.screen_share_participant_id
  let screenShareTrackId = current.screen_share_track_id

  const participantId = args.input.participantId ? String(args.input.participantId) : null
  const trackId = args.input.trackId ? String(args.input.trackId) : null

  switch (args.input.action) {
    case "add_to_stage":
      if (participantId) {
        stageIds = dedupe([...stageIds, participantId])
        if (!primary) primary = participantId
      }
      break

    case "remove_from_stage":
      if (participantId) {
        stageIds = stageIds.filter((id) => id !== participantId)
        if (primary === participantId) primary = stageIds[0] ?? null
        if (pinned === participantId) pinned = null
        if (screenShareParticipantId === participantId) {
          screenShareParticipantId = null
          screenShareTrackId = null
        }
      }
      break
    case "clear_primary":
      primary = null
      break
    case "pin_participant":
      pinned = participantId
      break

    case "unpin_participant":
      pinned = null
      break

    case "set_screen_share":
      screenShareParticipantId = participantId
      screenShareTrackId = trackId
      break

    case "clear_screen_share":
      screenShareParticipantId = null
      screenShareTrackId = null
      break

    case "go_live":
      isLive = true
      break

    case "go_off_air":
      isLive = false
      break

          case "set_primary":
      primary = participantId
      if (participantId && !stageIds.includes(participantId)) {
        stageIds = dedupe([...stageIds, participantId])
      }
      break
  }

  const patch = {
    event_id: args.eventId,
    room_id: current.room_id,
    is_live: isLive,
    auto_director_enabled: current.auto_director_enabled,
    layout: current.layout,
    stage_participant_ids: stageIds,
    primary_participant_id: primary,
    pinned_participant_id: pinned,
    screen_share_participant_id: screenShareParticipantId,
    screen_share_track_id: screenShareTrackId,
    scene_version: (current.scene_version || 1) + 1,
    headline: current.headline,
    message: current.message,
    updated_by: args.updatedBy ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_stage_state")
    .upsert(patch, { onConflict: "event_id" })
    .select(
      "event_id,room_id,is_live,auto_director_enabled,layout,stage_participant_ids,primary_participant_id,pinned_participant_id,screen_share_participant_id,screen_share_track_id,scene_version,headline,message,updated_by,updated_at"
    )
    .single()

  if (error) throw new Error(error.message)

  // ---- Sync audience LIVE state (event_live_state.is_live) ----
  try {
    const liveState = await getEventLiveState(args.eventId)

    const base = {
      eventId: args.eventId,
      mode: liveState?.mode ?? "general_session",
      activeBreakoutId: liveState?.active_breakout_id ?? null,
      destinationType: liveState?.destination_type ?? "general_session",
      destinationSessionId: liveState?.destination_session_id ?? null,
      headline: liveState?.headline ?? null,
      message: liveState?.message ?? null,
      forceRedirect: liveState?.force_redirect ?? false,
      transitionType: liveState?.transition_type ?? "fade",
      transitionDurationMs: liveState?.transition_duration_ms ?? 3000,
      transitionActive: liveState?.transition_active ?? false,
      transitionStartedAt: liveState?.transition_started_at ?? null,
      updatedBy: args.updatedBy ?? null,
    }

    if (args.input.action === "add_to_stage" || args.input.action === "go_live") {
      await upsertEventLiveState({ ...base, isLive: true })
    }

    if (args.input.action === "remove_from_stage" || args.input.action === "go_off_air") {
      await upsertEventLiveState({ ...base, isLive: false })
    }
  } catch (e) {
    console.error("Failed syncing event_live_state.is_live", e)
  }

  if (participantId) {
    await supabaseAdmin
      .from("event_live_participants")
      .update({
        is_on_stage: args.input.action === "add_to_stage",
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", args.eventId)
      .eq("external_participant_id", participantId)
  }

  return {
    ...(data as Omit<EventLiveStageStateRecord, "stage_participant_ids">),
    stage_participant_ids: normalizeStageIds((data as any).stage_participant_ids),
  } satisfies EventLiveStageStateRecord
}

export async function upsertEventLiveParticipant(args: {
  eventId: string
  roomId: string | null
  externalParticipantId: string
  displayName: string
  email?: string | null
  role?: LiveParticipantRole
  cameraEnabled?: boolean
  micEnabled?: boolean
  screenShareEnabled?: boolean
  joinedAt?: string | null
  lastSeenAt?: string | null
  metadata?: Record<string, unknown>
}) {
  const row = {
    event_id: args.eventId,
    room_id: args.roomId,
    external_participant_id: args.externalParticipantId,
    display_name: args.displayName,
    email: args.email ?? null,
    role: args.role ?? "guest",
    camera_enabled: !!args.cameraEnabled,
    mic_enabled: !!args.micEnabled,
    screen_share_enabled: !!args.screenShareEnabled,
    joined_at: args.joinedAt ?? null,
    last_seen_at: args.lastSeenAt ?? new Date().toISOString(),
    metadata: args.metadata ?? {},
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_participants")
    .upsert(row, { onConflict: "event_id,external_participant_id" })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data
}