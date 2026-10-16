import "server-only"
import { Client } from "ssh2"

/** A single bounded SSH stream; no media files, database writes or caching. */
export function liveProgram(signal: AbortSignal): ReadableStream<Uint8Array> {
  let close = () => {}
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const client = new Client()
      let done = false
      const finish = () => {
        if (done) return
        done = true; clearTimeout(timer); signal.removeEventListener("abort", finish); client.destroy()
        controller.close()
      }
      close = finish
      const timer = setTimeout(finish, 120000)
      signal.addEventListener("abort", finish, { once: true })
      client.on("ready", () => client.exec("live-preview", (error, stream) => {
        if (error) return finish()
        stream.on("data", (chunk: Buffer) => {
          if (done) return
          // Slow clients are disconnected rather than accumulating media in memory.
          if ((controller.desiredSize ?? 0) < -1000000) return finish()
          controller.enqueue(new Uint8Array(chunk))
        })
        stream.on("close", finish).on("error", finish)
      })).on("error", finish)
      const host = process.env.JUPITER_IO_SNAPSHOT_HOST
      const privateKey = process.env.JUPITER_IO_SNAPSHOT_KEY
      const fingerprint = process.env.JUPITER_IO_SNAPSHOT_HOST_HASH
      if (!host || !privateKey || !fingerprint || signal.aborted) return finish()
      client.connect({ host, username: "ubuntu", privateKey, readyTimeout: 6000, hostHash: "sha256", hostVerifier: (value: string) => value === fingerprint })
    },
    cancel() { close() },
  }, { highWaterMark: 262144, size: chunk => chunk.byteLength })
}
