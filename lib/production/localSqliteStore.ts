import { chmodSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { ProductionError, type BroadcastScope, type CommandReceipt, type ProductionState } from "./contracts.ts"
import { initialProductionState, scopesMatch } from "./state.ts"
import { parseScope, revision } from "./validation.ts"
import type { ProductionStore, ProductionTransaction } from "./commandService.ts"

/** Offline adapter only. It imports no app environment, Supabase, or LiveKit code. */
export class LocalSqliteProductionStore implements ProductionStore {
  private db: DatabaseSync

  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true, mode: 0o700 })
    this.db = new DatabaseSync(filename, { timeout: 5000 })
    if (filename !== ":memory:") chmodSync(filename, 0o600)
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS production_snapshots (
        broadcast_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, state_json TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS production_commands (
        broadcast_id TEXT NOT NULL REFERENCES production_snapshots(broadcast_id),
        command_id TEXT NOT NULL, revision INTEGER NOT NULL, receipt_json TEXT NOT NULL,
        PRIMARY KEY (broadcast_id, command_id), UNIQUE (broadcast_id, revision)
      ) STRICT;
    `)
  }

  initialize(scope: BroadcastScope, nowMs = Date.now()): ProductionState {
    const validated = parseScope(scope)
    this.db.exec("BEGIN IMMEDIATE")
    try {
      this.db.prepare("INSERT OR IGNORE INTO production_snapshots VALUES (?, 0, ?)").run(validated.broadcastId, JSON.stringify(initialProductionState(validated, nowMs)))
      const state = this.read(validated)
      this.db.exec("COMMIT")
      return state
    } catch (error) { this.db.exec("ROLLBACK"); throw error }
  }

  read(scope: BroadcastScope): ProductionState {
    const validated = parseScope(scope)
    const row = this.db.prepare("SELECT state_json, revision FROM production_snapshots WHERE broadcast_id = ?").get(validated.broadcastId)
    if (!row) throw new ProductionError("NOT_FOUND", "Local broadcast has not been initialized")
    const state = JSON.parse(String(row.state_json)) as ProductionState
    if (state.schemaVersion !== 1 || state.revision !== row.revision) throw new Error("Unsupported or inconsistent production snapshot")
    if (!scopesMatch(state.scope, validated)) throw new ProductionError("SCOPE_MISMATCH", "Broadcast belongs to another event/session")
    return state
  }

  transaction<T>(scope: BroadcastScope, operation: (tx: ProductionTransaction) => T): T {
    this.db.exec("BEGIN IMMEDIATE")
    try {
      const state = this.read(scope)
      let written = false
      const result = operation({
        state,
        findReceipt: commandId => {
          const row = this.db.prepare("SELECT receipt_json FROM production_commands WHERE broadcast_id = ? AND command_id = ?").get(scope.broadcastId, commandId)
          return row ? JSON.parse(String(row.receipt_json)) as CommandReceipt : null
        },
        commit: (next, receipt) => {
          if (written || next.revision !== state.revision + 1 || receipt.revision !== next.revision || !scopesMatch(next.scope, scope)) throw new Error("Invalid transaction commit")
          written = true
          this.db.prepare("UPDATE production_snapshots SET state_json = ?, revision = ? WHERE broadcast_id = ?").run(JSON.stringify(next), next.revision, scope.broadcastId)
          this.db.prepare("INSERT INTO production_commands VALUES (?, ?, ?, ?)").run(scope.broadcastId, receipt.commandId, receipt.revision, JSON.stringify(receipt))
        },
      })
      if (result instanceof Promise) throw new Error("Production transactions must be synchronous")
      this.db.exec("COMMIT")
      return result
    } catch (error) { this.db.exec("ROLLBACK"); throw error }
  }

  commands(scope: BroadcastScope, afterRevision = 0, limit = 100): CommandReceipt[] {
    this.read(scope)
    revision(afterRevision)
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new ProductionError("INVALID_COMMAND", "Command page limit must be 1-100")
    return this.db.prepare("SELECT receipt_json FROM production_commands WHERE broadcast_id = ? AND revision > ? ORDER BY revision LIMIT ?").all(scope.broadcastId, afterRevision, limit).map(row => JSON.parse(String(row.receipt_json)) as CommandReceipt)
  }

  close(): void { this.db.close() }
}
