import { supabaseAdmin } from "@/lib/supabase/admin"

export type EventLiveStateRow = {
  id?: string
  event_id: string
  mode: string | null
  active_breakout_id: string | null
  headline: string | null
  message: string | null
  force_redirect: boolean | null
  updated_at?: string | null
  updated_by?: string | null
}

export async function getEventLiveState(eventId: string): Promise<EventLiveStateRow | null> {
  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load event live state: ${error.message}`)
  }

  return data ?? null
}