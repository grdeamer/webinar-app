import "server-only"
import { Client } from "ssh2"

export const RETURN_SESSION = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export type ReturnAction = "start" | "status" | "frame" | "stop"
export type ReturnStatus = { state?: string; frameAgeMs?: number | null; remainingSeconds?: number; error?: string; recording?: boolean; audio?: boolean }
export function serverReturnConfigured() {
  return process.env.JUPITER_IO_SERVER_MONITOR_ENABLED === "true"
}
/** Exact allowlisted commands over the existing pinned, forced-command SSH key. */
export async function serverReturn(action: ReturnAction, sessionId: string, signal: AbortSignal, joinUrl?: string, termsAccepted = false): Promise<{ status: ReturnStatus; jpeg?: Buffer }> {
  if (!RETURN_SESSION.test(sessionId) || !["start", "status", "frame", "stop"].includes(action)) throw new Error("Invalid monitor request")
  const host = process.env.JUPITER_IO_SNAPSHOT_HOST, privateKey = process.env.JUPITER_IO_SNAPSHOT_KEY
  const fingerprint = process.env.JUPITER_IO_SNAPSHOT_HOST_HASH
  if (!serverReturnConfigured() || !host || !privateKey || !fingerprint) throw new Error("Server monitor is not configured")
  return new Promise((resolve, reject) => {
    const client = new Client(), chunks: Buffer[] = []
    let done = false, size = 0
    function finish(failed = false) {
      if (done) return
      done = true; clearTimeout(timer); signal.removeEventListener("abort", abort); client.destroy()
      if (failed) return reject(new Error("Server monitor unavailable"))
      try {
        const all = Buffer.concat(chunks), split = all.indexOf(10)
        if (split < 0 || split > 4096) throw new Error("Invalid header")
        const header = JSON.parse(all.subarray(0, split).toString("utf8"))
        const jpeg = all.subarray(split + 1)
        if (header.jpegBytes !== undefined && (!Number.isInteger(header.jpegBytes) || header.jpegBytes !== jpeg.length)) throw new Error("Invalid frame length")
        if (jpeg.length && (jpeg[0] !== 255 || jpeg[1] !== 216 || jpeg.at(-2) !== 255 || jpeg.at(-1) !== 217)) throw new Error("Invalid frame")
        // Return only bounded known metadata; never remote diagnostics or credentials.
        const status: ReturnStatus = {
          state: typeof header.state === "string" ? header.state.slice(0, 32) : undefined,
          frameAgeMs: typeof header.frameAgeMs === "number" ? header.frameAgeMs : null,
          remainingSeconds: typeof header.remainingSeconds === "number" ? header.remainingSeconds : 0,
          error: header.error ? "Server return is not available. Check receiver status." : undefined,
          recording: false, audio: false,
        }
        resolve({ status, jpeg: jpeg.length ? jpeg : undefined })
      } catch { reject(new Error("Invalid server return")) }
    }
    function abort() { finish(true) }
    const timer = setTimeout(abort, 12000)
    if (signal.aborted) return abort()
    signal.addEventListener("abort", abort, { once: true })
    client.on("ready", () => client.exec(`meeting-return ${action} ${sessionId}`, (error, stream) => {
      if (error) return finish(true)
      stream.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 505000) finish(true); else chunks.push(chunk) })
      stream.on("close", (code: number) => finish(code !== 0)).on("error", abort)
      if (action === "start") stream.end(JSON.stringify({ joinUrl, termsAccepted }) + "\n")
      else stream.end()
    })).on("error", abort)
    client.connect({ host, username: "ubuntu", privateKey, hostHash: "sha256", hostVerifier: (value: string) => value === fingerprint, readyTimeout: 6000 })
  })
}
