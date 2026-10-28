import { parentPort, workerData } from "node:worker_threads"
import { commitProductionCommand } from "../../lib/production/commandService.ts"
import { LocalSqliteProductionStore } from "../../lib/production/localSqliteStore.ts"
import type { BroadcastScope, CommandRequest } from "../../lib/production/contracts.ts"

const { filename, request, actorId, scope } = workerData as { filename: string; request: CommandRequest; actorId: string; scope: BroadcastScope }
const store = new LocalSqliteProductionStore(filename)
parentPort?.postMessage({ ready: true })
parentPort?.once("message", () => {
  try {
    const result = commitProductionCommand(store, request, { actorId, scope })
    parentPort?.postMessage({ revision: result.receipt.revision, replayed: result.replayed })
  } catch (error) {
    parentPort?.postMessage({ code: (error as { code?: string }).code })
  } finally { store.close() }
})
