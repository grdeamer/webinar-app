import { resolve } from "node:path"
import { LocalSqliteProductionStore } from "../lib/production/localSqliteStore.ts"
import { createLocalWorkbench, seedLocalProduction } from "../lib/production/localWorkbench.ts"

// Intentionally no dotenv, Next.js, Supabase, AWS, or LiveKit initialization.
const port = Number(process.argv[2] ?? 4310)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Pass a local port between 1024 and 65535")
process.umask(0o077)
const store = new LocalSqliteProductionStore(resolve(import.meta.dirname, "../.local/production/control.sqlite"))
seedLocalProduction(store)
const server = createLocalWorkbench(store)
server.on("error", error => { store.close(); console.error(error.message); process.exitCode = 1 })
server.listen(port, "127.0.0.1", () => {
  console.log(`Jupiter Phase 1: http://127.0.0.1:${port}`)
  console.log("Local state-only workbench. No media, production services, or deployment.")
})
function stop(): void { server.close(() => { store.close() }) }
process.once("SIGINT", stop)
process.once("SIGTERM", stop)
