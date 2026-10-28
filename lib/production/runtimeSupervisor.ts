import type { RuntimeRole } from './localMediaSession.ts'
import type { MediaProgress } from './mediaHealth.ts'

/** Deterministic recovery budget. No process/network operations live here. */
export class RuntimeSupervisor {
  readonly attempts: { role: RuntimeRole; atMs: number; reason: string }[] = []
  readonly launchedAt = new Map<RuntimeRole, number>()
  readonly recovering = new Set<RuntimeRole>()
  launched(role: RuntimeRole, now = Date.now()) { this.launchedAt.set(role, now) }
  stale(role: 'renderer' | 'observer', progress: MediaProgress | null, now = Date.now()): boolean {
    const began = this.launchedAt.get(role)
    if (began === undefined || now - began < 15_000 || this.recovering.has(role)) return false
    return !progress || now - progress.reportedAtMs > 6000 || now - progress.progressedAtMs > 6000
  }
  begin(role: RuntimeRole, reason: string, now = Date.now()): number {
    if (this.recovering.has(role)) throw new Error('Recovery is already in progress')
    const recent = this.attempts.filter(item => item.role === role && now - item.atMs < 300_000)
    if (recent.length >= 2 || this.attempts.length >= 6) throw new Error('Local recovery budget exhausted')
    this.attempts.push({ role, reason, atMs: now }); this.recovering.add(role)
    return Math.min(2000, 500 * 2 ** recent.length)
  }
  end(role: RuntimeRole, now = Date.now()) { this.recovering.delete(role); this.launched(role, now) }
}
