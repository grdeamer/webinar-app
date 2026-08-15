import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { getStageState, upsertPreviewStageState } from "@/lib/app/sessionStageState"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type QAStatus = "pending" | "approved" | "rejected" | "answered"
type QAAction =
  | "approve"
  | "reject"
  | "pending"
  | "answered"
  | "feature"
  | "unfeature"
  | "put_on_screen"
  | "hide_from_screen"
  | "lock"
  | "unlock"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function getScope(eventRef: string, sessionId: string) {
  const access = await requireEventOperatorAccess(eventRef)
  if (access instanceof Response) return access

  if (!isUuid(sessionId)) {
    return json({ error: "A valid session is required." }, 400)
  }

  const session = await getSessionById(access.eventId, sessionId)
  if (!session) return json({ error: "Session not found for this event." }, 404)

  return {
    eventId: access.eventId,
    sessionId: session.id,
    roomKey: `session:${session.id}`,
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const url = new URL(req.url)
  const sessionId = String(url.searchParams.get("session_id") || "").trim()
  const scope = await getScope(id, sessionId)
  if (scope instanceof Response) return scope

  const [{ data: items, error }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabaseAdmin
        .from("qa_messages")
        .select(
          "id,event_id,room_key,name,question,status,is_featured,upvotes,created_at,updated_at,featured_at,answered_at,origin_region,origin_country,origin_city"
        )
        .eq("event_id", scope.eventId)
        .eq("room_key", scope.roomKey)
        .order("is_featured", { ascending: false })
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(250),
      supabaseAdmin
        .from("qa_room_settings")
        .select("room_key,is_locked,updated_at")
        .eq("room_key", scope.roomKey)
        .maybeSingle(),
    ])

  if (error) return json({ error: error.message }, 400)
  if (settingsError) return json({ error: settingsError.message }, 400)

  return json({
    items: items ?? [],
    settings: settings ?? { room_key: scope.roomKey, is_locked: false },
  })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: eventRef } = await ctx.params
  const body = (await req.json().catch((): null => null)) as
    | { action?: QAAction; session_id?: string; id?: string }
    | null
  const sessionId = String(body?.session_id || "").trim()
  const action = body?.action
  const scope = await getScope(eventRef, sessionId)
  if (scope instanceof Response) return scope

  if (action === "lock" || action === "unlock") {
    const { error } = await supabaseAdmin.from("qa_room_settings").upsert(
      {
        room_key: scope.roomKey,
        is_locked: action === "lock",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "room_key" }
    )
    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  }

  if (action === "hide_from_screen") {
    const stage = await getStageState(scope.sessionId)
    await upsertPreviewStageState({
      session_id: scope.sessionId,
      preview_layout: stage.preview_layout,
      preview_stage_participant_ids: stage.preview_stage_participant_ids,
      preview_primary_participant_id: stage.preview_primary_participant_id,
      live_moment_type: null,
      qa_origin_cue_visible: false,
      qa_origin_question_label: null,
      qa_origin_region: null,
      qa_origin_moon_mode: false,
      qa_origin_treatment: null,
      qa_origin_lat: null,
      qa_origin_lng: null,
    })
    return json({ ok: true })
  }

  const questionId = String(body?.id || "").trim()
  if (!isUuid(questionId)) return json({ error: "A valid question is required." }, 400)

  const { data: question, error: questionError } = await supabaseAdmin
    .from("qa_messages")
    .select("id,question,status,origin_region,origin_country,origin_city,origin_lat,origin_lng")
    .eq("id", questionId)
    .eq("event_id", scope.eventId)
    .eq("room_key", scope.roomKey)
    .maybeSingle()

  if (questionError) return json({ error: questionError.message }, 400)
  if (!question) return json({ error: "Question not found in this session." }, 404)

  const now = new Date().toISOString()

  if (action === "feature" || action === "put_on_screen") {
    const { error: clearError } = await supabaseAdmin
      .from("qa_messages")
      .update({ is_featured: false, featured_at: null })
      .eq("event_id", scope.eventId)
      .eq("room_key", scope.roomKey)
      .eq("is_featured", true)
    if (clearError) return json({ error: clearError.message }, 400)

    const { error: featureError } = await supabaseAdmin
      .from("qa_messages")
      .update({ status: "approved", is_featured: true, featured_at: now })
      .eq("id", question.id)
      .eq("event_id", scope.eventId)
      .eq("room_key", scope.roomKey)
    if (featureError) return json({ error: featureError.message }, 400)

    if (action === "put_on_screen") {
      const stage = await getStageState(scope.sessionId)
      const region =
        question.origin_city || question.origin_region || question.origin_country || "Audience"
      await upsertPreviewStageState({
        session_id: scope.sessionId,
        preview_layout: stage.preview_layout,
        preview_stage_participant_ids: stage.preview_stage_participant_ids,
        preview_primary_participant_id: stage.preview_primary_participant_id,
        live_moment_type: "audience_origin",
        qa_origin_cue_visible: true,
        qa_origin_question_label: question.question,
        qa_origin_region: region,
        qa_origin_moon_mode: false,
        qa_origin_treatment: "qa_origin_blend",
        qa_origin_lat: question.origin_lat,
        qa_origin_lng: question.origin_lng,
      })
    }

    return json({ ok: true })
  }

  if (action === "unfeature") {
    const { error } = await supabaseAdmin
      .from("qa_messages")
      .update({ is_featured: false, featured_at: null })
      .eq("id", question.id)
      .eq("event_id", scope.eventId)
      .eq("room_key", scope.roomKey)
    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  }

  const nextStatus: QAStatus | null =
    action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : action === "pending"
          ? "pending"
          : action === "answered"
            ? "answered"
            : null

  if (!nextStatus) return json({ error: "Invalid moderation action." }, 400)

  const patch: Record<string, unknown> = {
    status: nextStatus,
    answered_at: nextStatus === "answered" ? now : null,
  }
  if (nextStatus === "pending" || nextStatus === "rejected") {
    patch.is_featured = false
    patch.featured_at = null
  }

  const { error } = await supabaseAdmin
    .from("qa_messages")
    .update(patch)
    .eq("id", question.id)
    .eq("event_id", scope.eventId)
    .eq("room_key", scope.roomKey)

  if (error) return json({ error: error.message }, 400)
  return json({ ok: true })
}
