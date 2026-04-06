import { supabaseAdmin } from "@/lib/supabase/admin"
import type {
  EventBreakout,
  EventLiveDestination,
  EventLiveMode,
  EventLiveStateRecord,
} from "@/lib/types"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function getEventLiveState(
  eventId: string
): Promise<EventLiveStateRecord | null> {
  if (!isUuid(eventId)) return null

  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .select(
      "id,event_id,mode,active_breakout_id,destination_type,destination_session_id,headline,message,force_redirect,transition_type,transition_duration_ms,transition_active,transition_started_at,updated_at,updated_by"
    )
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) {
    if (error.code === "42P01") return null
    throw new Error(error.message)
  }

  return (data as EventLiveStateRecord | null) ?? null
}

export async function upsertEventLiveState(input: {
  eventId: string
  mode: EventLiveMode
  activeBreakoutId?: string | null
  destinationType?: string | null
  destinationSessionId?: string | null
  headline?: string | null
  message?: string | null
  forceRedirect?: boolean
  transitionType?: string | null
  transitionDurationMs?: number | null
  transitionActive?: boolean
  transitionStartedAt?: string | null
  updatedBy?: string | null
}): Promise<EventLiveStateRecord> {
  const transitionDurationMs =
    typeof input.transitionDurationMs === "number" &&
    Number.isFinite(input.transitionDurationMs)
      ? Math.max(800, Math.min(6000, Math.round(input.transitionDurationMs)))
      : 3000

  const transitionActive =
    typeof input.transitionActive === "boolean"
      ? input.transitionActive
      : !!input.forceRedirect

  const row = {
    event_id: input.eventId,
    mode: input.mode,
    active_breakout_id: input.activeBreakoutId ?? null,
    destination_type: input.destinationType ?? null,
    destination_session_id: input.destinationSessionId ?? null,
    headline: input.headline?.trim()
      ? input.headline.trim().slice(0, 200)
      : null,
    message: input.message?.trim()
      ? input.message.trim().slice(0, 1000)
      : null,
    force_redirect: !!input.forceRedirect,
    transition_type: input.transitionType?.trim()
      ? input.transitionType.trim().slice(0, 50)
      : "fade",
    transition_duration_ms: transitionDurationMs,
    transition_active: transitionActive,
    transition_started_at:
      input.transitionStartedAt ??
      (transitionActive ? new Date().toISOString() : null),
    updated_by: input.updatedBy ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .upsert(row, { onConflict: "event_id" })
    .select(
      "id,event_id,mode,active_breakout_id,destination_type,destination_session_id,headline,message,force_redirect,transition_type,transition_duration_ms,transition_active,transition_started_at,updated_at,updated_by"
    )
    .single()

  if (error) throw new Error(error.message)

  return data as EventLiveStateRecord
}

export function getEventLiveDestination(args: {
  slug: string
  liveState: EventLiveStateRecord | null
  breakouts?: EventBreakout[] | null
}): EventLiveDestination {
  const { slug, liveState, breakouts = [] } = args

  if (liveState?.destination_type === "session" && liveState.destination_session_id) {
    return {
      mode: "session",
      href: `/events/${slug}/sessions/${liveState.destination_session_id}`,
      label: liveState.headline || "Session is live",
      description: liveState.message || "A session is active right now.",
      sessionId: liveState.destination_session_id,
      forceRedirect: !!liveState.force_redirect,
    }
  }

  if (liveState?.mode === "general_session") {
    return {
      mode: "general_session",
      href: "/general-session",
      label: liveState.headline || "General session is live",
      description: liveState.message || "Send attendees to the main stage player.",
      forceRedirect: !!liveState.force_redirect,
    }
  }

  if (!liveState) {
    return {
      mode: "lobby",
      href: `/events/${slug}/lobby`,
      label: "Lobby is active",
      description: "Attendees should stay in the lobby until you switch the event live state.",
    }
  }

  if (liveState.mode === "breakout") {
    const active = breakouts.find((item) => item.id === liveState.active_breakout_id) || null

    return {
      mode: "breakout",
      href: active?.join_link || `/events/${slug}/breakouts`,
      label: liveState.headline || active?.title || "Breakout room is live",
      description:
        liveState.message ||
        active?.description ||
        "A breakout room is active right now. Open the breakout list for details.",
      breakoutId: active?.id ?? null,
      forceRedirect: !!liveState.force_redirect,
    }
  }

  if (liveState.mode === "replay") {
    return {
      mode: "replay",
      href: `/events/${slug}/library`,
      label: liveState.headline || "Replay is active",
      description: liveState.message || "Send attendees into the on-demand library.",
      forceRedirect: !!liveState.force_redirect,
    }
  }

  if (liveState.mode === "off_air") {
    return {
      mode: "off_air",
      href: `/events/${slug}`,
      label: liveState.headline || "Off air",
      description:
        liveState.message ||
        "The event is currently off air. Keep attendees on the event home page.",
      forceRedirect: !!liveState.force_redirect,
    }
  }

  return {
    mode: "lobby",
    href: `/events/${slug}/lobby`,
    label: liveState.headline || "Lobby is active",
    description: liveState.message || "Attendees should stay in the lobby right now.",
    forceRedirect: !!liveState.force_redirect,
  }
}

export function getBreakoutRuntimeStatus(
  breakout: Pick<EventBreakout, "id" | "start_at" | "end_at" | "manual_live">,
  liveState: EventLiveStateRecord | null
): "live" | "starting-soon" | "upcoming" | "ended" {
  if (liveState?.mode === "breakout" && liveState.active_breakout_id === breakout.id) {
    return "live"
  }

  if (breakout.manual_live) return "live"

  const now = Date.now()
  const startMs = breakout.start_at ? new Date(breakout.start_at).getTime() : null
  const endMs = breakout.end_at ? new Date(breakout.end_at).getTime() : null

  if (startMs && endMs && now >= startMs && now <= endMs) return "live"
  if (startMs && now < startMs && startMs - now <= 15 * 60 * 1000) {
    return "starting-soon"
  }
  if (endMs && now > endMs) return "ended"

  return "upcoming"
}