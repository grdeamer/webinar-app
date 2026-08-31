import "server-only"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { type BroadcastDestination, type BroadcastProvider } from "@/lib/broadcast/config"

export type BroadcastDestinationRow = {
  id: string
  event_id: string
  provider: BroadcastProvider
  label: string
  server_url: string
  stream_key_ciphertext: string
  stream_key_hint: string
  enabled: boolean
  reusable: boolean
  status: "ready" | "disabled" | "error"
  last_tested_at: string | null
  created_at: string
  updated_at: string
}

const safeDestinationColumns = "id,event_id,provider,label,server_url,stream_key_hint,enabled,reusable,status,last_tested_at,created_at,updated_at"
const privateDestinationColumns = `${safeDestinationColumns},stream_key_ciphertext`

export function toBroadcastDestination(row: Omit<BroadcastDestinationRow, "stream_key_ciphertext">): BroadcastDestination {
  return {
    id: row.id,
    eventId: row.event_id,
    provider: row.provider,
    label: row.label,
    serverUrl: row.server_url,
    enabled: row.enabled,
    reusable: row.reusable,
    status: row.status,
    maskedStreamKey: `••••••••${row.stream_key_hint}`,
    hasStreamKey: Boolean(row.stream_key_hint),
    lastTestedAt: row.last_tested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listBroadcastDestinations(eventId: string): Promise<BroadcastDestination[]> {
  const { data, error } = await supabaseAdmin
    .from("event_broadcast_destinations")
    .select(safeDestinationColumns)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Omit<BroadcastDestinationRow, "stream_key_ciphertext">[]).map(toBroadcastDestination)
}

export async function getPrivateBroadcastDestinations(eventId: string, ids: string[]): Promise<BroadcastDestinationRow[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from("event_broadcast_destinations")
    .select(privateDestinationColumns)
    .eq("event_id", eventId)
    .eq("enabled", true)
    .in("id", ids)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as BroadcastDestinationRow[]
}
