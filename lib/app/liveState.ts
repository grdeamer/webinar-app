import { supabaseAdmin } from "@/lib/supabase/admin"
import type {
  EventBreakout,
  EventLiveDestination,
  EventLiveMode,
  EventLiveStateRecord,
} from "@/lib/types"

export async function getEventLiveState(eventId: string): Promise<EventLiveStateRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .select("id,event_id,mode,active_breakout_id,headline,message,force_redirect,updated_at,updated_by")
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
  headline?: string | null
  message?: string | null
  forceRedirect?: boolean
  updatedBy?: string | null
}): Promise<EventLiveStateRecord> {
  const row = {
    event_id: input.eventId,
    mode: input.mode,
    active_breakout_id: input.activeBreakoutId ?? null,
    headline: input.headline?.trim() ? input.headline.trim().slice(0, 200) : null,
    message: input.message?.trim() ? input.message.trim().slice(0, 1000) : null,
    force_redirect: !!input.forceRedirect,
    updated_by: input.updatedBy ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .upsert(row, { onConflict: "event_id" })
    .select("id,event_id,mode,active_breakout_id,headline,message,force_redirect,updated_at,updated_by")
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

  if (!liveState) {
    return {
      mode: "lobby",
      href: `/events/${slug}/lobby`,
      label: "Lobby is active",
      description: "Attendees should stay in the lobby until you switch the event live state.",
    }
  }

  if (liveState.mode === "general_session") {
    return {
      mode: "general_session",
      href: "/general-session",
      label: liveState.headline || "General session is live",
      description: liveState.message || "Send attendees to the main stage player.",
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
    }
  }

  if (liveState.mode === "replay") {
    return {
      mode: "replay",
      href: `/events/${slug}/library`,
      label: liveState.headline || "Replay is active",
      description: liveState.message || "Send attendees into the on-demand library.",
    }
  }

  if (liveState.mode === "off_air") {
    return {
      mode: "off_air",
      href: `/events/${slug}`,
      label: liveState.headline || "Off air",
      description: liveState.message || "The event is currently off air. Keep attendees on the event home page.",
    }
  }

  return {
    mode: "lobby",
    href: `/events/${slug}/lobby`,
    label: liveState.headline || "Lobby is active",
    description: liveState.message || "Attendees should stay in the lobby right now.",
  }
}

export function getBreakoutRuntimeStatus(
  breakout: Pick<EventBreakout, "id" | "start_at" | "end_at" | "manual_live">,
  liveState: EventLiveStateRecord | null
): "live" | "starting-soon" | "upcoming" | "ended" {
  if (liveState?.mode === "breakout" && liveState.active_breakout_id === breakout.id) return "live"
  if (breakout.manual_live) return "live"

  const now = Date.now()
  const startMs = breakout.start_at ? new Date(breakout.start_at).getTime() : null
  const endMs = breakout.end_at ? new Date(breakout.end_at).getTime() : null

  if (startMs && endMs && now >= startMs && now <= endMs) return "live"
  if (startMs && now < startMs && startMs - now <= 15 * 60 * 1000) return "starting-soon"
  if (endMs && now > endMs) return "ended"
  return "upcoming"
}
