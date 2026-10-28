import type { LocalProfile } from './localScale.ts'
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto"
import { AccessToken, TrackSource } from "livekit-server-sdk"
import { commitProductionCommand } from "./commandService.ts"
import type { EngineObservation } from "./contracts.ts"
import { LOCAL_SCOPE } from "./localWorkbench.ts"
import type { LocalSqliteProductionStore } from "./localSqliteStore.ts"
import { mediaIsFresh, parseMediaReport, updateMediaProgress, type MediaProgress } from "./mediaHealth.ts"

export type RuntimeRole = "source-a" | "source-b" | "renderer" | "observer"

/** Ephemeral local capability state. Never reads production environment credentials. */
export class LocalMediaSession {
  readonly runId = randomUUID()
  readonly apiKey = "jupiter-local"
  readonly apiSecret = randomBytes(32).toString("hex")
  readonly inputRoom = `local-input-${this.runId}`
  readonly programRoom = `local-program-${this.runId}`
  readonly expiresAtMs: number
  readonly caps: Record<RuntimeRole, string> = { "source-a": randomBytes(32).toString("hex"), "source-b": randomBytes(32).toString("hex"), renderer: randomBytes(32).toString("hex"), observer: randomBytes(32).toString("hex") }
  renderer: MediaProgress | null = null
  observer: MediaProgress | null = null
  sources: Record<string, { frames: number; progressedAtMs: number; videoTrackSid: string }> = {}
  encodingProfile: LocalProfile = 'standard'
  encodingApplied: { profile: LocalProfile; generation: number; atMs: number } | null = null
  generation = 1
  running = true
  failure: string | null = null
  restarts = 0
  faults: Partial<Record<RuntimeRole, boolean>> = {}
  credentialEpochs: Record<RuntimeRole, number> = { 'source-a': 1, 'source-b': 1, renderer: 1, observer: 1 }
  supervisor: { attempts: unknown[]; events: { atMs: number; role: string; event: string }[] } = { attempts: [], events: [] }
  sourcePaused: Record<string, boolean> = { 'camera-a': false, 'camera-b': false }
  readonly store: LocalSqliteProductionStore

  constructor(store: LocalSqliteProductionStore, durationMs = 30 * 60_000) {
    this.store = store
    if (durationMs < 10_000 || durationMs > 30 * 60_000) throw new Error("Local runtime must be bounded to 10 seconds-30 minutes")
    this.expiresAtMs = Date.now() + durationMs
  }

  authorized(role: RuntimeRole, supplied: unknown): boolean {
    if (!this.running || Date.now() >= this.expiresAtMs || !Object.hasOwn(this.caps, role)) return false
    if (typeof supplied !== "string" || supplied.length !== this.caps[role].length) return false
    const actual = Buffer.from(supplied), expected = Buffer.from(this.caps[role])
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }

  rotateCapability(role: RuntimeRole) { this.caps[role] = randomBytes(32).toString('hex'); this.credentialEpochs[role]++ }

