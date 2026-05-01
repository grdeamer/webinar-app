import { supabaseAdmin } from "@/lib/supabase/admin"
import type {
  EventBreakout,
  EventLiveDestination,
  EventLiveMode,
  EventLiveStateRecord,
} from "@/lib/types"

/**
 * EVENT ROUTING STATE
 *
 * This file is responsible for event-level attendee routing only.
 *
 * It answers questions like:
 * - Should attendees stay on the event home?
 * - Should they be redirected into a session?
 * - Should they be redirected into a breakout?
 * - Is the event currently off-air?
 *
 * This file does NOT control:
 * - LiveKit media transport
 * - producer/control-room stage composition
 * - session-level program/preview state
 */
type EventRoutingStateRecord = EventLiveStateRecord
type EventRoutingDestination = EventLiveDestination

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function normalizeDestinationType(value: string | null | undefined) {
  if (value === "session") return "session"
  if (value === "general_session") return "general_session"
  return null
}

function resolveTransitionDuration(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 3000
  }

  return Math.max(800, Math.min(6000, Math.round(value)))
}

export async function getEventLiveState(
  eventId: string
): Promise<EventRoutingStateRecord | null> {
  if (!isUuid(eventId)) return null

  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .select(
      "id,event_id,mode,active_breakout_id,destination_type,destination_session_id,headline,message,force_redirect,transition_type,transition_duration_ms,transition_active,transition_started_at,is_live,updated_at,updated_by"
    )
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) {
    if (error.code === "42P01") return null
    throw new Error(error.message)
  }

  return (data as EventRoutingStateRecord | null) ?? null
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
  isLive?: boolean
}): Promise<EventRoutingStateRecord> {
  const transitionDurationMs = resolveTransitionDuration(input.transitionDurationMs)

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
    is_live: typeof input.isLive === "boolean" ? input.isLive : undefined,
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
      "id,event_id,mode,active_breakout_id,destination_type,destination_session_id,headline,message,force_redirect,transition_type,transition_duration_ms,transition_active,transition_started_at,is_live,updated_at,updated_by"
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as EventRoutingStateRecord
}

// Resolves the attendee-facing destination for the event as a whole.
// This is event routing, not session stage composition.
export function getEventLiveDestination(args: {
  slug: string
  liveState: EventRoutingStateRecord | null
  breakouts?: EventBreakout[] | null
}): EventRoutingDestination {
  const { slug, liveState, breakouts = [] } = args

  if (!liveState) {
    return {
      mode: "lobby",
      href: `/events/${slug}/lobby`,
      label: "Lobby is active",
      description: "Attendees should stay in the lobby until you switch the event live state.",
    }
  }

  const destinationType = normalizeDestinationType(liveState.destination_type)
  const destinationSessionId = liveState.destination_session_id ?? null

  if (destinationType === "general_session" && destinationSessionId) {
    return {
      mode: "general_session",
      href: `/events/${slug}/sessions/${destinationSessionId}`,
      label: liveState.headline || "Main stage is live",
      description: liveState.message || "Attendees are being directed to the main stage session.",
      sessionId: destinationSessionId,
      forceRedirect: !!liveState.force_redirect,
    }
  }

  if (destinationType === "session" && destinationSessionId) {
    return {
      mode: "session",
      href: `/events/${slug}/sessions/${destinationSessionId}`,
      label: liveState.headline || "Session is live",
      description: liveState.message || "A session is active right now.",
      sessionId: destinationSessionId,
      forceRedirect: !!liveState.force_redirect,
    }
  }

  if (liveState.mode === "general_session") {
    return {
      mode: "general_session",
      href: destinationSessionId
        ? `/events/${slug}/sessions/${destinationSessionId}`
        : `/events/${slug}/sessions`,
      label: liveState.headline || "Main stage is live",
      description: liveState.message || "Attendees are being directed to the main stage session.",
      sessionId: destinationSessionId,
      forceRedirect: !!liveState.force_redirect,
    }
  }

  if (liveState.mode === "breakout") {
    const active =
      breakouts.find((item) => item.id === liveState.active_breakout_id) || null

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

  if (liveState.mode === "off_air" || liveState.mode === "announcement") {
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

export async function getEventRoutingState(
  eventId: string
): Promise<EventRoutingStateRecord | null> {
  return getEventLiveState(eventId)
}

export async function upsertEventRoutingState(input: {
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
  isLive?: boolean
}): Promise<EventRoutingStateRecord> {
  return upsertEventLiveState(input)
}

export function getEventRoutingDestination(args: {
  slug: string
  liveState: EventRoutingStateRecord | null
  breakouts?: EventBreakout[] | null
}): EventRoutingDestination {
  return getEventLiveDestination(args)
}

export function getBreakoutRuntimeStatus(
  breakout: Pick<EventBreakout, "id" | "start_at" | "end_at" | "manual_live">,
  liveState: EventRoutingStateRecord | null
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