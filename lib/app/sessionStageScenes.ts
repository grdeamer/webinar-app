import { supabaseAdmin } from "@/lib/supabase/admin"
import type { StageLayout } from "@/lib/app/sessionStageState"

export type SessionStageScene = {
  id: string
  session_id: string
  name: string
  layout: StageLayout
  stage_participant_ids: string[]
  primary_participant_id: string | null
  created_at: string
  updated_at: string
}

function normalizeLayout(value: unknown): StageLayout {
  return value === "grid" || value === "screen_speaker" ? value : "solo"
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

export async function listSessionStageScenes(
  sessionId: string
): Promise<SessionStageScene[]> {
  const { data, error } = await supabaseAdmin
    .from("session_stage_scenes")
    .select(
      "id,session_id,name,layout,stage_participant_ids,primary_participant_id,created_at,updated_at"
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map((row) => ({
    id: String(row.id),
    session_id: String(row.session_id),
    name: String(row.name || "Untitled Scene"),
    layout: normalizeLayout(row.layout),
    stage_participant_ids: normalizeStringArray(row.stage_participant_ids),
    primary_participant_id: normalizeNullableString(row.primary_participant_id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }))
}

export async function createSessionStageScene(input: {
  session_id: string
  name: string
  layout: StageLayout
  stage_participant_ids: string[]
  primary_participant_id: string | null
}): Promise<SessionStageScene> {
  const { data, error } = await supabaseAdmin
    .from("session_stage_scenes")
    .insert({
      session_id: input.session_id,
      name: input.name.trim() || "Untitled Scene",
      layout: input.layout,
      stage_participant_ids: input.stage_participant_ids,
      primary_participant_id: input.primary_participant_id,
    })
    .select(
      "id,session_id,name,layout,stage_participant_ids,primary_participant_id,created_at,updated_at"
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    id: String(data.id),
    session_id: String(data.session_id),
    name: String(data.name || "Untitled Scene"),
    layout: normalizeLayout(data.layout),
    stage_participant_ids: normalizeStringArray(data.stage_participant_ids),
    primary_participant_id: normalizeNullableString(data.primary_participant_id),
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  }
}

export async function deleteSessionStageScene(sceneId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("session_stage_scenes")
    .delete()
    .eq("id", sceneId)

  if (error) {
    throw new Error(error.message)
  }
}