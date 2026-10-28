import { LK } from './common.js'

/** A single finished Program receiver. Never subscribes to the contribution room. */
export class ProgramPlayer {
  constructor(video, onState = () => {}, onTrack = () => {}) {
    this.video = video; this.onState = onState; this.onTrack = onTrack
    this.room = null; this.stream = null; this.lease = null; this.active = false; this.pending = false; this.epoch = 0
    this.frames = 0; this.lastFrameAt = 0; this.state = 'idle'; this.videoTrackSid = null; this.audioTrackSid = null
    this.intent = 0; this.starting = false
    video.autoplay = true; video.muted = true; video.playsInline = true
    const frame = () => { if (this.active && this.video.srcObject) { this.frames++; this.lastFrameAt = Date.now() } video.requestVideoFrameCallback(frame) }
    video.requestVideoFrameCallback(frame)
  }
  notify(state) { this.state = state; this.onState(this.info()) }
  info() { return { state: this.state, frames: this.frames, publisherIdentity: this.lease?.publisherIdentity || null, videoTrackSid: this.videoTrackSid, audioTrackSid: this.audioTrackSid, width: this.video.videoWidth, height: this.video.videoHeight, generation: this.lease?.generation ?? null, deliveryRevision: this.lease?.deliveryRevision ?? null } }
  async drop() {
    this.epoch++; const room = this.room; this.room = null; this.video.srcObject = null; this.stream = null; this.lease = null
    this.videoTrackSid = null; this.audioTrackSid = null
    await room?.disconnect()
  }
  async start() {
    if (this.starting) return
    this.starting = true
    const intent = ++this.intent
    try {
      this.active = false; clearInterval(this.timer); await this.drop()
      if (intent !== this.intent) return
      this.active = true; this.deadline = Date.now() + 120_000; this.video.muted = true
      this.timer = setInterval(() => void this.tick(), 500); await this.tick()
    } finally { this.starting = false }
  }
  async stop() { this.intent++; this.active = false; clearInterval(this.timer); await this.drop(); this.video.muted = true; this.notify('stopped') }
  async tick() {
    if (this.pending || !this.active) return
    this.pending = true
    try {
      if (Date.now() >= this.deadline) { await this.stop(); this.notify('expired'); return }
      const response = await fetch('/api/media/delivery', { cache: 'no-store' }); if (!response.ok) throw new Error('Delivery status unavailable')
      const delivery = await response.json()
      if (!this.active) return
      if (delivery.mode !== 'program') { await this.drop(); this.notify('legacy'); return }
      if (!delivery.runtimeRunning || (this.room && this.lease.generation !== delivery.generation)) { await this.drop(); this.notify('waiting') }
      if (this.room) {
        if (Date.now() - this.lastFrameAt > 4000) { await this.drop(); this.notify('stalled') }
        else this.notify(this.videoTrackSid && this.audioTrackSid && this.frames > this.framesAtConnect ? 'live' : 'waiting')
        return
      }
      if (!delivery.ready) { this.notify('waiting'); return }
      const tokenResponse = await fetch('/api/media/audience-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (!tokenResponse.ok) { this.notify('waiting'); return }
      const lease = await tokenResponse.json(); if (!this.active) return
      const room = new LK.Room({ adaptiveStream: false, dynacast: false, rtcConfig: { iceServers: [] } })
      this.room = room; this.lease = lease; this.stream = new MediaStream(); this.video.srcObject = this.stream; this.lastFrameAt = Date.now()
      this.framesAtConnect = this.frames
      const epoch = this.epoch
      room.on(LK.RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (this.epoch !== epoch || this.room !== room || participant.identity !== lease.publisherIdentity) return
        const video = track.kind === LK.Track.Kind.Video
        if (publication.trackName !== (video ? 'program-video' : 'program-audio')) return
        for (const old of this.stream.getTracks()) if (old.kind === track.mediaStreamTrack.kind) this.stream.removeTrack(old)
        this.stream.addTrack(track.mediaStreamTrack)
        if (video) this.videoTrackSid = publication.trackSid; else this.audioTrackSid = publication.trackSid
        this.onTrack(track, publication, participant); this.video.play().catch(() => {})
      })
      room.on(LK.RoomEvent.TrackUnsubscribed, (track, publication) => {
        if (this.room !== room) return
        this.stream?.removeTrack(track.mediaStreamTrack)
        if (this.videoTrackSid === publication.trackSid) this.videoTrackSid = null
        if (this.audioTrackSid === publication.trackSid) this.audioTrackSid = null
      })
      room.on(LK.RoomEvent.Disconnected, () => { if (this.room === room) { this.video.srcObject = null; this.notify('waiting') } })
      await room.connect(lease.url, lease.token, { autoSubscribe: true, rtcConfig: { iceServers: [] } })
      if (!this.active || this.room !== room) await room.disconnect()
      else this.notify('waiting')
    } catch { await this.drop(); this.notify('waiting') }
    finally { this.pending = false }
  }
}
