/** Gateway enforcement: request-start deadlines cannot be extended by delayed replies. */
export class OutputFence {
  constructor(runId) { this.runId = runId; this.generation = 0; this.revision = 0; this.candidate = null; this.lease = null; this.rejected = 0 }
  accept(value, requestedAt, now) {
    if (!value || value.runId !== this.runId || !['primary', 'standby'].includes(value.candidate) || value.identity !== `candidate-${value.candidate}` || !Number.isSafeInteger(value.generation) || value.generation < 1 || value.generation > 0xffffff || value.generation < this.generation || !Number.isSafeInteger(value.revision) || value.revision < this.revision || value.leaseMs !== 1000 || !Number.isFinite(requestedAt) || !Number.isFinite(now) || requestedAt < 0 || requestedAt > now || now >= requestedAt + value.leaseMs || (value.generation === this.generation && this.candidate !== value.candidate)) { this.rejected++; return false }
    this.generation = value.generation; this.revision = value.revision; this.candidate = value.candidate; this.lease = { ...value, deadline: requestedAt + value.leaseMs }; return true
  }
  selected(now) { return this.lease && now < this.lease.deadline ? this.lease : null }
}
