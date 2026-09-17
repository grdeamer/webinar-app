import { supabaseAdmin } from "@/lib/supabase/admin"

export type LiveProgramState = {
  event_id: string
  layout: "solo" | "grid" | "screen_speaker"
  stage_participant_ids: string[]
  primary_participant_id: string | null
  pinned_participant_id: string | null
  screen_share_participant_id: string | null
  screen_share_track_id: string | null
  is_live: boolean
  scene_version?: number
  program_blocks?: unknown[]
  updated_by?: string | null
  updated_at: string
}

/**
 * Ensure a program state row exists for this event.
 */
export async function ensureEventLiveProgramState(
  eventId: string
): Promise<LiveProgramState> {
  const { data: existing, error } = await supabaseAdmin
    .from("event_live_program_state")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (existing) return existing

  const insert: LiveProgramState = {
    event_id: eventId,
    layout: "solo",
    stage_participant_ids: [],
    primary_participant_id: null,
    pinned_participant_id: null,
    screen_share_participant_id: null,
    screen_share_track_id: null,
    is_live: false,
    updated_at: new Date().toISOString(),
  }

  const { data, error: insertError } = await supabaseAdmin
    .from("event_live_program_state")
    .insert(insert)
    .select("*")
    .single()

  if (insertError?.code === "23505") {
    const { data: concurrent, error: concurrentError } = await supabaseAdmin
      .from("event_live_program_state")
      .select("*")
      .eq("event_id", eventId)
      .single()

    if (concurrentError) throw new Error(concurrentError.message)
    return concurrent
  }

  if (insertError) {
    throw new Error(insertError.message)
  }

  return data
}

/**
 * Update program state (used later by TAKE button)
 */
export async function updateEventLiveProgramState(
  eventId: string,
  patch: Partial<LiveProgramState>
): Promise<LiveProgramState> {
  const { data, error } = await supabaseAdmin
    .from("event_live_program_state")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function setEventLiveProgramComposition(args: {
  eventId: string
  blocks: unknown[]
  expectedVersion?: number | null
  updatedBy?: string | null
}): Promise<LiveProgramState> {
  const current = await ensureEventLiveProgramState(args.eventId)
  const currentVersion = Number(current.scene_version || 1)

  if (args.expectedVersion != null && currentVersion !== args.expectedVersion) {
    throw new Error("Program changed on another console. Refresh before continuing.")
  }

  const query = supabaseAdmin
    .from("event_live_program_state")
    .update({
      program_blocks: args.blocks,
      scene_version: currentVersion + 1,
      updated_by: args.updatedBy ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", args.eventId)
    .eq("scene_version", currentVersion)

  const { data, error } = await query.select("*").maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) {
    throw new Error("Program changed on another console. Refresh before continuing.")
  }

  return data as LiveProgramState
}
