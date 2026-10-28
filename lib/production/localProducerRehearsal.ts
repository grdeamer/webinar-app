import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { LocalHaRuntime } from './localHaRuntime.ts'
import { LOCAL_SCOPE } from './localWorkbench.ts'
import { commitProductionCommand } from './commandService.ts'
import { ProductionError, type ProductionCommand } from './contracts.ts'
import { identifier } from './validation.ts'

type SourceRole = 'source-a' | 'source-b'
type Lease = { capability: string; kind: 'camera' | 'screen' | 'file'; expiresAtMs: number; sid: string | null }
export function rehearsalCommandAllowed(command: ProductionCommand) {
  if (!['SET_PREVIEW', 'TAKE', 'SET_AUDIO', 'SAVE_SCENE', 'LOAD_SCENE', 'SET_LIVE'].includes(command?.type)) throw new Error('This rehearsal supports composition, TAKE, audio, scenes and local live controls only')
  if (command.type === 'TAKE' && !['cut', 'fade'].includes(command.transition.type)) throw new Error('Only qualified cut/fade transitions are enabled')
  if (command.type === 'SET_PREVIEW') for (const layer of command.composition.layers) {
    if (!['camera', 'screen', 'text', 'image'].includes(layer.kind) || (layer.kind === 'image' && layer.props.assetId !== 'brand-mark') || (layer.sourceId && !['camera-a', 'camera-b'].includes(layer.sourceId))) throw new Error('Only local input A/B, text and the bundled logo are enabled; media files are ephemeral source inputs')
  }
}
/** Same-origin loopback operator adapter. Capture credentials never enter durable show state. */
export class LocalProducerRehearsal {
  readonly runtime: LocalHaRuntime
  private leases = new Map<SourceRole, Lease>()
  private sourceBusy = new Set<SourceRole>()
  private timer: ReturnType<typeof setInterval>
  constructor(runtime: LocalHaRuntime) {
    if (!runtime.rehearsal) throw new Error('Explicit rehearsal runtime required')
    this.runtime = runtime
    this.timer = setInterval(() => {
      for (const [role, lease] of this.leases) if (Date.now() >= lease.expiresAtMs && !this.sourceBusy.has(role)) void this.release(role).catch(() => {})
    }, 1000)
  }
  private sourceId(role: SourceRole) { return role === 'source-a' ? 'camera-a' : 'camera-b' }
  private unbind(role: SourceRole) {
    const state = this.runtime.store.read(LOCAL_SCOPE), sourceId = this.sourceId(role), binding = state.bindings[sourceId]
    delete this.runtime.session.sources[sourceId]; delete this.runtime.sourceMedia[role]
    if (binding) commitProductionCommand(this.runtime.store, { schemaVersion: 1, scope: LOCAL_SCOPE, commandId: randomUUID(), expectedRevision: state.revision, command: { type: 'UNBIND_SOURCE', sourceId, expectedGeneration: binding.generation } }, { actorId: 'local-rehearsal-input', scope: LOCAL_SCOPE })
  }
  private authorized(role: SourceRole, capability: unknown) {
    const lease = this.leases.get(role)
    if (!lease || Date.now() >= lease.expiresAtMs || typeof capability !== 'string' || capability.length !== lease.capability.length || !timingSafeEqual(Buffer.from(capability), Buffer.from(lease.capability))) throw new Error('Current input ownership lease required')
    return lease
  }
  private async release(role: SourceRole) {
    this.sourceBusy.add(role)
    try { this.leases.delete(role); if (this.runtime.running) await this.runtime.replaceDemoSource(role); this.unbind(role) }
    finally { this.sourceBusy.delete(role) }
  }
  async stop() { clearInterval(this.timer); this.leases.clear(); await this.runtime.stop() }
  async handle(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const url = new URL(request.url || '/', 'http://127.0.0.1:4311'), path = url.pathname
    const staticFiles: Record<string, [string, string]> = { '/': ['producer.html', 'text/html'], '/producer': ['producer.html', 'text/html'], '/producer-room.js': ['producer-room.js', 'text/javascript'], '/producer-input.js': ['producer-input.js', 'text/javascript'], '/producer.css': ['producer.css', 'text/css'] }
    if (!Object.hasOwn(staticFiles, path) && !path.startsWith('/api/producer/')) return false
    const send = (status: number, value: unknown) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(value)) }
    try {
      if (request.socket.localAddress !== '127.0.0.1' || request.headers.host !== '127.0.0.1:4311' || request.headers['sec-fetch-site'] === 'cross-site' || (request.headers.origin && request.headers.origin !== 'http://127.0.0.1:4311')) throw new Error('Same-origin loopback required')
      if (request.method === 'GET' && Object.hasOwn(staticFiles, path)) {
        const [file, mime] = staticFiles[path]
        response.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; connect-src 'self' ws://127.0.0.1:7980; media-src 'self' blob:; img-src 'self' blob:; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'", 'Permissions-Policy': 'camera=(self), microphone=(self), display-capture=(self)' }); response.end(readFileSync(resolve(import.meta.dirname, '../../tools/production-local', file))); return true
      }
      if (request.method === 'GET' && path === '/api/producer/status') {
        send(200, { runtime: this.runtime.status(), state: this.runtime.store.read(LOCAL_SCOPE), sourceReports: this.runtime.session.sources, sources: Object.fromEntries((['source-a', 'source-b'] as const).map(role => [role, { kind: this.leases.get(role)?.kind || (this.runtime.sourceMedia[role] ? 'demo' : 'disconnected'), leaseExpiresAtMs: this.leases.get(role)?.expiresAtMs ?? null }])), recordingEnabled: false, externalServices: false }); return true
      }
      if (request.method !== 'POST' || request.headers['x-jupiter-local'] !== 'producer-rehearsal' || !request.headers['content-type']?.startsWith('application/json')) throw new Error('Local producer JSON header required')
      let body = ''; for await (const chunk of request) { body += String(chunk); if (body.length > 80_000) throw new Error('Request too large') }; const x = JSON.parse(body)
      if (x.runId !== this.runtime.runId || !this.runtime.running || Date.now() >= this.runtime.expiresAtMs) throw new Error('Current running rehearsal required')
      if (path === '/api/producer/command') {
        rehearsalCommandAllowed(x.command)
        const result = commitProductionCommand(this.runtime.store, { schemaVersion: 1, scope: LOCAL_SCOPE, commandId: x.commandId, expectedRevision: x.expectedRevision, command: x.command }, { actorId: identifier(x.consoleId), scope: LOCAL_SCOPE }); send(200, result); return true
      }
      if (path === '/api/producer/viewer') { if (!['input', 'program'].includes(x.room)) throw new Error('Unknown preview room'); send(200, await this.runtime.rehearsalViewerToken(x.room)); return true }
      if (path === '/api/producer/input') {
        if (!['source-a', 'source-b'].includes(x.role)) throw new Error('Unknown local input')
        const role = x.role as SourceRole
        if (this.sourceBusy.has(role)) throw new Error('Input operation already in progress')
        if (x.action === 'claim') {
          if (!['camera', 'screen', 'file'].includes(x.kind)) throw new Error('Unknown input kind')
          if (this.leases.has(role)) throw new Error('Input is already owned by another capture; stop it before replacing')
          this.sourceBusy.add(role)
          try {
            await this.runtime.replaceDemoSource(role); this.unbind(role)
            const lease: Lease = { capability: randomBytes(32).toString('hex'), kind: x.kind, expiresAtMs: Date.now() + 10_000, sid: null }; this.leases.set(role, lease)
            send(200, { ...await this.runtime.token(role, role), capability: lease.capability, expiresAtMs: this.runtime.expiresAtMs, leaseExpiresAtMs: lease.expiresAtMs })
          } finally { this.sourceBusy.delete(role) }
          return true
        }
        if (x.action === 'demo') {
          if (this.leases.has(role)) this.authorized(role, request.headers['x-input-capability'])
          await this.release(role); await this.runtime.restoreDemoSource(role); send(200, { ok: true }); return true
        }
        if (x.action === 'stop-demo') { if (this.leases.has(role)) throw new Error('Stop this capture in its owning tab'); await this.release(role); send(200, { ok: true }); return true }
        const lease = this.authorized(role, request.headers['x-input-capability'])
        if (x.action === 'stop') { await this.release(role); send(200, { ok: true }); return true }
        if (x.action === 'report') {
          if (lease.sid !== x.videoTrackSid) { if (!await this.runtime.sourcePublication(role, x.videoTrackSid)) throw new Error('Input track is not published by the current source identity'); lease.sid = x.videoTrackSid }
          if (this.leases.get(role) !== lease || Date.now() >= lease.expiresAtMs) throw new Error('Input lease expired during publication validation')
          this.runtime.session.sourceReady(role, { frames: x.frames, videoTrackSid: x.videoTrackSid })
          const encoding = x.encoding && typeof x.encoding === 'object' ? Object.fromEntries(['width', 'height', 'frames', 'framesEncoded', 'bytes', 'qualityLimitationReason', 'codec'].map(k => [k, x.encoding[k]])) : {}
          this.runtime.sourceMedia[role] = { encoding, atMs: Date.now() }; lease.expiresAtMs = Math.min(this.runtime.expiresAtMs, Date.now() + 10_000)
          send(200, { ok: true, expiresAtMs: this.runtime.expiresAtMs, leaseExpiresAtMs: lease.expiresAtMs }); return true
        }
      }
      throw new Error('Unknown producer operation')
    } catch (error) { const status = error instanceof ProductionError && ['REVISION_CONFLICT', 'COMMAND_ID_REUSED', 'SCENE_CONFLICT'].includes(error.code) ? 409 : 400; send(status, { error: error instanceof Error ? error.message : 'Local producer request failed' }); return true }
  }
}
