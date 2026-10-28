import { ProgramPlayer } from './program-player.js'
import { MARKER_SIZE, MARKER_WIDTH, readMarker } from './marker.js'

const video = document.getElementById('probe-video'), cap = location.hash.slice(1), id = new URLSearchParams(location.search).get('recording')
const surface = document.createElement('canvas'); surface.width = MARKER_WIDTH; surface.height = MARKER_SIZE
const ctx = surface.getContext('2d', { willReadFrequently: true }), revisions = new Set()
const sample = document.createElement('canvas'); sample.width = 1; sample.height = 1
const pixel = sample.getContext('2d', { willReadFrequently: true }), contentSources = new Set()
const audio = new AudioContext(); await audio.resume()
const analyser = audio.createAnalyser(), silent = audio.createGain(); silent.gain.value = 0; analyser.connect(silent).connect(audio.destination)
let audioNode = null, frames = 0, ended = false, player = null, maxAudioRms = 0, info = { state: id ? 'recording' : 'idle', publisherIdentity: null, videoTrackSid: null, audioTrackSid: null }
if (id) {
  video.src = `/api/media/recording-playback?id=${encodeURIComponent(id)}`; video.muted = false
  audioNode = audio.createMediaElementSource(video); audioNode.connect(analyser)
  video.onended = () => { ended = true }
  await video.play()
} else {
  player = new ProgramPlayer(video, value => { info = value }, track => {
    if (track.kind !== 'audio') return
    const playback = track.attach(); playback.muted = true; playback.play().catch(() => {})
    audioNode?.disconnect(); audioNode = audio.createMediaStreamSource(new MediaStream([track.mediaStreamTrack])); audioNode.connect(analyser)
  })
  await player.start()
}
function decoded() {
  if (video.videoWidth) {
    const scale = video.videoWidth / 1280
    ctx.drawImage(video, 0, video.videoHeight - MARKER_SIZE * scale, MARKER_WIDTH * scale, MARKER_SIZE * scale, 0, 0, MARKER_WIDTH, MARKER_SIZE)
    const marker = readMarker(ctx)
    if (marker) { frames++; if (revisions.size < 200) revisions.add(marker.revision) }
    pixel.drawImage(video, video.videoWidth * .95, video.videoHeight * .2, 1, 1, 0, 0, 1, 1)
    const [r, g, b] = pixel.getImageData(0, 0, 1, 1).data
    if (Math.abs(r - 7) + Math.abs(g - 59) + Math.abs(b - 96) < 30) contentSources.add('camera-a')
    if (Math.abs(r - 88) + Math.abs(g - 38) + Math.abs(b - 71) < 30) contentSources.add('camera-b')
  }
  video.requestVideoFrameCallback(decoded)
}
video.requestVideoFrameCallback(decoded)
const timer = setInterval(async () => {
  const values = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(values)
  const rms = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length); maxAudioRms = Math.max(maxAudioRms, rms)
  const report = { ...info, frames, revisions: [...revisions], audioRms: rms, maxAudioRms, contentSources: [...contentSources], width: video.videoWidth, height: video.videoHeight, ended }
  document.getElementById('probe-status').textContent = JSON.stringify(report)
  await fetch('/api/media/audience-probe', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Probe-Capability': cap }, body: JSON.stringify(report) }).catch(() => {})
}, 500)
window.addEventListener('pagehide', () => { clearInterval(timer); void player?.stop(); void audio.close() })
