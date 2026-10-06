import "server-only"
import { Client } from "ssh2"
export async function programSnapshot(): Promise<Buffer> {
  const host = process.env.JUPITER_IO_SNAPSHOT_HOST
  const privateKey = process.env.JUPITER_IO_SNAPSHOT_KEY
  const fingerprint = process.env.JUPITER_IO_SNAPSHOT_HOST_HASH
  if (!host || !privateKey || !fingerprint) throw new Error("Snapshot connection is not configured")
  return new Promise((resolve, reject) => {
    const client = new Client()
    const chunks: Buffer[] = []
    let size = 0, done = false
    const finish = (error?: Error) => {
      if (done) return
      done = true; clearTimeout(timer); client.end()
      if (error) return reject(error)
      const jpeg = Buffer.concat(chunks)
      if (jpeg.length < 4 || jpeg[0] !== 255 || jpeg[1] !== 216 || jpeg.at(-2) !== 255 || jpeg.at(-1) !== 217) return reject(new Error("No fresh program picture"))
      resolve(jpeg)
    }
    const timer = setTimeout(() => finish(new Error("Snapshot timed out")), 10000)
    client.on("ready", () => client.exec("snapshot", (error, stream) => {
      if (error) return finish(new Error("Snapshot unavailable"))
      stream.on("data", (data: Buffer) => { size += data.length; if (size > 1000000) finish(new Error("Snapshot too large")); else chunks.push(data) })
      stream.on("close", (code: number) => finish(code === 0 ? undefined : new Error("No fresh program picture")))
      stream.on("error", () => finish(new Error("Snapshot interrupted")))
    })).on("error", () => finish(new Error("Snapshot connection unavailable")))
    client.connect({ host, port: 22, username: "ubuntu", privateKey, readyTimeout: 6000, hostHash: "sha256", hostVerifier: (value: string) => value === fingerprint })
  })
}
