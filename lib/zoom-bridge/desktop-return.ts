import "server-only"
import { Client } from "ssh2"
import { RETURN_SESSION } from "./server-return"

export function desktopConfigured() { return process.env.JUPITER_IO_DESKTOP_MONITOR_ENABLED === "true" }
export type DesktopStatus = { state?: string; error?: string; remainingSeconds?: number; sessionId?: string; meetingId?: string; audio?: boolean }
export async function desktopReturn(action: "status" | "start" | "frame" | "audio" | "stop", sessionId: string | null, body: Record<string, unknown>, signal: AbortSignal): Promise<{ status: DesktopStatus; jpeg?: Buffer; audio?: Buffer; audioSequence?: number }> {
  if (action !== "status" && (!sessionId || !RETURN_SESSION.test(sessionId))) throw new Error("Invalid session")
  if (!["status", "start", "frame", "audio", "stop"].includes(action)) throw new Error("Invalid action")
  const host = process.env.JUPITER_IO_SNAPSHOT_HOST, privateKey = process.env.JUPITER_IO_SNAPSHOT_KEY, fingerprint = process.env.JUPITER_IO_SNAPSHOT_HOST_HASH
  if (!desktopConfigured() || !host || !privateKey || !fingerprint) throw new Error("Desktop is not configured")
  const input = JSON.stringify(body) + "\n"
  if (Buffer.byteLength(input) > 65536) throw new Error("Oversized request")
  return new Promise((resolve, reject) => {
    const client = new Client(), chunks: Buffer[] = []
    let done = false, bytes = 0
    function finish(failed = false) {
      if (done) return
      done = true; clearTimeout(timer); signal.removeEventListener("abort", abort); client.destroy()
      if (failed) return reject(new Error("Desktop receiver unavailable"))
      try {
        const data = Buffer.concat(chunks), split = data.indexOf(10)
        if (split < 0 || split > 4096) throw new Error("Invalid header")
        const header = JSON.parse(data.subarray(0, split).toString())
        const media = data.subarray(split + 1)
        const audio = action === "audio"
        if (audio) {
          if ((header.audioBytes ?? 0) !== media.length || media.length > 192000 || media.length % 48000 !== 0 ||
              (media.length && (!Number.isInteger(header.audioSequence) || header.audioSequence < 1 || header.audioSequence > 900))) {
            throw new Error("Invalid audio")
          }
        } else if ((header.jpegBytes ?? 0) !== media.length ||
            (media.length && (media[0] !== 255 || media[1] !== 216 || media.at(-2) !== 255 || media.at(-1) !== 217))) {
          throw new Error("Invalid frame")
        }
        resolve({ status: {
          state: typeof header.state === "string" ? header.state.slice(0, 32) : undefined,
          error: header.error ? "Desktop receiver unavailable or busy" : undefined,
          remainingSeconds: typeof header.remainingSeconds === "number" ? header.remainingSeconds : 0,
          sessionId: typeof header.sessionId === "string" && RETURN_SESSION.test(header.sessionId) ? header.sessionId : undefined,
          meetingId: typeof header.meetingId === "string" && /^\d{9,11}$/.test(header.meetingId) ? header.meetingId : undefined,
          audio: header.audio === true,
        }, ...(media.length && (audio ? { audio: media, audioSequence: header.audioSequence } : { jpeg: media })) })
      } catch { reject(new Error("Invalid Desktop return")) }
    }
    function abort() { finish(true) }
    const timer = setTimeout(abort, 12000)
    if (signal.aborted) return abort()
    signal.addEventListener("abort", abort, { once: true })
    client.on("ready", () => client.exec(`desktop-return ${action}${action === "status" ? "" : ` ${sessionId}`}`, (error, stream) => {
      if (error) return finish(true)
      stream.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > 505000) finish(true); else chunks.push(chunk) })
      stream.on("close", (code: number) => finish(code !== 0)).on("error", abort)
      stream.end(input)
    })).on("error", abort)
    client.connect({ host, username: "ubuntu", privateKey, hostHash: "sha256", hostVerifier: (value: string) => value === fingerprint, readyTimeout: 6000 })
  })
}
