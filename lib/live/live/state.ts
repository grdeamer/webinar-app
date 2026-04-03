import { supabaseAdmin } from "@/lib/supabase/admin"

export type LiveStageLayout = "solo" | "grid" | "screen_speaker"

export type EventLiveStateRecord = {
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
}

function normalizeStageIds(input: any): string[] {
  if (!Array.isArray(input)) return []
  return input.filter((v) => typeof v === "string")
}

async function ensureEventLiveRoom({ eventId }: { eventId: string }) {
  const { data, error } = await supabaseAdmin
    .from("event_live_rooms")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (data?.id) return data

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("event_live_rooms")
    .insert({ event_id: eventId })
    .select("id")
    .single()

  if (insertError) throw new Error(insertError.message)

  return inserted
}

//
// PREVIEW STATE (existing system)
//

export async function getEventLiveStageState(
  eventId: string
): Promise<EventLiveStateRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("event_live_stage_state")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) {
    if (error.code === "42P01") return null
    throw new Error(error.message)
  }

  if (!data) return null

  return {
    ...(data as Omit<EventLiveStateRecord, "stage_participant_ids">),
    stage_participant_ids: normalizeStageIds((data as any).stage_participant_ids),
  }
}

export async function ensureEventLiveStageState(eventId: string) {
  const room = await ensureEventLiveRoom({ eventId })

  const row: EventLiveStateRecord = {
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
    .select("*")
    .single()

  if (error) throw new Error(error.message)

  return {
    ...(data as Omit<EventLiveStateRecord, "stage_participant_ids">),
    stage_participant_ids: normalizeStageIds((data as any).stage_participant_ids),
  }
}

//
// PROGRAM STATE (NEW)
//

export async function getEventLiveProgramState(
  eventId: string
): Promise<EventLiveStateRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("event_live_program_state")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) {
    if (error.code === "42P01") return null
    throw new Error(error.message)
  }

  if (!data) return null

  return {
    ...(data as Omit<EventLiveStateRecord, "stage_participant_ids">),
    stage_participant_ids: normalizeStageIds((data as any).stage_participant_ids),
  }
}

export async function ensureEventLiveProgramState(eventId: string) {
  const room = await ensureEventLiveRoom({ eventId })

  const row: EventLiveStateRecord = {
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
    .from("event_live_program_state")
    .upsert(row, { onConflict: "event_id" })
    .select("*")
    .single()

  if (error) throw new Error(error.message)

  return {
    ...(data as Omit<EventLiveStateRecord, "stage_participant_ids">),
    stage_participant_ids: normalizeStageIds((data as any).stage_participant_ids),
  }
}