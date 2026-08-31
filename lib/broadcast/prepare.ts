import "server-only"

import { buildBroadcastOutputUrl, maskBroadcastServerUrl } from "@/lib/broadcast/config"
import { decryptBroadcastSecret } from "@/lib/broadcast/credentials"
import { getPrivateBroadcastDestinations } from "@/lib/broadcast/data"
import { broadcastOutputFingerprint } from "@/lib/broadcast/server"

export type PreparedBroadcastDestination = {
  id: string
  provider: string
  label: string
  outputUrl: string
  outputFingerprint: string
  maskedServerUrl: string
}

export function normalizeDestinationIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))).slice(0, 5)
}

export async function prepareBroadcastDestinations(eventId: string, ids: string[]): Promise<PreparedBroadcastDestination[]> {
  if (ids.length === 0) throw new Error("Select at least one enabled broadcast destination.")

  const rows = await getPrivateBroadcastDestinations(eventId, ids)
  if (rows.length !== ids.length) throw new Error("One or more selected destinations are unavailable or disabled.")

  return rows.map((row) => {
    const outputUrl = buildBroadcastOutputUrl(row.server_url, decryptBroadcastSecret(row.stream_key_ciphertext))
    return {
      id: row.id,
      provider: row.provider,
      label: row.label,
      outputUrl,
      outputFingerprint: broadcastOutputFingerprint(outputUrl),
      maskedServerUrl: maskBroadcastServerUrl(row.server_url),
    }
  })
}
