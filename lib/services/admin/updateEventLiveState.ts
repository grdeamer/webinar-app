import { supabaseAdmin } from "@/lib/supabase/admin"
import { getSessionById } from "@/lib/repos/sessionsRepo"
import type { UpdateLegacyEventLiveStateInput } from "@/lib/validators/liveRouting"

export async function updateEventLiveState(
  input: UpdateLegacyEventLiveStateInput
) {
  const mode = input.mode
  const breakoutId = input.breakoutId ?? null
  const forceRedirect = !!input.forceRedirect

  if (mode === "breakout") {
    if (!breakoutId) {
      throw new Error("Missing breakoutId for breakout mode")
    }

    const session = await getSessionById(input.eventId, breakoutId)
    if (!session) {
      throw new Error("Target breakout session not found for this event")
    }
  }

  const row = {
    event_id: input.eventId,
    mode,
    breakout_id: mode === "breakout" ? breakoutId : null,
    force_redirect: forceRedirect,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .upsert(row, { onConflict: "event_id" })
    .select("id,event_id,mode,breakout_id,force_redirect,updated_at")
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to update event live state: ${error.message}`)
  }

  try {
    await supabaseAdmin
      .from("refresh_signals")
      .insert({
        scope_type: "event",
        scope_id: input.eventId,
        refresh_token: crypto.randomUUID(),
      })
      .select("id")
      .maybeSingle()
  } catch {
    // ignore refresh signal failures
  }

  return data
}