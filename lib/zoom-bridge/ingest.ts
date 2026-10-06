import "server-only"

function connection() {
  const value = process.env.JUPITER_IO_SRT_URL
  if (!value) return null
  const url = new URL(value)
  if (url.protocol !== "srt:" || !url.hostname || !url.port || url.searchParams.get("mode") !== "caller" || !url.searchParams.get("passphrase")) throw new Error("SRT connection is not configured.")
  return url
}
export function ingestInfo() {
  const url = connection()
  return url ? { configured: true, host: url.hostname, port: Number(url.port) } : { configured: false, host: "", port: 9000 }
}
export function privateIngestUrl() {
  const url = connection()
  if (!url) throw new Error("The OBS connection has not been configured on this Jupiter server.")
  return url.toString()
}
