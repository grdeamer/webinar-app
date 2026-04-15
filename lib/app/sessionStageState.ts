import { supabaseAdmin } from "@/lib/supabase/admin"

export type StageLayout = "solo" | "grid" | "screen_speaker"
export type StageTransitionType = "cut" | "fade" | "dip_to_black"
export type LiveMomentType = "audience_origin"

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

  live_moment_type: LiveMomentType | null
  qa_origin_cue_visible: boolean
  qa_origin_region: string | null
  qa_origin_moon_mode: boolean
  qa_origin_question_label: string | null
  qa_origin_treatment: "default" | "qa_origin_blend" | null
  qa_origin_lat: number | null
  qa_origin_lng: number | null
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

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function normalizeCueTreatment(
  value: unknown
): "default" | "qa_origin_blend" | null {
  return value === "qa_origin_blend" || value === "default" ? value : null
}

function normalizeLiveMomentType(value: unknown): LiveMomentType | null {
  return value === "audience_origin" ? value : null
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

    live_moment_type: null,
    qa_origin_cue_visible: false,
    qa_origin_region: null,
    qa_origin_moon_mode: false,
    qa_origin_question_label: null,
    qa_origin_treatment: null,
    qa_origin_lat: null,
    qa_origin_lng: null,
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
      transition_started_at,
      live_moment_type,
      qa_origin_cue_visible,
      qa_origin_region,
      qa_origin_moon_mode,
      qa_origin_question_label,
      qa_origin_treatment,
      qa_origin_lat,
      qa_origin_lng
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

    live_moment_type: normalizeLiveMomentType(data.live_moment_type),
    qa_origin_cue_visible: Boolean(data.qa_origin_cue_visible),
    qa_origin_region: normalizeNullableString(data.qa_origin_region),
    qa_origin_moon_mode: Boolean(data.qa_origin_moon_mode),
    qa_origin_question_label: normalizeNullableString(
      data.qa_origin_question_label
    ),
    qa_origin_treatment: normalizeCueTreatment(data.qa_origin_treatment),
    qa_origin_lat: normalizeNullableNumber(data.qa_origin_lat),
    qa_origin_lng: normalizeNullableNumber(data.qa_origin_lng),
  }
}

export async function upsertPreviewStageState(input: {
  session_id: string
  preview_layout: StageLayout
  preview_stage_participant_ids: string[]
  preview_primary_participant_id: string | null
  live_moment_type?: LiveMomentType | null
  qa_origin_cue_visible?: boolean
  qa_origin_region?: string | null
  qa_origin_moon_mode?: boolean
  qa_origin_question_label?: string | null
  qa_origin_treatment?: "default" | "qa_origin_blend" | null
  qa_origin_lat?: number | null
  qa_origin_lng?: number | null
}): Promise<void> {
  const existing = await getStageState(input.session_id)

  const hasLiveMomentType = "live_moment_type" in input
  const hasCueVisible = "qa_origin_cue_visible" in input
  const hasCueRegion = "qa_origin_region" in input
  const hasCueMoonMode = "qa_origin_moon_mode" in input
  const hasCueQuestionLabel = "qa_origin_question_label" in input
  const hasCueTreatment = "qa_origin_treatment" in input
  const hasCueLat = "qa_origin_lat" in input
  const hasCueLng = "qa_origin_lng" in input

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

        live_moment_type: hasLiveMomentType
          ? input.live_moment_type ?? null
          : existing.live_moment_type,

        qa_origin_cue_visible: hasCueVisible
          ? Boolean(input.qa_origin_cue_visible)
          : existing.qa_origin_cue_visible,

        qa_origin_region: hasCueRegion
          ? input.qa_origin_region ?? null
          : existing.qa_origin_region,

        qa_origin_moon_mode: hasCueMoonMode
          ? Boolean(input.qa_origin_moon_mode)
          : existing.qa_origin_moon_mode,

        qa_origin_question_label: hasCueQuestionLabel
          ? input.qa_origin_question_label ?? null
          : existing.qa_origin_question_label,

        qa_origin_treatment: hasCueTreatment
          ? input.qa_origin_treatment ?? null
          : existing.qa_origin_treatment,

        qa_origin_lat: hasCueLat
          ? input.qa_origin_lat ?? null
          : existing.qa_origin_lat,

        qa_origin_lng: hasCueLng
          ? input.qa_origin_lng ?? null
          : existing.qa_origin_lng,

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
  liveMomentType?: LiveMomentType | null
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

        live_moment_type:
          input.liveMomentType !== undefined
            ? input.liveMomentType
            : existing.live_moment_type,

        qa_origin_cue_visible: existing.qa_origin_cue_visible,
        qa_origin_region: existing.qa_origin_region,
        qa_origin_moon_mode: existing.qa_origin_moon_mode,
        qa_origin_question_label: existing.qa_origin_question_label,
        qa_origin_treatment: existing.qa_origin_treatment,
        qa_origin_lat: existing.qa_origin_lat,
        qa_origin_lng: existing.qa_origin_lng,

        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    )

  if (error) {
    throw new Error(error.message)
  }
}