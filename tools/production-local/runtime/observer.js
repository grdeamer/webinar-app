import { LK, capability, connect, health, jsonFetch, status } from './common.js'
import { MARKER_SIZE, MARKER_WIDTH, readMarker } from './marker.js'
import { receivedProgramRecorder } from './recording.js'

export async function runObserver() {
  const video = document.createElement('video'); video.autoplay = true; video.muted = true; video.playsInline = true
  document.getElementById('media').append(video)
  const stream = new MediaStream(); video.srcObject = stream
  const marker = document.createElement('canvas'); marker.width = MARKER_WIDTH; marker.height = MARKER_SIZE
  const markerContext = marker.getContext('2d', { willReadFrequently: true })
  const pixel = document.createElement('canvas'); pixel.width = 1; pixel.height = 1
  const pixelContext = pixel.getContext('2d', { willReadFrequently: true })
  const audio = new AudioContext({ sampleRate: 48000 }); await audio.resume()
  let audioTrack = null; let analyser = null; let node = null
  const silent = audio.createGain(); silent.gain.value = 0; silent.connect(audio.destination)
  const recorder = receivedProgramRecorder(stream)
  const { room } = await connect('observer', (track, publication, participant) => {
    const generation = Number(participant.identity.split('-').at(-1))
    if (!/^program-engine-\d+$/.test(participant.identity) || generation < health.generation) return
    if (generation > health.generation) {
      for (const old of stream.getTracks()) stream.removeTrack(old)
      node?.disconnect(); audioTrack = null; analyser = null
      health.generation = generation; health.firstDecodedAtMs = 0; health.videoTrackSid = null; health.audioTrackSid = null
    }
    health.publisherIdentity = participant.identity
    for (const old of stream.getTracks()) if (old.kind === track.mediaStreamTrack.kind) stream.removeTrack(old)
    stream.addTrack(track.mediaStreamTrack)
    video.play().catch(() => {})
    if (track.kind === LK.Track.Kind.Audio) {
      health.audioTrackSid = publication.trackSid
      const playback = track.attach(); playback.muted = true; playback.play().catch(() => {})
      audioTrack = track; node?.disconnect(); node = audio.createMediaStreamSource(new MediaStream([track.mediaStreamTrack]))
      analyser = audio.createAnalyser(); analyser.fftSize = 2048; node.connect(analyser).connect(silent)
    } else {
      health.videoTrackSid = publication.trackSid
    }
  })
  room.on(LK.RoomEvent.TrackUnsubscribed, (track, publication) => {
    stream.removeTrack(track.mediaStreamTrack)
    if (health.videoTrackSid === publication.trackSid) health.videoTrackSid = null
    if (health.audioTrackSid === publication.trackSid) health.audioTrackSid = null
  })
  function decoded() {
    if (window.localMediaFault) { video.requestVideoFrameCallback(decoded); return }
    if (video.videoWidth) {
      const scale = video.videoWidth / 1280
      markerContext.drawImage(video, 0, video.videoHeight - MARKER_SIZE * scale, MARKER_WIDTH * scale, MARKER_SIZE * scale, 0, 0, MARKER_WIDTH, MARKER_SIZE)
      const markerData = readMarker(markerContext)
      if (markerData && markerData.frame !== health.markerFrame) {
        health.decodedFrames++; health.decodedRevision = markerData.revision; health.markerFrame = markerData.frame
        health.appliedRevision = markerData.revision
        health.lastDecodedAtMs = Date.now()
        if (!health.firstDecodedAtMs) health.firstDecodedAtMs = health.lastDecodedAtMs
      }
      health.width = video.videoWidth; health.height = video.videoHeight
      pixelContext.drawImage(video, video.videoWidth * .95, video.videoHeight * .2, 1, 1, 0, 0, 1, 1)
      const [r, g, b] = pixelContext.getImageData(0, 0, 1, 1).data
      const distanceA = Math.abs(r - 7) + Math.abs(g - 59) + Math.abs(b - 96)
      const distanceB = Math.abs(r - 88) + Math.abs(g - 38) + Math.abs(b - 71)
      health.contentSource = distanceA < 25 ? 'camera-a' : distanceB < 25 ? 'camera-b' : r > 15 && g > 30 && b > 60 ? 'transition' : 'slate'
      if (health.contentSource === 'transition') health.transitionFrames++
    }
    video.requestVideoFrameCallback(decoded)
  }
  video.requestVideoFrameCallback(decoded)
  let pending = false; let transportError = null
  const timer = setInterval(async () => {
    if (pending) return
    pending = true
    try {
      if (health.error === transportError) health.error = null
      const stats = await audioTrack?.getRTCStatsReport()
      stats?.forEach(item => { if (item.type === 'inbound-rtp' && item.kind === 'audio') health.audioPackets = item.packetsReceived || 0 })
      if (analyser) {
        const data = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(data)
        health.audioRms = Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length)
      }
      const control = await jsonFetch('/api/media/report?role=observer', health, capability)
      window.localMediaFault = control.fault === true
      transportError = null
      recorder.update(control.recording, control.stopRecording)
    } catch (error) { transportError = error.message; health.error = transportError }
    finally { pending = false }
  }, 1000)
  status('Independent receiver verifies decoded Program frames, revision marker and audio')
  window.stopLocalObserver = async () => { clearInterval(timer); await recorder.wait(); await room.disconnect(); await audio.close() }
}