  async token(role: string, supplied: unknown): Promise<{ token: string; url: string; sourceId: string | null; identity: string }> {
    if (!["viewer", "audience", "preview", "source-a", "source-b", "renderer-input", "renderer-output", "observer"].includes(role)) throw new Error("Unknown local media role")
    const isViewer = role === "viewer" || role === "preview" || role === 'audience'
    const capRole: RuntimeRole = role.startsWith("renderer-") ? "renderer" : role as RuntimeRole
    if (!isViewer && (!Object.hasOwn(this.caps, capRole) || !this.authorized(capRole, supplied))) throw new Error("Runtime capability required")
    if (!this.running || Date.now() >= this.expiresAtMs) throw new Error("Local media session has ended")
    const sourceId = role === "source-a" ? "camera-a" : role === "source-b" ? "camera-b" : null
    const input = Boolean(sourceId) || role === "renderer-input" || role === "preview"
    const publisher = Boolean(sourceId) || role === "renderer-output"
    const identity = sourceId ? `source-${sourceId}` : role === "renderer-output" ? `program-engine-${this.generation}` : `${role}-${randomUUID()}`
    const token = new AccessToken(this.apiKey, this.apiSecret, { identity, ttl: Math.max(1, Math.min(isViewer ? 120 : 600, Math.floor((this.expiresAtMs - Date.now()) / 1000))) })
    token.addGrant({ roomJoin: true, room: input ? this.inputRoom : this.programRoom, canPublish: publisher, canSubscribe: !publisher, canPublishData: false, canUpdateOwnMetadata: false,
      ...(publisher ? { canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE] } : {}) })
    return { token: await token.toJwt(), url: "ws://127.0.0.1:7880", sourceId, identity }
  }

  report(role: "renderer" | "observer", value: unknown): void {
    const report = parseMediaReport(value)
    const desired = this.store.read(LOCAL_SCOPE).revision
    if (report.appliedRevision > desired || (report.decodedRevision !== null && report.decodedRevision > desired)) throw new Error("Media acknowledged a future revision")
    this[role] = updateMediaProgress(this[role], report, Date.now(), role === "observer")
  }

  sourceReady(role: "source-a" | "source-b", value: unknown): void {
    const x = value as { frames?: unknown; videoTrackSid?: unknown }
    if (!x || typeof x.frames !== "number" || !Number.isSafeInteger(x.frames) || x.frames < 0 || typeof x.videoTrackSid !== "string" || !/^TR_[\w-]+$/.test(x.videoTrackSid)) throw new Error("Invalid source telemetry")
    const sourceId = role === "source-a" ? "camera-a" : "camera-b"
    const old = this.sources[sourceId]
    this.sources[sourceId] = { frames: x.frames, videoTrackSid: x.videoTrackSid, progressedAtMs: x.videoTrackSid !== old?.videoTrackSid || x.frames > (old?.frames ?? -1) ? Date.now() : old?.progressedAtMs ?? 0 }
    const state = this.store.read(LOCAL_SCOPE)
    if (state.bindings[sourceId]?.trackSid === x.videoTrackSid) return
    commitProductionCommand(this.store, { schemaVersion: 1, scope: LOCAL_SCOPE, commandId: `bind-${this.runId}-${sourceId}-${x.videoTrackSid}`, expectedRevision: state.revision,
      command: { type: "BIND_SOURCE", sourceId, participantIdentity: `source-${sourceId}`, trackSid: x.videoTrackSid } }, { actorId: "local-source-service", scope: LOCAL_SCOPE })
  }

  observation(nowMs = Date.now()): EngineObservation {
    const sent = mediaIsFresh(this.renderer, nowMs)
    const received = mediaIsFresh(this.observer, nowMs) && this.observer?.report.generation === this.generation
    return { broadcastId: LOCAL_SCOPE.broadcastId, generation: this.generation,
      appliedRevision: this.renderer?.report.appliedRevision ?? null,
      observedRevision: received && (this.observer?.report.decodedRevision ?? Infinity) <= (this.renderer?.report.appliedRevision ?? -1) ? this.observer?.report.decodedRevision ?? null : null,
      heartbeatAtMs: this.renderer?.reportedAtMs ?? 0,
      videoFramesSent: this.renderer?.report.framesSent ?? 0, audioSamplesSent: null,
      status: !this.running ? "stopped" : sent && received && !this.failure && !this.renderer?.report.error && !this.observer?.report.error ? "healthy" : this.renderer ? "degraded" : "starting" }
  }

  publicStatus() {
    return { runId: this.runId, running: this.running, expiresAtMs: this.expiresAtMs, engine: this.observation(),
      renderer: this.renderer, observer: this.observer, sources: this.sources, sourcePaused: this.sourcePaused, restarts: this.restarts, failure: this.failure, credentialEpochs: this.credentialEpochs, supervisor: this.supervisor,
      recordingEnabled: false, target: { width: 1280, height: 720, fps: 30 }, syntheticOnly: !this.store.read(LOCAL_SCOPE).program.composition.layers.some(layer => String(layer.props.assetId).startsWith('asset-')) }
  }
}
