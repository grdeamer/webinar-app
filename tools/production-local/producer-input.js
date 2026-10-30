import { captureFileStream, watchNativeFrames } from './file-capture.js'
import { senderCounters } from './runtime/common.js'
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
        // Capture the decoder's native tracks, not a timer-driven canvas. Muting
        // element playback keeps local speakers silent without muting captured audio.
        this.stream = captureFileStream(this.fileVideo, audio)
      }
      if (sequence !== this.sequence) throw new Error('Capture was cancelled')
      this.changed('Capture ready; registering the private local input…')
      const videoTrack = this.stream.getVideoTracks()[0]
      if (!videoTrack) throw new Error('No video track was selected')
      if (kind === 'file') this.nativeProbe = watchNativeFrames(videoTrack, () => { this.changed('Native file capture stopped'); void this.stop() }, () => Boolean(this.fileVideo && !this.fileVideo.paused && !this.fileVideo.ended))
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
          const encoding = { ...await senderCounters(video.track, sound?.track), captureMode: kind === 'file' ? 'native-media-element' : 'device', publisherVisibility: document.visibilityState, ...(this.fileVideo ? { fileTimeMs: Math.round(this.fileVideo.currentTime * 1000), filePaused: this.fileVideo.paused, nativeFramesCaptured: this.nativeProbe?.frames, nativeCaptureError: this.nativeProbe?.error } : {}) }
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
      clearInterval(this.timer); clearTimeout(this.expiry)
      await this.nativeProbe?.stop(); this.nativeProbe = null
      this.stream?.getTracks().forEach(track => track.stop()); this.fileVideo?.pause()
      await this.room?.disconnect()
      if (this.claim) await this.api('/api/producer/input', { action: 'stop', role: this.role }, this.claim.capability).catch(() => {})
    } finally {
      if (this.url) URL.revokeObjectURL(this.url)
      this.room = null; this.stream = null; this.claim = null; this.fileVideo = null;  this.url = null; this.stopping = false; this.changed('Disconnected · capture stopped')
    }
  }
  togglePlayback() { if (!this.fileVideo) throw new Error('No file input active'); if (this.fileVideo.paused) void this.fileVideo.play(); else this.fileVideo.pause(); return this.fileVideo.paused }
  rewind() { if (!this.fileVideo) throw new Error('No file input active'); this.fileVideo.currentTime = 0 }
}
