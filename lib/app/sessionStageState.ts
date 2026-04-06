import { supabaseAdmin } from "@/lib/supabase/admin"

export type StageLayout = "solo" | "grid" | "screen_speaker"
export type StageTransitionType = "cut" | "fade" | "dip_to_black"

export type SessionStageState = {
  session_id: string

  preview_layout: StageLayout
  preview_stage_participant_ids: string[]
  preview_primary_participant_id: string | null

  program_layout: StageLayout
  program_stage_participant_ids: string[]
  program_primary_participant_id: string | null

  transition_type: StageTransitionType
  transition_started_at: string | null
}

function normalizeStageLayout(value: unknown): StageLayout {
  return value === "grid" || value === "screen_speaker" ? value : "solo"
}

function normalizeTransitionType(value: unknown): StageTransitionType {
  return value === "fade" || value === "dip_to_black" ? value : "cut"
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function getEmptyStageState(sessionId: string): SessionStageState {
  return {
    session_id: sessionId,

    preview_layout: "solo",
    preview_stage_participant_ids: [],
    preview_primary_participant_id: null,

    program_layout: "solo",
    program_stage_participant_ids: [],
    program_primary_participant_id: null,

    transition_type: "cut",
    transition_started_at: null,
  }
}

export async function getStageState(
  sessionId: string
): Promise<SessionStageState> {
  const { data, error } = await supabaseAdmin
    .from("session_stage_state")
    .select(
      `
      session_id,
      preview_layout,
      preview_stage_participant_ids,
      preview_primary_participant_id,
      program_layout,
      program_stage_participant_ids,
      program_primary_participant_id,
      transition_type,
      transition_started_at
      `
    )
    .eq("session_id", sessionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return getEmptyStageState(sessionId)
  }

  return {
    session_id: String(data.session_id),

    preview_layout: normalizeStageLayout(data.preview_layout),
    preview_stage_participant_ids: normalizeStringArray(
      data.preview_stage_participant_ids
    ),
    preview_primary_participant_id: normalizeNullableString(
      data.preview_primary_participant_id
    ),

    program_layout: normalizeStageLayout(data.program_layout),
    program_stage_participant_ids: normalizeStringArray(
      data.program_stage_participant_ids
    ),
    program_primary_participant_id: normalizeNullableString(
      data.program_primary_participant_id
    ),

    transition_type: normalizeTransitionType(data.transition_type),
    transition_started_at: normalizeNullableString(data.transition_started_at),
  }
}

export async function upsertPreviewStageState(input: {
  session_id: string
  preview_layout: StageLayout
  preview_stage_participant_ids: string[]
  preview_primary_participant_id: string | null
}): Promise<void> {
  const existing = await getStageState(input.session_id)

  const { error } = await supabaseAdmin
    .from("session_stage_state")
    .upsert(
      {
        session_id: input.session_id,

        preview_layout: input.preview_layout,
        preview_stage_participant_ids: input.preview_stage_participant_ids,
        preview_primary_participant_id: input.preview_primary_participant_id,

        program_layout: existing.program_layout,
        program_stage_participant_ids: existing.program_stage_participant_ids,
        program_primary_participant_id: existing.program_primary_participant_id,

        transition_type: existing.transition_type,
        transition_started_at: existing.transition_started_at,

        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    )

  if (error) {
    throw new Error(error.message)
  }
}

export async function takeProgramLive(input: {
  sessionId: string
  transitionType: StageTransitionType
}): Promise<void> {
  const existing = await getStageState(input.sessionId)

  const { error } = await supabaseAdmin
    .from("session_stage_state")
    .upsert(
      {
        session_id: input.sessionId,

        preview_layout: existing.preview_layout,
        preview_stage_participant_ids: existing.preview_stage_participant_ids,
        preview_primary_participant_id: existing.preview_primary_participant_id,

        program_layout: existing.preview_layout,
        program_stage_participant_ids: existing.preview_stage_participant_ids,
        program_primary_participant_id: existing.preview_primary_participant_id,

        transition_type: input.transitionType,
        transition_started_at: new Date().toISOString(),

        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    )

  if (error) {
    throw new Error(error.message)
  }
}