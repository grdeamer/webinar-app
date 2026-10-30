/** Native decoded media capture has no page-timer paint loop and never records the file. */
export function captureFileStream(video, includeAudio) {
  const capture = video.captureStream || video.mozCaptureStream
  if (typeof capture !== 'function') throw new Error('This browser cannot capture file playback natively. Use current Chrome; timer-based file capture is disabled.')
  const stream = capture.call(video)
  if (!stream.getVideoTracks().length) { stream.getTracks().forEach(track => track.stop()); throw new Error('The file has no capturable video track') }
  if (!includeAudio) for (const track of stream.getAudioTracks()) { stream.removeTrack(track); track.stop() }
  return stream
}

/** Count native track frames while playback is active; this is not pixel-distinctness evidence. */
export function watchNativeFrames(track, failed, playing = () => true) {
  if (typeof MediaStreamTrackProcessor === 'undefined') throw new Error('Native file-frame telemetry requires current Chrome')
  const clone = track.clone(), reader = new MediaStreamTrackProcessor({ track: clone }).readable.getReader()
  const probe = { frames: 0, error: null, stopped: false, async stop() { if (this.stopped) return; this.stopped = true; clone.stop(); await reader.cancel().catch(() => {}) } }
  let timestamp = null
  void (async () => {
    try {
      while (!probe.stopped) {
        const item = await reader.read()
        if (item.done) { if (!probe.stopped) throw new Error('Native file capture ended'); break }
        try { if (!probe.stopped && playing() && item.value.timestamp !== timestamp) { timestamp = item.value.timestamp; probe.frames++ } }
        finally { item.value.close() }
      }
    } catch { if (!probe.stopped) { probe.error = 'Native file-frame progress unavailable'; failed?.() } }
  })()
  return probe
}
