import { randomUUID, createHash } from "node:crypto"
import { existsSync, mkdirSync, statSync, readFileSync, openSync, writeSync, fsyncSync, closeSync } from "node:fs"
import { join } from "node:path"
import { writePrivateJson } from './localAtomicFile.ts'

export type ProgramOrigin = { runId: string; broadcastId: string; generation: number; publisherIdentity: string; videoTrackSid: string; audioTrackSid: string; programRevision: number; deliveryRevision: number }
export type LocalRecording = { id: string; status: "recording" | "complete" | "failed"; startedAtMs: number; endedAtMs: number | null; bytes: number; nextChunk: number; reason?: string; sha256?: string; origin?: ProgramOrigin; observedRevisions?: number[] }

/** Opt-in recording of the received synthetic Program. Not used for monitoring. */
export class LocalProgramRecording {
  job: LocalRecording | null = null
  readonly directory: string
  readonly history: LocalRecording[] = []
  constructor(directory: string) {
    this.directory = directory; mkdirSync(directory, { recursive: true, mode: 0o700 })
    const path = join(directory, 'journal.json')
    if (existsSync(path)) {
      const rows = JSON.parse(readFileSync(path, 'utf8')) as LocalRecording[]
      if (!Array.isArray(rows) || rows.length > 100 || rows.some(row => !row || !/^[a-f0-9-]{36}$/.test(row.id) || !['recording', 'complete', 'failed'].includes(row.status) || !Number.isSafeInteger(row.bytes) || row.bytes < 0 || row.bytes > 50_000_000)) throw new Error('Local recording journal requires manual review')
      this.history.push(...rows)
      for (const row of this.history) {
        const file = join(directory, `${row.id}.webm`)
        if (row.status === 'recording') { row.status = 'failed'; row.reason = 'Host interrupted before recording completion'; row.endedAtMs = Date.now() }
        if (row.status === 'complete' && (!existsSync(file) || statSync(file).size !== row.bytes || !row.sha256 || this.digest(file) !== row.sha256)) { row.status = 'failed'; row.reason = 'Recording file does not match its completed journal'; row.endedAtMs = Date.now() }
      }
      this.job = this.history.at(-1) ?? null; this.persist()
    }
  }
  private digest(path: string) { return createHash('sha256').update(readFileSync(path)).digest('hex') }
  private persist() { writePrivateJson(join(this.directory, 'journal.json'), this.history) }

  start(nowMs = Date.now(), origin?: ProgramOrigin): LocalRecording {
    if (this.job?.status === "recording") throw new Error("A local recording is already active")
    if (this.history.length >= 100) throw new Error('Local recording journal limit reached')
    mkdirSync(this.directory, { recursive: true, mode: 0o700 })
    this.job = { id: randomUUID(), status: "recording", startedAtMs: nowMs, endedAtMs: null, bytes: 0, nextChunk: 0 }
    if (origin) { this.job.origin = structuredClone(origin); this.job.observedRevisions = [] }
    this.history.push(this.job); this.persist()
    return structuredClone(this.job)
  }

  observe(origin: { generation: number; videoTrackSid: string | null; audioTrackSid: string | null; decodedRevision: number | null }) {
    const job = this.job
    if (job?.status !== 'recording' || !job.origin) return
    if (origin.generation !== job.origin.generation || origin.videoTrackSid !== job.origin.videoTrackSid || origin.audioTrackSid !== job.origin.audioTrackSid) { this.fail('Finished Program publication changed during recording'); return }
    if (origin.decodedRevision !== null && !job.observedRevisions!.includes(origin.decodedRevision)) {
      if (job.observedRevisions!.length >= 1000) { this.fail('Recording revision evidence limit reached'); return }
      job.observedRevisions!.push(origin.decodedRevision); this.persist()
    }
  }

  append(id: string, sequence: number, data: Buffer, nowMs = Date.now()): void {
    const job = this.job
    if (!job || job.id !== id || job.status !== "recording" || sequence !== job.nextChunk) throw new Error("Unexpected recording chunk")
    if (data.length > 2_000_000 || job.bytes + data.length > 50_000_000 || nowMs - job.startedAtMs > 185_000) {
      this.fail(); throw new Error("Local recording limit reached")
    }
    const fd = openSync(this.path(id), 'a', 0o600)
    try { let written = 0; while (written < data.length) written += writeSync(fd, data, written, data.length - written); fsyncSync(fd) } finally { closeSync(fd) }
    job.bytes += data.length; job.nextChunk++; this.persist()
  }

  finish(id: string, nowMs = Date.now()): void {
    if (!this.job || this.job.id !== id || this.job.status !== "recording" || this.job.bytes === 0) throw new Error("No received Program recording to finish")
    if (statSync(this.path(id)).size !== this.job.bytes) { this.fail('Recording file size mismatch'); throw new Error('Recording file size mismatch') }
    this.job.sha256 = this.digest(this.path(id))
    this.job.status = "complete"; this.job.endedAtMs = nowMs
    this.persist()
  }

  fail(reason = 'Local recording interrupted'): void { if (this.job?.status === "recording") { this.job.status = "failed"; this.job.reason = reason; this.job.endedAtMs = Date.now(); this.persist() } }

  path(id: string): string {
    if (!this.history.some(job => job.id === id)) throw new Error("Unknown recording")
    return join(this.directory, `${id}.webm`)
  }

  downloadable(id: string): string {
    const job = this.history.find(job => job.id === id)
    if (!job || job.status !== 'complete' || !existsSync(this.path(id)) || statSync(this.path(id)).size !== job.bytes || !job.sha256 || this.digest(this.path(id)) !== job.sha256) throw new Error("Recording is not complete")
    return this.path(id)
  }
}
