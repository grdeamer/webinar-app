export const LK = window.LivekitClient
export const capability = location.hash.slice(1)
export const health = { appliedRevision: 0, framesRendered: 0, framesSent: 0, audioPackets: 0, decodedFrames: 0, decodedRevision: null, markerFrame: null, width: 0, height: 0, error: null, audioRms: 0, contentSource: null, inputFrames: {}, transitionFrames: 0, generation: 0, firstDecodedAtMs: 0, lastDecodedAtMs: 0 }
window.localMediaHealth = health

export function status(text) { document.getElementById('runtime-status').textContent = text }

export async function jsonFetch(path, body, cap = capability) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Runtime-Capability': cap },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Local media request failed')
  return data
}

export async function connect(role, onTrack) {
  const config = await jsonFetch('/api/media/token', { role })
  const room = new LK.Room({ adaptiveStream: false, dynacast: false, disconnectOnPageLeave: true,
    rtcConfig: { iceServers: [], iceTransportPolicy: 'all' } })
  if (onTrack) room.on(LK.RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (window.localHaVideo && track.kind === LK.Track.Kind.Video) publication.setVideoQuality(LK.VideoQuality.HIGH)
    onTrack(track, publication, participant)
  })
  room.on(LK.RoomEvent.Disconnected, () => { health.error = 'Local LiveKit connection lost' })
  room.on(LK.RoomEvent.Reconnected, () => { if (health.error === 'Local LiveKit connection lost') health.error = null })
  await room.connect(config.url, config.token, { autoSubscribe: true, rtcConfig: { iceServers: [] } })
  return { room, config }
}

export function canvas(width, height) {
  const element = document.createElement('canvas'); element.width = width; element.height = height
  document.getElementById('media').append(element)
  return element
}

export function scheduleFrames(draw, fps = 30) {
  let stopped = false; let deadline = performance.now()
  function tick() {
    if (stopped) return
    draw(performance.now()); deadline += 1000 / fps
    if (deadline < performance.now() - 1000 / fps) deadline = performance.now() + 1000 / fps
    setTimeout(tick, Math.max(0, deadline - performance.now()))
  }
  tick()
  return () => { stopped = true }
}

export async function senderCounters(videoTrack, audioTrack) {
  let frames = 0; let packets = 0; let width = 0; let height = 0; let bytes = 0; let framesEncoded = 0; let totalEncodeTime = 0; let qualityLimitationReason = null; let encoderImplementation = null; let codec = null
  for (const track of [videoTrack, audioTrack]) {
    const report = await track?.sender?.getStats()
    report?.forEach(stat => {
      if (stat.type !== 'outbound-rtp' || stat.isRemote) return
      if (stat.kind === 'video') { frames += stat.framesSent || 0; width = stat.frameWidth || 0; height = stat.frameHeight || 0; bytes += stat.bytesSent || 0; framesEncoded += stat.framesEncoded || 0; totalEncodeTime += stat.totalEncodeTime || 0; qualityLimitationReason = stat.qualityLimitationReason ?? null; encoderImplementation = stat.encoderImplementation ?? null; codec = report.get(stat.codecId)?.mimeType ?? null }
      if (stat.kind === 'audio') packets += stat.packetsSent || 0
    })
  }
  return { frames, packets, width, height, bytes, framesEncoded, totalEncodeTime, qualityLimitationReason, encoderImplementation, codec }
}

export function reportEverySecond(role, callback, intervalMs = 1000) {
  let pending = false; let transportError = null
  const timer = setInterval(async () => {
    if (pending) return
    pending = true
    try { if (health.error === transportError) health.error = null; await callback(); const control = await jsonFetch(`/api/media/report?role=${role}`, health); window.localMediaFault = control.fault === true; transportError = null }
    catch (error) { transportError = error.message; health.error = transportError }
    finally { pending = false }
  }, intervalMs)
  return () => clearInterval(timer)
}
