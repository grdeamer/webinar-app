import { createHash } from "node:crypto"
import { ProductionError, type BroadcastScope, type CommandActor, type CommandReceipt, type CommitResult, type ProductionState } from "./contracts.ts"
import { applyProductionCommand, scopesMatch } from "./state.ts"
import { identifier, parseCommandRequest } from "./validation.ts"

export type ProductionTransaction = {
  state: ProductionState
  findReceipt(commandId: string): CommandReceipt | null
  commit(state: ProductionState, receipt: CommandReceipt): void
}

/** Local transaction seam. Remote adapters implement ProductionCommandGateway. */
export interface ProductionStore {
  transaction<T>(scope: BroadcastScope, operation: (tx: ProductionTransaction) => T): T
  read(scope: BroadcastScope): ProductionState
  commands(scope: BroadcastScope, afterRevision?: number, limit?: number): CommandReceipt[]
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`
  return JSON.stringify(value)
}

export function commitProductionCommand(store: ProductionStore, input: unknown, actor: CommandActor, nowMs = Date.now()): CommitResult {
  const request = parseCommandRequest(input)
  identifier(actor.actorId)
  if (!scopesMatch(request.scope, actor.scope)) throw new ProductionError("SCOPE_MISMATCH", "Command is outside the authorized broadcast")
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new ProductionError("INVALID_COMMAND", "Invalid server timestamp")
  const fingerprint = createHash("sha256").update(canonical({ request, actorId: actor.actorId })).digest("hex")
  return store.transaction<CommitResult>(request.scope, tx => {
    // Under the same lock as the update: simultaneous retries cannot double-TAKE.
    const existing = tx.findReceipt(request.commandId)
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new ProductionError("COMMAND_ID_REUSED", "Command ID was already used for different content or actor")
      return { receipt: existing, currentState: structuredClone(tx.state), replayed: true, engine: null }
    }
    if (tx.state.revision !== request.expectedRevision) throw new ProductionError("REVISION_CONFLICT", "Production changed on another console; reload before continuing")
    const state = applyProductionCommand(tx.state, request.command, nowMs)
    const receipt: CommandReceipt = { commandId: request.commandId, actorId: actor.actorId, expectedRevision: request.expectedRevision, revision: state.revision, committedAtMs: nowMs, command: request.command, fingerprint }
    tx.commit(state, receipt)
    return { receipt: structuredClone(receipt), currentState: structuredClone(state), replayed: false, engine: null }
  })
}
