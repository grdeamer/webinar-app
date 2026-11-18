import "server-only"
import { Client } from "ssh2"
import { RETURN_SESSION } from "./server-return"

export function rtmsConfigured() { return process.env.JUPITER_IO_RTMS_ENABLED === "true" }
export type RtmsStatus = { state?: string; error?: string; remainingSeconds?: number; accepted?: boolean }
export async function rtmsReturn(action: "event" | "arm" | "frame" | "stop", sessionId: string | null, body: Record<string, unknown>, signal: AbortSignal): Promise<{ status: RtmsStatus; jpeg?: Buffer }> {
  if (action !== "event" && (!sessionId || !RETURN_SESSION.test(sessionId))) throw new Error("Invalid session")
  if (!["event", "arm", "frame", "stop"].includes(action)) throw new Error("Invalid action")
  const host = process.env.JUPITER_IO_SNAPSHOT_HOST, privateKey = process.env.JUPITER_IO_SNAPSHOT_KEY, fingerprint = process.env.JUPITER_IO_SNAPSHOT_HOST_HASH
  if (!rtmsConfigured() || !host || !privateKey || !fingerprint) throw new Error("RTMS is not configured")
  const input = JSON.stringify(body) + "\n"
  if (Buffer.byteLength(input) > 65536) throw new Error("Oversized request")
  return new Promise((resolve, reject) => {
    const client = new Client(), chunks: Buffer[] = []
    let done = false, bytes = 0
    function finish(failed = false) {
      if (done) return
      done = true; clearTimeout(timer); signal.removeEventListener("abort", abort); client.destroy()
      if (failed) return reject(new Error("RTMS receiver unavailable"))
      try {
        const data = Buffer.concat(chunks), split = data.indexOf(10)
        if (split < 0 || split > 4096) throw new Error("Invalid header")
        const header = JSON.parse(data.subarray(0, split).toString()), jpeg = data.subarray(split + 1)
        if ((header.jpegBytes ?? 0) !== jpeg.length || (jpeg.length && (jpeg[0] !== 255 || jpeg[1] !== 216 || jpeg.at(-2) !== 255 || jpeg.at(-1) !== 217))) throw new Error("Invalid frame")
        resolve({ status: {
          state: typeof header.state === "string" ? header.state.slice(0, 32) : undefined,
          error: header.error ? "RTMS receiver unavailable or busy" : undefined,
          remainingSeconds: typeof header.remainingSeconds === "number" ? header.remainingSeconds : 0,
          accepted: header.accepted === true,
        }, jpeg: jpeg.length ? jpeg : undefined })
      } catch { reject(new Error("Invalid RTMS return")) }
    }
    function abort() { finish(true) }
    const timer = setTimeout(abort, 12000)
    if (signal.aborted) return abort()
    signal.addEventListener("abort", abort, { once: true })
    client.on("ready", () => client.exec(`rtms-return ${action}${action === "event" ? "" : ` ${sessionId}`}`, (error, stream) => {
      if (error) return finish(true)
      stream.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > 505000) finish(true); else chunks.push(chunk) })
      stream.on("close", (code: number) => finish(code !== 0)).on("error", abort)
      stream.end(input)
    })).on("error", abort)
    client.connect({ host, username: "ubuntu", privateKey, hostHash: "sha256", hostVerifier: (value: string) => value === fingerprint, readyTimeout: 6000 })
  })
}
