import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { BroadcastScope } from './contracts.ts'
import { ProductionError } from './contracts.ts'
import { parseScope, identifier } from './validation.ts'
import { scopesMatch } from './state.ts'
import { writePrivateJson } from './localAtomicFile.ts'

export type DeliveryState = { scope: BroadcastScope; revision: number; mode: 'legacy' | 'program'; updatedAtMs: number }
type Receipt = { commandId: string; fingerprint: string; revision: number }

/** Single-host local delivery selector. Does not write a production event. */
export class LocalDelivery {
  state: DeliveryState
  private receipts: Receipt[] = []
  readonly path: string
  constructor(path: string, scope: BroadcastScope) {
    this.path = path; this.state = { scope, revision: 0, mode: 'legacy', updatedAtMs: 0 }
    if (existsSync(path)) {
      const saved = JSON.parse(readFileSync(path, 'utf8')) as { state: DeliveryState; receipts: Receipt[] }
      if (!scopesMatch(parseScope(saved.state.scope), scope) || !['legacy', 'program'].includes(saved.state.mode) || !Number.isSafeInteger(saved.state.revision) || saved.state.revision < 0 || !Array.isArray(saved.receipts) || saved.receipts.length > 1000) throw new Error('Local delivery journal requires manual review')
      this.state = saved.state; this.receipts = saved.receipts
    }
  }
  select(value: unknown, ready: boolean): DeliveryState {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid delivery request')
    const x = value as Record<string, unknown>, scope = parseScope(x.scope), commandId = identifier(x.commandId)
    if (!scopesMatch(scope, this.state.scope)) throw new ProductionError('SCOPE_MISMATCH', 'Delivery selector belongs to another local event')
    if (!['legacy', 'program'].includes(String(x.mode)) || !Number.isSafeInteger(x.expectedRevision) || Number(x.expectedRevision) < 0) throw new Error('Delivery mode and expected revision are required')
    const fingerprint = createHash('sha256').update(JSON.stringify({ scope, mode: x.mode, expectedRevision: x.expectedRevision })).digest('hex')
    const previous = this.receipts.find(item => item.commandId === commandId)
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new ProductionError('COMMAND_ID_REUSED', 'Delivery command ID reused with different intent')
      return structuredClone(this.state)
    }
    if (x.expectedRevision !== this.state.revision) throw new ProductionError('REVISION_CONFLICT', 'Delivery selection changed; refresh before retrying')
    if (x.mode === 'program' && !ready) throw new Error('A live, current and independently observed Program is required before local cutover')
    if (this.receipts.length >= 1000) throw new Error('Local delivery journal limit reached')
    const next: DeliveryState = { ...this.state, revision: this.state.revision + 1, mode: x.mode as 'legacy' | 'program', updatedAtMs: Date.now() }
    const receipts = [...this.receipts, { commandId, fingerprint, revision: next.revision }]
    writePrivateJson(this.path, { state: next, receipts }); this.state = next; this.receipts = receipts
    return structuredClone(next)
  }
}
