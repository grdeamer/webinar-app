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