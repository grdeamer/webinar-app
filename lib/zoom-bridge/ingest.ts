import "server-only"
import { unseal } from "./server"
import type { SourceRow } from "./source"

function connection() {
  const value = process.env.JUPITER_IO_SRT_URL
  if (!value) return null
  const url = new URL(value)
  if (url.protocol !== "srt:" || !url.hostname || !url.port || url.searchParams.get("mode") !== "caller" || !url.searchParams.get("passphrase")) throw new Error("SRT connection is not configured.")
  return url
}
export function ingestInfo(row?: SourceRow | null) {
  const url = connection()
  return url ? { configured: true, host: url.hostname, port: Number(url.port), keyRevision: row?.ingest_key_revision ?? "legacy", keyUpdatedAt: row?.ingest_key_updated_at ?? null, appliedKeyRevision: row?.observed?.ingestKeyRevision ?? "legacy" } : { configured: false, host: "", port: 9000 }
}
export function privateIngestUrl(row?: SourceRow | null) {
  const url = connection()
  if (!url) throw new Error("The OBS connection has not been configured on this Jupiter server.")
  if (row?.ingest_passphrase_ciphertext) url.searchParams.set("passphrase", unseal(row.ingest_passphrase_ciphertext))
  return url.toString()
}
