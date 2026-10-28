import { senderCounters, scheduleFrames } from './runtime/common.js'
const LK = window.LivekitClient
export class ProducerInput {
  constructor(role, api, changed) { this.role = role; this.api = api; this.changed = changed; this.room = null; this.stream = null; this.claim = null; this.stopping = false; this.fileVideo = null; this.pending = false; this.sequence = 0 }
  waitForCapture(request, sequence) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.cancelCapture = null; this.sequence++; reject(new Error('Capture selection timed out; choose the input again when ready')) }, 60_000)
      this.cancelCapture = () => { clearTimeout(timer); this.cancelCapture = null; reject(new Error('Capture cancelled')) }
      request.then(stream => {
        clearTimeout(timer)
        if (sequence !== this.sequence) { stream.getTracks().forEach(track => track.stop()); reject(new Error('Capture cancelled')); return }
        this.cancelCapture = null; resolve(stream)
      }, error => { clearTimeout(timer); if (sequence === this.sequence) this.cancelCapture = null; reject(error) })
    })
  }
  async start(kind, audio, file) {
    if (this.room || this.pending) throw new Error('Stop this input before replacing it')
    this.pending = true; const sequence = ++this.sequence
    this.changed(`Waiting for ${kind} selection / permission…`)
    try {
      // Capture is invoked from the operator click, before any network await.
      if (kind === 'screen') this.stream = await this.waitForCapture(navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 } }, audio }), sequence)
      else if (kind === 'camera') this.stream = await this.waitForCapture(navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } }, audio }), sequence)
      else {
        if (!file || !['video/mp4', 'video/webm'].includes(file.type)) throw new Error('Choose an existing MP4 or WebM; no file is uploaded or copied')
        this.url = URL.createObjectURL(file); this.fileVideo = document.createElement('video'); this.fileVideo.src = this.url; this.fileVideo.muted = true; this.fileVideo.playsInline = true; this.fileVideo.loop = true
        await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Local file did not load')), 10_000); this.fileVideo.onloadeddata = () => { clearTimeout(timer); resolve() }; this.fileVideo.onerror = () => { clearTimeout(timer); reject(new Error('This browser cannot decode that file')) } })
        await this.fileVideo.play()
        const surface = document.createElement('canvas'); surface.width = 1920; surface.height = 1080; const ctx = surface.getContext('2d')
        if (!surface.captureStream) throw new Error('Use current Chrome for local file input')
        // Inputs use the same paced capture as the qualified demo sources. The
        // independent Program gateway still uses the proven explicit-frame path.
        this.stream = surface.captureStream(30); this.generated = this.stream.getVideoTracks()[0]
        this.stopFrames = scheduleFrames(() => {
          if (!this.fileVideo || this.fileVideo.readyState < 2) return
          const v = this.fileVideo, scale = Math.min(1920 / v.videoWidth, 1080 / v.videoHeight), w = v.videoWidth * scale, h = v.videoHeight * scale
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080); ctx.drawImage(v, (1920 - w) / 2, (1080 - h) / 2, w, h)
        })
        if (audio) {
          this.audioContext = new AudioContext(); await this.audioContext.resume(); const destination = this.audioContext.createMediaStreamDestination(), source = this.audioContext.createMediaElementSource(this.fileVideo)
          source.connect(destination); this.fileVideo.muted = false; this.stream.addTrack(destination.stream.getAudioTracks()[0])
        }
      }
      if (sequence !== this.sequence) throw new Error('Capture was cancelled')
      this.changed('Capture ready; registering the private local input…')
      const videoTrack = this.stream.getVideoTracks()[0]
      if (!videoTrack) throw new Error('No video track was selected')
      this.claim = await this.api('/api/producer/input', { action: 'claim', role: this.role, kind })
      if (sequence !== this.sequence) throw new Error('Capture was cancelled')
      this.room = new LK.Room({ adaptiveStream: false, dynacast: false, ...(document.documentElement.dataset.apiRoot ? {} : { rtcConfig: { iceServers: [] } }) })
      this.changed('Connecting capture to the private input room…')
      await this.room.connect(this.claim.url, this.claim.token, { autoSubscribe: false })
      const video = await this.room.localParticipant.publishTrack(videoTrack, { source: LK.Track.Source.Camera, name: `${kind}-input`, simulcast: false, videoCodec: 'h264', degradationPreference: 'maintain-resolution', videoEncoding: { maxBitrate: 6_000_000, maxFramerate: 30 } })
      const sound = this.stream.getAudioTracks()[0] ? await this.room.localParticipant.publishTrack(this.stream.getAudioTracks()[0], { source: LK.Track.Source.Microphone, name: 'input-audio', dtx: false, red: false }) : null
      let reporting = false, failures = 0, previousFrames = null, previousAt = null
      const report = async () => {
        if (reporting || this.stopping) return; reporting = true
        try {
          const encoding = await senderCounters(video.track, sound?.track)
          await this.api('/api/producer/input', { action: 'report', role: this.role, frames: encoding.frames, videoTrackSid: video.trackSid, encoding }, this.claim.capability)
          const now = performance.now(), fps = previousAt !== null && encoding.frames >= previousFrames ? ((encoding.frames - previousFrames) * 1000 / (now - previousAt)).toFixed(1) : 'starting'; previousAt = now; previousFrames = encoding.frames
          failures = 0; this.changed(`${kind} · sending ${encoding.width || videoTrack.getSettings().width || '?'}×${encoding.height || videoTrack.getSettings().height || '?'} · ${fps} fps · audio ${sound ? 'included' : 'off'}`)
        } catch (error) { if (++failures >= 3) { this.changed(`Input lease lost: ${error.message}`); void this.stop() } }
        finally { reporting = false }
      }
      this.timer = setInterval(() => void report(), 1000); await report()
      videoTrack.addEventListener('ended', () => void this.stop(), { once: true })
      this.expiry = setTimeout(() => void this.stop(), Math.max(0, this.claim.expiresAtMs - Date.now()))
    } catch (error) { await this.stop(); throw error }
    finally { this.pending = false }
  }
  async stop() {
    if (this.stopping) return
    this.stopping = true; this.sequence++; this.cancelCapture?.()
    try {
      clearInterval(this.timer); clearTimeout(this.expiry); this.stopFrames?.()
      this.stream?.getTracks().forEach(track => track.stop()); this.fileVideo?.pause(); this.generated?.stop()
      await this.room?.disconnect(); await this.audioContext?.close()
      if (this.claim) await this.api('/api/producer/input', { action: 'stop', role: this.role }, this.claim.capability).catch(() => {})
    } finally {
      if (this.url) URL.revokeObjectURL(this.url)
      this.room = null; this.stream = null; this.claim = null; this.fileVideo = null; this.generated = null; this.audioContext = null; this.url = null; this.stopping = false; this.changed('Disconnected · capture stopped')
    }
  }
  togglePlayback() { if (!this.fileVideo) throw new Error('No file input active'); if (this.fileVideo.paused) void this.fileVideo.play(); else this.fileVideo.pause(); return this.fileVideo.paused }
  rewind() { if (!this.fileVideo) throw new Error('No file input active'); this.fileVideo.currentTime = 0 }
}
