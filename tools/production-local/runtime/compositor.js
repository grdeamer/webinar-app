import { LK, canvas, connect, health, jsonFetch, scheduleFrames, senderCounters, reportEverySecond, status } from './common.js'
import { drawMarker, MARKER_SIZE } from './marker.js'
import { LocalAssets } from './assets.js'
import { drawComposition } from './scene-renderer.js'
import { BoundedFrameWriter } from './frame-writer.js'

export async function runCompositor() {
  const profile = window.localHaVideo || { width: 1280, height: 720, codec: 'vp8', fps: 30, maxBitrate: 3_000_000 }
  const scale = profile.width / 1280
  const surface = canvas(profile.width, profile.height); const ctx = surface.getContext('2d'); ctx.scale(scale, scale)
  const fromSurface = document.createElement('canvas'); fromSurface.width = profile.width; fromSurface.height = profile.height; fromSurface.getContext('2d').scale(scale, scale)
  const toSurface = document.createElement('canvas'); toSurface.width = profile.width; toSurface.height = profile.height; toSurface.getContext('2d').scale(scale, scale)
  const audio = new AudioContext({ sampleRate: 48000 }); await audio.resume()
  const master = audio.createGain(); const limiter = audio.createDynamicsCompressor(); const mixed = audio.createMediaStreamDestination()
  limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20
  master.connect(limiter).connect(mixed)
  const assets = new LocalAssets()
  const inputs = new Map(); let snapshot = null; let fetching = false

  function inputFor(identity) {
    if (!inputs.has(identity)) inputs.set(identity, { video: null, lastFrameAt: 0, decoded: 0, audioNode: null, gain: null })
    return inputs.get(identity)
  }
  const { room: inputRoom } = await connect('renderer-input', (track, publication, participant) => {
    const input = inputFor(participant.identity)
    if (track.kind === LK.Track.Kind.Video) {
      const video = document.createElement('video'); video.muted = true; video.autoplay = true; video.playsInline = true
      video.srcObject = new MediaStream([track.mediaStreamTrack]); input.video = video
      video.play().catch(() => {})
      function decoded() {
        input.lastFrameAt = performance.now(); input.decoded++
        if (input.video === video) video.requestVideoFrameCallback(decoded)
      }
      video.requestVideoFrameCallback(decoded)
    } else {
      const playback = track.attach(); playback.muted = true; playback.play().catch(() => {})
      input.audioNode?.disconnect(); input.gain?.disconnect()
      input.audioNode = audio.createMediaStreamSource(new MediaStream([track.mediaStreamTrack])); input.gain = audio.createGain()
      input.gain.gain.value = 0; input.audioNode.connect(input.gain).connect(master)
    }
  })
  inputRoom.on(LK.RoomEvent.ParticipantDisconnected, participant => {
    const input = inputs.get(participant.identity)
    if (input) { input.audioNode?.disconnect(); input.gain?.disconnect(); input.gain = null; input.lastFrameAt = 0 }
  })
  inputRoom.on(LK.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    const input = inputs.get(participant.identity)
    if (input && track.kind === LK.Track.Kind.Audio) { input.audioNode?.disconnect(); input.gain?.disconnect(); input.gain = null }
    if (input && track.kind === LK.Track.Kind.Video) input.lastFrameAt = 0
  })

  function supported(state) {
    if (!state.program.composition.layers.every(layer => ['camera', 'screen', 'text', 'image', 'pdf', 'video'].includes(layer.kind))) return false
    return !state.transition || ['cut', 'fade'].includes(state.transition.type) || Date.now() >= state.transition.startedAtMs + state.transition.durationMs
  }
  async function readState() {
    if (fetching) return
    fetching = true
    try {
      const { state, sourceReports } = await jsonFetch('/api/state')
      for (const [id, report] of Object.entries(sourceReports || {})) {
        const input = inputs.get(state.bindings[id]?.participantIdentity)
        if (input) input.sourceProgressAtMs = report.progressedAtMs
      }
      if (!state) return
      if (state.revision === snapshot?.revision) { if (health.error?.endsWith('; retaining last valid Program')) health.error = null; return }
      if (state.desiredLifecycle === 'live' && !supported(state)) { health.error = 'Unsupported layer or transition; retaining last valid Program'; return }
      if (state.desiredLifecycle === 'live') {
        await assets.prepare(state.program.composition)
        if (state.transition?.type === 'fade' && Date.now() < state.transition.startedAtMs + state.transition.durationMs) await assets.prepare(state.transition.from.composition)
      }
      snapshot = state; health.appliedRevision = state.revision; health.error = null
    } catch (error) { health.error = String(error.message || 'Control connection unavailable').slice(0, 160) + '; retaining last valid Program' }
    finally { fetching = false }
  }
  await readState(); const poll = setInterval(() => void readState(), 100)

  function slate(message) {
    ctx.fillStyle = '#0b1727'; ctx.fillRect(0, 0, 1280, 720)
    ctx.fillStyle = '#81d8df'; ctx.font = 'bold 38px sans-serif'; ctx.fillText(message, 70, 340)
  }
  function drawBus(bus, opacity, target = ctx) {
    health.sourceWarnings = drawComposition(target, bus, snapshot, inputs, assets)
  }
  function applyAudio() {
    const mix = snapshot?.program.audio
    const live = snapshot?.desiredLifecycle === 'live'
    master.gain.setTargetAtTime(live && mix && !mix.muted ? 10 ** (mix.masterGainDb / 20) : 0, audio.currentTime, 0.02)
    const solo = mix?.channels.some(channel => channel.solo)
    for (const [identity, input] of inputs) {
      if (!input.gain) continue
      const channel = mix?.channels.find(item => snapshot.bindings[item.sourceId]?.participantIdentity === identity)
      const audible = channel && !channel.muted && (!solo || channel.solo) && input.lastFrameAt > 0 && performance.now() - input.lastFrameAt < 2500 && input.sourceProgressAtMs > 0 && Date.now() - input.sourceProgressAtMs < 2500
      input.gain.gain.setTargetAtTime(audible ? 10 ** (channel.gainDb / 20) : 0, audio.currentTime, 0.02)
    }
  }
  let frameWriter = null, capture = null, captureReader = null, probeTrack = null, captured = 0, outputTimestamp = 0, outputError = null, stopped = false
  function snapshotFrame() {
    if (!frameWriter || stopped || outputError) return
    outputTimestamp = Math.max(outputTimestamp + 1, Math.round(performance.now() * 1000))
    frameWriter.enqueue(new VideoFrame(surface, { timestamp: outputTimestamp }), health.appliedRevision)
  }
  const stopFrames = scheduleFrames(() => {
    if (window.localMediaFault) return
    health.framesRendered++; applyAudio()
    ctx.fillStyle = '#06111d'; ctx.fillRect(0, 0, 1280, 720)
    const pictureHeight = 720 - MARKER_SIZE, pictureWidth = pictureHeight * 16 / 9, pictureX = (1280 - pictureWidth) / 2
    if (!snapshot || snapshot.desiredLifecycle !== 'live') slate('JUPITER / LOCAL PROGRAM OFF AIR')
    else {
      const transition = snapshot.transition
      const progress = transition && transition.durationMs ? Math.max(0, Math.min(1, (Date.now() - transition.startedAtMs) / transition.durationMs)) : 1
      if (transition?.type === 'fade' && progress < 1) {
        drawBus(transition.from, 1, fromSurface.getContext('2d')); drawBus(snapshot.program, 1, toSurface.getContext('2d'))
        ctx.drawImage(fromSurface, pictureX, 0, pictureWidth, pictureHeight); ctx.globalAlpha = progress; ctx.drawImage(toSurface, pictureX, 0, pictureWidth, pictureHeight); ctx.globalAlpha = 1
      }
      else {
        // Preserve the picture rectangle without an extra full-frame copy.
        // Offscreen surfaces remain necessary only during an active crossfade.
        ctx.save(); ctx.translate(pictureX, 0); ctx.scale(pictureWidth / 1280, pictureHeight / 720)
        drawBus(snapshot.program, 1, ctx); ctx.restore()
      }
    }
    ctx.fillStyle = '#06111d'; ctx.fillRect(0, 720 - MARKER_SIZE, 1280, MARKER_SIZE)
    drawMarker(ctx, health.appliedRevision, health.framesRendered, 720 - MARKER_SIZE)
    if (['primary', 'standby'].includes(window.localHaCandidate)) drawMarker(ctx, window.localHaCandidate === 'primary' ? 1 : 2, health.framesRendered, 720 - MARKER_SIZE * 2)
    snapshotFrame()
  })
  const { room: outputRoom } = await connect('renderer-output')
  if (window.localHaVideo) {
    if (!window.MediaStreamTrackGenerator || !window.MediaStreamTrackProcessor || !window.VideoFrame) throw new Error('Explicit compositor frame output is required')
    capture = new window.MediaStreamTrackGenerator({ kind: 'video' })
    frameWriter = new BoundedFrameWriter(capture.writable.getWriter(), revision => !stopped && !window.localMediaFault && revision === health.appliedRevision, error => { outputError = error.message; health.error = outputError; stopFrames(); capture.stop() })
    probeTrack = capture.clone(); captureReader = new window.MediaStreamTrackProcessor({ track: probeTrack }).readable.getReader()
    void (async () => { try { while (!stopped) { const item = await captureReader.read(); if (item.done) break; captured++; item.value.close() } } catch { /* Cancelled during cleanup. */ } })()
    snapshotFrame()
    const firstFrameDeadline = performance.now() + 500
    while (!frameWriter.counters().written && !outputError && performance.now() < firstFrameDeadline) await new Promise(resolve => setTimeout(resolve, 5))
    if (!frameWriter.counters().written || outputError) throw new Error(outputError || 'Compositor initial frame was not written')
  } else {
    capture = surface.captureStream(30).getVideoTracks()[0]
  }
  const video = await outputRoom.localParticipant.publishTrack(capture, { name: 'program-video', source: LK.Track.Source.Camera, simulcast: false, degradationPreference: 'maintain-resolution', videoCodec: profile.codec, videoEncoding: { maxBitrate: profile.maxBitrate, maxFramerate: window.localHaVideo ? profile.fps * 2 : profile.fps } })
  const audioPub = await outputRoom.localParticipant.publishTrack(mixed.stream.getAudioTracks()[0], { name: 'program-audio', source: LK.Track.Source.Microphone, dtx: false, red: false })
  health.width = 1280; health.height = 720
  const stopReports = reportEverySecond('renderer', async () => {
    const selected = await jsonFetch('/api/media/encoding')
    const sender = video.track.sender
    if (sender && window.appliedEncodingProfile !== selected.profile) {
      const parameters = sender.getParameters()
      if (!parameters.encodings?.length) throw new Error('No active encoder parameters')
      for (const encoding of parameters.encodings) Object.assign(encoding, selected.encoding)
      await sender.setParameters(parameters)
      window.appliedEncodingProfile = selected.profile
      health.encoderProfile = selected.profile
    }
    const stats = await senderCounters(video.track, audioPub.track); health.framesSent = stats.frames; health.audioPackets = stats.packets
    if (window.localHaVideo) health.encoding = stats
    if (window.localHaVideo) health.capture = { transport: 'video-frame-generator', rendered: health.framesRendered, captured, error: outputError, ...frameWriter.counters() }
    health.width = stats.width; health.height = stats.height
    health.inputFrames = Object.fromEntries([...inputs].map(([identity, input]) => [identity, input.decoded]))
    health.assetPositions = Object.fromEntries((snapshot?.program.composition.layers || []).filter(layer => layer.kind === 'video').map(layer => [layer.id, Math.round((assets.get(layer)?.currentTime || 0) * 1000)]))
  }, window.localHaVideo ? 200 : 1000)
  status('Persistent local compositor publishing one Program video and mixed audio')
  window.stopLocalEngine = async () => { stopped = true; clearInterval(poll); stopReports(); stopFrames(); frameWriter?.stop(); capture?.stop(); probeTrack?.stop(); await captureReader?.cancel().catch(() => {}); await inputRoom.disconnect(); await outputRoom.disconnect(); await audio.close(); assets.dispose() }
}
