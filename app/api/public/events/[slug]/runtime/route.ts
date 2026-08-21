import { NextResponse } from "next/server"
import { getEventBySlug } from "@/lib/events"
import { isDistrictAgendaItem } from "@/lib/districtAccess"
import { publicEventHeaders } from "@/lib/publicEventCors"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(request: Request, data: unknown, status = 200): Response {
  return NextResponse.json(data, { status, headers: publicEventHeaders(request) })
}

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: publicEventHeaders(request) })
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params

  try {
    const event = await getEventBySlug(slug)

    const [liveStateResult, agendaResult] = await Promise.all([
      supabaseAdmin
        .from("event_live_state")
        .select("mode,status,survey_url,show_survey,updated_at")
        .eq("event_id", event.id)
        .maybeSingle(),
      supabaseAdmin
        .from("event_agenda_items")
        .select(
          "id,title,description,speaker,speaker_title,speaker_bio,speaker_photo_url,speakers,show_session_details,show_speaker_photo,resources,show_resources,district_lookup_enabled,icon_key,track,location,start_at,end_at,sort_index,status,button_text,button_url,is_visible,updated_at"
        )
        .eq("event_id", event.id)
        .eq("is_visible", true)
        .order("start_at", { ascending: true })
        .order("sort_index", { ascending: true }),
    ])

    if (liveStateResult.error) {
      return json(request, { error: liveStateResult.error.message }, 500)
    }

    if (agendaResult.error) {
      return json(request, { error: agendaResult.error.message }, 500)
    }

    const agenda = [...(agendaResult.data || [])].sort((left, right) => {
      const startDifference =
        new Date(left.start_at).getTime() - new Date(right.start_at).getTime()

      if (startDifference !== 0) return startDifference

      const statusOrder: Record<string, number> = {
        complete: 0,
        cancelled: 0,
        live: 1,
        upcoming: 2,
      }

      return (
        (statusOrder[left.status] ?? 3) - (statusOrder[right.status] ?? 3) ||
        left.sort_index - right.sort_index
      )
    })
    const currentSession = agenda.find((item) => item.status === "live") ?? null
    const currentIndex = currentSession
      ? agenda.findIndex((item) => item.id === currentSession.id)
      : -1
    const nextSession =
      agenda
        .slice(currentIndex + 1)
        .find((item) => item.status === "upcoming") ?? null
    const eventStatus = currentSession
      ? "in_progress"
      : agenda.length > 0 &&
          agenda.every(
            (item) => item.status === "complete" || item.status === "cancelled"
          )
        ? "complete"
        : "scheduled"
    const accessMode = liveStateResult.data?.status === "open" ? "open" : "closed"
    const agendaStartAt = agenda.find((item) => item.start_at)?.start_at ?? event.start_at
    const agendaEndAt = [...agenda].reverse().find((item) => item.end_at)?.end_at ?? event.end_at
    const syncToken = [
      liveStateResult.data?.updated_at,
      ...agenda.map((item) => item.updated_at),
    ]
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null

    return json(request, {
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        start_at: agendaStartAt,
        end_at: agendaEndAt,
      },
      sync_token: syncToken,
      status: accessMode,
      mode: accessMode,
      routing_mode: liveStateResult.data?.mode ?? "lobby",
      event_status: eventStatus,
      survey_url: liveStateResult.data?.survey_url ?? null,
      show_survey: liveStateResult.data?.show_survey === true,
      active_session: currentSession?.id ?? null,
      district_lookup_enabled: currentSession
        ? isDistrictAgendaItem(currentSession)
        : false,
      current_session: currentSession,
      next_session: nextSession,
      button_text: currentSession?.button_text ?? null,
      button_url: currentSession?.button_url ?? null,
      agenda,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load event runtime"
    const status = message.startsWith("Event not found") ? 404 : 500
    return json(request, { error: message }, status)
  }
}
