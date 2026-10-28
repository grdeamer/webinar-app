import { existsSync, readFileSync } from 'node:fs'
import { writePrivateJson } from './localAtomicFile.ts'

export const HA_MAX_GENERATION = 0xffffff
export type HaCandidate = 'primary' | 'standby'
export type CandidateProgress = { revision: number; frames: number; reportedAtMs: number; progressedAtMs: number; error: string | null; assetPositions: Record<string, number> }
export type HaBoundary = { generation: number; selected: HaCandidate; reason: string; atMs: number }
/** Single local authority. Candidates never receive credentials for the audience room. */
export class LocalHaAuthority {
  readonly path: string
  readonly runId: string
  generation = 1
  selected: HaCandidate = 'primary'
  available = true
  running = true
  candidates: Partial<Record<HaCandidate, CandidateProgress>> = {}
  boundaries: HaBoundary[] = []
  private readonly startedAtMs: number
  private readonly requireGateway: boolean
  private gatewayAtMs = 0
  private decoded: Partial<Record<HaCandidate, { frames: number; revision: number | null; lastFrameAtMs: number }>> = {}
  constructor(path: string, runId: string, now = Date.now(), requireGateway = false) {
    this.requireGateway = requireGateway
    this.path = path; this.runId = runId; this.startedAtMs = now
    if (existsSync(path)) {
      const saved = JSON.parse(readFileSync(path, 'utf8'))
      if (saved.schemaVersion !== 1 || !Number.isSafeInteger(saved.generation) || saved.generation < 1 || saved.generation >= HA_MAX_GENERATION || !['primary', 'standby'].includes(saved.selected) || !Array.isArray(saved.boundaries)) throw new Error('Invalid HA journal; refusing to reset fencing generation')
      this.generation = saved.generation + 1; this.selected = saved.selected; this.boundaries = saved.boundaries.slice(-99)
    }
    this.boundary('authority-started; fresh readiness required', now)
  }
  private boundary(reason: string, now: number) {
    if (!Number.isSafeInteger(this.generation) || this.generation < 1 || this.generation > HA_MAX_GENERATION) throw new Error('Fencing generation exhausted; output must stop')
    const boundaries = [...this.boundaries, { generation: this.generation, selected: this.selected, reason, atMs: now }].slice(-100)
    writePrivateJson(this.path, { schemaVersion: 1, generation: this.generation, selected: this.selected, boundaries })
    this.boundaries = boundaries
  }
  observe(candidate: HaCandidate, report: { appliedRevision: number; framesSent: number; error: string | null; assetPositions: Record<string, number> }, desired: number, now = Date.now()) {
    if (!Number.isSafeInteger(report.appliedRevision) || report.appliedRevision < 0 || report.appliedRevision > desired || !Number.isSafeInteger(report.framesSent) || report.framesSent < 0) throw new Error('Invalid HA candidate progress')
    const old = this.candidates[candidate]
    this.candidates[candidate] = { revision: report.appliedRevision, frames: report.framesSent, error: report.error, assetPositions: report.assetPositions, reportedAtMs: now,
      progressedAtMs: !old || report.framesSent > old.frames ? now : old.progressedAtMs }
  }
  ready(candidate: HaCandidate, revision: number, now = Date.now()) {
    const x = this.candidates[candidate]
    return Boolean(x && !x.error && x.revision === revision && x.frames > 0 && now >= x.reportedAtMs && now >= x.progressedAtMs && now - x.reportedAtMs < 1200 && now - x.progressedAtMs < 1200 && this.mediaReady(candidate, revision, now))
  }
  select(candidate: HaCandidate, expectedGeneration: number, revision: number, reason: string, now = Date.now()) {
    if (!this.available || !this.running) throw new Error('Reliable authority is unavailable; promotion blocked')
    if (expectedGeneration !== this.generation) throw new Error('Stale fencing generation; refresh before promotion')
    if (!this.ready(candidate, revision, now)) throw new Error('Standby is not fresh and synchronized to committed state')
    if (this.selected !== candidate) {
      const old = { selected: this.selected, generation: this.generation }
      this.selected = candidate; this.generation++
      try { this.boundary(reason, now) } catch (error) { this.selected = old.selected; this.generation = old.generation; this.available = false; throw error }
    }
    return this.generation
  }
  observeGateway(value: unknown, now = Date.now()) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid decoded candidate telemetry')
    const parsed: typeof this.decoded = {}
    for (const candidate of ['primary', 'standby'] as const) {
      const x = (value as Record<string, { frames: number; revision: number | null; ageMs: number }>)[`candidate-${candidate}`]
      if (!x) continue
      if (!Number.isSafeInteger(x.frames) || x.frames < 0 || !Number.isFinite(x.ageMs) || x.ageMs < 0 || x.ageMs > 600_000 || (x.revision !== null && (!Number.isSafeInteger(x.revision) || x.revision < 0))) throw new Error('Invalid decoded candidate telemetry')
      parsed[candidate] = { frames: x.frames, revision: x.revision, lastFrameAtMs: now - x.ageMs }
    }
    this.decoded = parsed; this.gatewayAtMs = now
  }
  private mediaReady(candidate: HaCandidate, revision: number, now: number) {
    if (!this.requireGateway) return true
    const media = this.decoded[candidate]
    return Boolean(media && media.frames > 0 && media.revision === revision && now >= this.gatewayAtMs && now - this.gatewayAtMs < 500 && now >= media.lastFrameAtMs && now - media.lastFrameAtMs < 350)
  }
  unavailable(candidate: HaCandidate, reason: string) { if (this.candidates[candidate]) this.candidates[candidate]!.error = reason }
  reconcile(revision: number, now = Date.now()) {
    if (!this.running || !this.available || this.ready(this.selected, revision, now)) return
    const active = this.candidates[this.selected]
    // Revision lag alone is not a crash. A fresh independent decode stall is stronger evidence than heartbeat age.
    const decodedStall = this.requireGateway && now - this.gatewayAtMs < 500 && this.decoded[this.selected] && now - this.decoded[this.selected]!.lastFrameAtMs >= 350
    if ((!active && now - this.startedAtMs < 8000) || (!decodedStall && active && !active.error && now - active.reportedAtMs < 1200 && now - active.progressedAtMs < 1200)) return
    const alternative = this.selected === 'primary' ? 'standby' : 'primary'
    if (this.ready(alternative, revision, now)) this.select(alternative, this.generation, revision, 'automatic takeover: active output progress unavailable', now)
  }
  invalidate(reason: string, now = Date.now()) { const old = this.generation; this.generation++; try { this.boundary(reason, now) } catch (error) { this.generation = old; this.available = false; throw error } }
  grant(revision: number, now = Date.now()) {
    if (!this.available || !this.running || !this.ready(this.selected, revision, now)) return null
    return { runId: this.runId, generation: this.generation, candidate: this.selected, identity: `candidate-${this.selected}`, revision, leaseMs: 1000 }
  }
}
