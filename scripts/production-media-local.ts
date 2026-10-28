import { resolve } from "node:path"
import { LocalSqliteProductionStore } from "../lib/production/localSqliteStore.ts"
import { createLocalWorkbench, seedLocalProduction } from "../lib/production/localWorkbench.ts"
import { LocalMediaSession } from "../lib/production/localMediaSession.ts"
import { LocalMediaRuntime } from "../lib/production/localMediaRuntime.ts"
import { commitProductionCommand } from "../lib/production/commandService.ts"
import { LOCAL_SCOPE } from "../lib/production/localWorkbench.ts"

// All credentials are new local credentials. No .env, production API or cloud setup.
process.umask(0o077)
const directory = resolve(import.meta.dirname, "../.local/production/media")
const store = new LocalSqliteProductionStore(resolve(directory, "control.sqlite"))
seedLocalProduction(store)
if (!store.read(LOCAL_SCOPE).sources['missing-camera']) {
  commitProductionCommand(store, { schemaVersion: 1, scope: LOCAL_SCOPE, commandId: 'parity-missing-source', expectedRevision: store.read(LOCAL_SCOPE).revision,
    command: { type: 'REGISTER_SOURCE', source: { sourceId: 'missing-camera', kind: 'camera', label: 'Unconnected fixture', fallback: 'slate' } } }, { actorId: 'local-setup', scope: LOCAL_SCOPE })
}
const runtime = new LocalMediaRuntime(new LocalMediaSession(store), directory)
const server = createLocalWorkbench(store, runtime.routes)
let stopping = false
async function stop(): Promise<void> {
  if (stopping) return
  stopping = true; await runtime.stop()
  server.closeAllConnections(); server.close(() => store.close())
}
server.on("error", error => { console.error(error.message); void stop(); process.exitCode = 1 })
server.listen(4310, "127.0.0.1", () => {
  console.log("Jupiter local production workbench: http://127.0.0.1:4310")
  console.log("Synthetic sources and optional local assets. No Vercel build, cloud room or camera/microphone access.")
  runtime.start("http://127.0.0.1:4310", process.argv[2]).then(() => console.log("Independent source, compositor and receiver processes started; automatic stop after 30 minutes."))
    .catch(error => { console.error(error.message); process.exitCode = 1; void stop() })
})
process.once("SIGINT", () => void stop())
process.once("SIGTERM", () => void stop())
