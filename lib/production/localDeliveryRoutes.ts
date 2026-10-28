import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { LocalDelivery } from './localDelivery.ts'
import { LocalDeliveryProbe } from './localDeliveryProbe.ts'
import type { LocalMediaSession } from './localMediaSession.ts'
import type { LocalProgramRecording, ProgramOrigin } from './localRecording.ts'
import { LOCAL_SCOPE } from './localWorkbench.ts'
import { ProductionError } from './contracts.ts'
import { RoomServiceClient } from 'livekit-server-sdk'

export class LocalDeliveryRoutes {
  readonly delivery: LocalDelivery
  readonly probe = new LocalDeliveryProbe()
  readonly session: LocalMediaSession
  readonly recording: LocalProgramRecording
  stopRecordingRequested = false
  onRecordingStart: (() => void) | null = null
  private audienceLeases = new Map<string, number>()
  constructor(session: LocalMediaSession, recording: LocalProgramRecording, directory: string) { this.session = session; this.recording = recording; this.delivery = new LocalDelivery(join(directory, 'delivery.json'), LOCAL_SCOPE) }
  ready() {
    const state = this.session.store.read(LOCAL_SCOPE), observation = this.session.observation(), receiver = this.session.observer?.report
    return state.desiredLifecycle === 'live' && observation.status === 'healthy' && observation.observedRevision === state.revision && observation.appliedRevision === state.revision && receiver?.publisherIdentity === `program-engine-${this.session.generation}` && Boolean(receiver.videoTrackSid && receiver.audioTrackSid) && !this.session.renderer?.report.sourceWarnings.length
  }
  origin(): ProgramOrigin {
    const report = this.session.observer?.report
    if (!this.ready() || !report?.publisherIdentity || !report.videoTrackSid || !report.audioTrackSid) throw new Error('Fresh finished Program publication required for recording')
    return { runId: this.session.runId, broadcastId: LOCAL_SCOPE.broadcastId, generation: this.session.generation, publisherIdentity: report.publisherIdentity, videoTrackSid: report.videoTrackSid, audioTrackSid: report.audioTrackSid, programRevision: report.decodedRevision!, deliveryRevision: this.delivery.state.revision }
  }
  async handle(request: IncomingMessage, response: ServerResponse, url: URL, parse: () => Promise<unknown>): Promise<boolean> {
    if (!['/api/media/delivery', '/api/media/audience-token', '/api/media/audience-probe', '/api/media/delivery-record'].includes(url.pathname)) return false
    const send = (status: number, value: unknown) => { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(value)) }
    try {
      if (url.pathname === '/api/media/delivery' && request.method === 'GET') { send(200, { ...this.delivery.state, ready: this.ready(), runtimeRunning: this.session.running, generation: this.session.generation }); return true }
      if (url.pathname === '/api/media/delivery' && request.method === 'POST') {
        if (request.headers['x-jupiter-local'] !== 'phase5') throw new Error('Local delivery header required')
        const before = this.delivery.state.revision, next = this.delivery.select(await parse(), this.ready())
        if (next.revision !== before && next.mode === 'legacy') {
          this.recording.fail('Local delivery rolled back during Program recording')
          if (this.session.running && this.audienceLeases.size) {
            const api = new RoomServiceClient('http://127.0.0.1:7880', this.session.apiKey, this.session.apiSecret, { requestTimeout: 3 })
            try {
              for (const participant of await api.listParticipants(this.session.programRoom)) if (this.audienceLeases.has(participant.identity)) await api.removeParticipant(this.session.programRoom, participant.identity)
            } catch { /* Policy is already committed; cooperative clients must disconnect on the next poll. */ }
          }
          this.audienceLeases.clear()
        }
        send(200, next); return true
      }
      if (url.pathname === '/api/media/audience-token' && request.method === 'POST') {
        if (this.delivery.state.mode !== 'program' || !this.ready()) throw new Error('Program delivery is not available; no source-room fallback')
        const token = await this.session.token('audience', null)
        for (const [id, expiry] of this.audienceLeases) if (expiry < Date.now()) this.audienceLeases.delete(id)
        if (this.audienceLeases.size >= 100) throw new Error('Local audience preview limit reached')
        this.audienceLeases.set(token.identity, Date.now() + 120_000)
        send(200, { ...token, generation: this.session.generation, publisherIdentity: `program-engine-${this.session.generation}`, deliveryRevision: this.delivery.state.revision, scope: LOCAL_SCOPE }); return true
      }
      if (url.pathname === '/api/media/delivery-record' && request.method === 'POST') {
        if (request.headers['x-jupiter-local'] !== 'phase5') throw new Error('Local delivery recording header required')
        const x = await parse() as { action: string }
        if (x.action === 'start') { if (this.delivery.state.mode !== 'program') throw new Error('Select Program delivery before recording it'); this.recording.start(Date.now(), this.origin()); this.stopRecordingRequested = false; this.onRecordingStart?.() }
        else if (x.action === 'stop') { this.stopRecordingRequested = true; send(200, { stopRequested: true }); return true }
        else throw new Error('Unknown recording action')
        send(200, this.recording.job); return true
      }
      if (url.pathname === '/api/media/audience-probe' && request.method === 'GET') { send(200, this.probe.report); return true }
      if (url.pathname === '/api/media/audience-probe' && request.method === 'POST') {
        if (request.headers['x-probe-capability']) { if (!this.probe.authorized(request.headers['x-probe-capability'])) throw new Error('Probe capability required'); this.probe.accept(await parse()); send(200, { ok: true }); return true }
        if (request.headers['x-jupiter-local'] !== 'phase5') throw new Error('Local probe control header required')
        const x = await parse() as { action: string; recordingId?: string }
        if (x.action === 'start') { if (x.recordingId) this.recording.downloadable(x.recordingId); await this.probe.start(`http://127.0.0.1:${request.socket.localPort}`, x.recordingId) }
        else if (x.action === 'stop') await this.probe.stop()
        else throw new Error('Unknown probe action')
        send(200, { accepted: true }); return true
      }
      throw new Error('Unsupported local delivery method')
    } catch (error) { send(error instanceof ProductionError && ['REVISION_CONFLICT', 'COMMAND_ID_REUSED'].includes(error.code) ? 409 : error instanceof ProductionError && error.code === 'SCOPE_MISMATCH' ? 403 : 400, { error: error instanceof Error ? error.message : 'Local delivery failed' }); return true }
  }
}
