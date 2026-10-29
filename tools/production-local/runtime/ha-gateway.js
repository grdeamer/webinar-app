import { LK, canvas, connect, jsonFetch, senderCounters, status } from './common.js'
import { MARKER_SIZE, MARKER_WIDTH, drawMarker, readMarker } from './marker.js'
import { OutputFence } from './ha-fence.js'
import { BoundedFrameWriter } from './frame-writer.js'

export async function runGateway() {
  if (!window.MediaStreamTrackProcessor) throw new Error('The local gateway requires decoded-frame processing support')
  if (!window.MediaStreamTrackGenerator || !window.VideoFrame) throw new Error('The local gateway requires explicit VideoFrame output support')
  const profile = window.localHaVideo
  const surface = canvas(profile.width, profile.height), ctx = surface.getContext('2d'), slots = new Map(); ctx.scale(profile.width / 1280, profile.height / 720)
  const marker = document.createElement('canvas'); marker.width = MARKER_WIDTH; marker.height = MARKER_SIZE
  const markerCtx = marker.getContext('2d', { willReadFrequently: true })
  const audio = new AudioContext(); await audio.resume()
  const mixed = audio.createMediaStreamDestination()
  let frameWriter = null, outputError = null, outputTimestamp = 0, captureTrack = null
  let captureReader = null, capturedFrames = 0, captureLastAtMs = 0, captureMaxGapMs = 0
  let manualTrack = null, fence = null, polling = false, reporting = false, outputFrames = 0, selected = null, sent = null, stopped = false, renderKey = null
  const diagnostics = { renderCount: 0, renderTotalMs: 0, renderMaxMs: 0, markerCount: 0, markerTotalMs: 0, markerMaxMs: 0, loopMaxGapMs: 0 }
  let lastTick = performance.now(), lastInputStats = 0
  function render(force = false) {
    if (!fence || stopped) return
    const lease = fence.selected(performance.now()), slot = lease && slots.get(lease.identity)
    selected = lease && slot?.frame && slot.gain && performance.now() - slot.lastFrame < 350 && slot.revision === lease.revision ? lease : null
    for (const [identity, item] of slots) item.gain?.gain.setValueAtTime(selected?.identity === identity ? 1 : 0, audio.currentTime)
    const key = selected ? `${selected.generation}:${selected.revision}:${slot.markerFrame}` : `slate:${fence.generation}`
    if (!force && key === renderKey) return
    const began = performance.now()
    renderKey = key
    ctx.fillStyle = '#111c29'; ctx.fillRect(0, 0, 1280, 720)
    if (selected) ctx.drawImage(slot.frame, 0, 0, 1280, 720)
    else { ctx.fillStyle = '#d5e5eb'; ctx.font = '32px sans-serif'; ctx.fillText('LOCAL HA / NO VALID OUTPUT AUTHORITY', 65, 350) }
    drawMarker(ctx, fence.generation, selected?.candidate === 'primary' ? 1 : selected?.candidate === 'standby' ? 2 : 0, 0)
    if (!frameWriter) return
    // Snapshot now: requestFrame() only schedules a later canvas paint and can
    // coalesce multiple valid decoded pictures into one captured frame.
    outputTimestamp = Math.max(outputTimestamp + 1, Math.round(performance.now() * 1000))
    frameWriter.enqueue(new VideoFrame(surface, { timestamp: outputTimestamp }), selected ? { ...selected } : null)
    outputFrames++
    const elapsed = performance.now() - began; diagnostics.renderCount++; diagnostics.renderTotalMs += elapsed; diagnostics.renderMaxMs = Math.max(diagnostics.renderMaxMs, elapsed)
  }
  const { room: input, config } = await connect('gateway-input', (track, publication, participant) => {
    if (!['candidate-primary', 'candidate-standby'].includes(participant.identity)) return
    let slot = slots.get(participant.identity)
    if (!slot) { slot = { frames: 0, decodedFrames: 0, markerSkipped: 0, markerInvalid: 0, lastFrame: 0, revision: null, markerFrame: null, frame: null, reader: null, gain: null, node: null, remoteTrack: null, rtc: null }; slots.set(participant.identity, slot) }
    if (track.kind === LK.Track.Kind.Video) {
      slot.remoteTrack = track
      slot.reader?.cancel().catch(() => {}); slot.frame?.close(); slot.frame = null
      const reader = new window.MediaStreamTrackProcessor({ track: track.mediaStreamTrack }).readable.getReader(); slot.reader = reader
      void (async () => {
        try {
          while (!stopped && slot.reader === reader) {
            const value = await reader.read(); if (value.done) break
            const frame = value.value
            if (stopped || slot.reader !== reader) { frame.close(); break }
            const scale = frame.displayWidth / 1280
            const markerBegan = performance.now()
            markerCtx.drawImage(frame, 0, frame.displayHeight - MARKER_SIZE * scale, MARKER_WIDTH * scale, MARKER_SIZE * scale, 0, 0, MARKER_WIDTH, MARKER_SIZE)
            const decoded = readMarker(markerCtx); slot.decodedFrames++
            const markerElapsed = performance.now() - markerBegan; diagnostics.markerCount++; diagnostics.markerTotalMs += markerElapsed; diagnostics.markerMaxMs = Math.max(diagnostics.markerMaxMs, markerElapsed)
            if (!decoded) slot.markerInvalid++
            if (decoded && slot.markerFrame !== null) { const delta = (decoded.frame - slot.markerFrame + 65536) % 65536; if (delta > 1 && delta < 32768) slot.markerSkipped += delta - 1 }
            slot.frame?.close(); slot.frame = frame
            if (decoded && decoded.frame !== slot.markerFrame) { slot.frames++; slot.lastFrame = performance.now(); slot.revision = decoded.revision; slot.markerFrame = decoded.frame }
            if (fence?.selected(performance.now())?.identity === participant.identity) render()
          }
        } catch { slot.lastFrame = 0; render() }
      })()
    } else {
      slot.node?.disconnect(); slot.gain?.disconnect()
      const playback = track.attach(); playback.muted = true; playback.play().catch(() => {})
      slot.node = audio.createMediaStreamSource(new MediaStream([track.mediaStreamTrack])); slot.gain = audio.createGain(); slot.gain.gain.value = 0; slot.node.connect(slot.gain).connect(mixed)
    }
  })
  fence = new OutputFence(config.runId)
  input.on(LK.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    const slot = slots.get(participant.identity); if (!slot) return
    if (track.kind === LK.Track.Kind.Video) { slot.reader?.cancel().catch(() => {}); slot.reader = null; slot.frame?.close(); slot.frame = null; slot.lastFrame = 0; render() }
    else { slot.node?.disconnect(); slot.gain?.disconnect(); slot.gain = null; render() }
  })
  const poll = async () => {
    if (polling) return; polling = true
    const began = performance.now()
    try { const grant = await jsonFetch('/api/ha/authority'); if (grant) fence.accept(grant, began, performance.now()); render() } catch { /* Monotonic lease expiry remains independently enforced. */ }
    finally { polling = false }
  }
  await poll(); const controlTimer = setInterval(poll, 50)
  // This timer enforces expiry/slate/audio; it never resamples an active candidate onto another 30 fps clock.
  const expiryTimer = setInterval(() => { const now = performance.now(); diagnostics.loopMaxGapMs = Math.max(diagnostics.loopMaxGapMs, now - lastTick); lastTick = now; render() }, 20)
  const { room: output } = await connect('gateway-output')
  manualTrack = new window.MediaStreamTrackGenerator({ kind: 'video' })
  frameWriter = new BoundedFrameWriter(manualTrack.writable.getWriter(), authority => {
    const lease = fence.selected(performance.now()), slot = lease && slots.get(lease.identity)
    const fresh = slot?.frame && slot.gain && performance.now() - slot.lastFrame < 350 && slot.revision === lease?.revision
    return authority ? fresh && lease?.identity === authority.identity && lease.generation === authority.generation && lease.revision === authority.revision : !fresh
  }, error => { outputError = error.message; manualTrack.stop(); for (const slot of slots.values()) slot.gain?.gain.setValueAtTime(0, audio.currentTime) })
  captureTrack = manualTrack.clone()
  captureReader = new window.MediaStreamTrackProcessor({ track: captureTrack }).readable.getReader()
  void (async () => {
    try { while (!stopped) { const item = await captureReader.read(); if (item.done) break; const now = performance.now(); if (captureLastAtMs) captureMaxGapMs = Math.max(captureMaxGapMs, now - captureLastAtMs); captureLastAtMs = now; capturedFrames++; item.value.close() } } catch { /* Cancelled on cleanup. */ }
  })()
  render(true)
  const firstFrameDeadline = performance.now() + 500
  while (!frameWriter.counters().written && !outputError && performance.now() < firstFrameDeadline) await new Promise(resolve => setTimeout(resolve, 5))
  if (!frameWriter.counters().written || outputError) throw new Error(outputError || 'Gateway initial frame was not written')
  // Decoded frames arrive with network jitter. A 30 fps encoder ceiling may discard
  // adjacent arrivals even when their long-term rate is 30. Only distinct input
  // frames request capture; headroom removes this second rate limiter, not the
  // source's 30 fps cadence. Receiver counters independently verify the output.
  const encoderCeilingFps = profile.fps * 2
  const video = await output.localParticipant.publishTrack(manualTrack, { name: 'program-video', source: LK.Track.Source.Camera, simulcast: false, degradationPreference: 'maintain-resolution', videoCodec: profile.codec, videoEncoding: { maxBitrate: profile.maxBitrate, maxFramerate: encoderCeilingFps } })
  const sound = await output.localParticipant.publishTrack(mixed.stream.getAudioTracks()[0], { name: 'program-audio', source: LK.Track.Source.Microphone, dtx: false, red: false })
  render(true)
  const timer = setInterval(async () => {
    if (reporting) return; reporting = true
    try {
      sent = await senderCounters(video.track, sound.track)
      if (performance.now() - lastInputStats > 1000) {
        lastInputStats = performance.now()
        for (const slot of slots.values()) {
          const stats = await slot.remoteTrack?.getRTCStatsReport()
          stats?.forEach(s => { if (s.type === 'inbound-rtp' && s.kind === 'video') slot.rtc = { framesReceived: s.framesReceived, framesDecoded: s.framesDecoded, framesDropped: s.framesDropped, framesPerSecond: s.framesPerSecond, totalDecodeTime: s.totalDecodeTime, totalProcessingDelay: s.totalProcessingDelay, jitterBufferDelay: s.jitterBufferDelay, jitterBufferEmittedCount: s.jitterBufferEmittedCount, packetsLost: s.packetsLost, decoderImplementation: s.decoderImplementation, codec: stats.get(s.codecId)?.mimeType ?? null } })
        }
      }
      await jsonFetch('/api/ha/report', { role: 'gateway', outputTransport: 'video-frame-generator', outputError, diagnostics, writer: frameWriter.counters(), outputFrames, capturedFrames, captureMaxGapMs, encoderCeilingFps, targetFps: profile.fps, selected: selected?.candidate || null, generation: fence.generation, rejectedGrants: fence.rejected, sent,
        inputs: Object.fromEntries([...slots].map(([id, slot]) => [id, { frames: slot.frames, decodedFrames: slot.decodedFrames, markerSkipped: slot.markerSkipped, markerInvalid: slot.markerInvalid, rtc: slot.rtc, revision: slot.revision, ageMs: Math.round(performance.now() - slot.lastFrame) }])) })
    } catch { /* Metadata only; expiry still runs when the control connection is unavailable. */ }
    finally { reporting = false }
  }, 200)
  status('Frame-driven 1080p gateway: selected decoded frames, expiring authority and silent audio routing')
  window.stopHaGateway = async () => { stopped = true; clearInterval(controlTimer); clearInterval(expiryTimer); clearInterval(timer); frameWriter?.stop(); manualTrack?.stop(); captureTrack?.stop(); await captureReader?.cancel().catch(() => {}); for (const slot of slots.values()) { await slot.reader?.cancel().catch(() => {}); slot.frame?.close() }; await input.disconnect(); await output.disconnect(); await audio.close() }
}
