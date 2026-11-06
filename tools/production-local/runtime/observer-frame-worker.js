import { FrameMarkerReader, MARKER_WIDTH, MARKER_SIZE } from './marker.js'
import { ObserverFrameStats } from './observer-frame-stats.js'
let reader = null, stopped = false
self.onmessage = event => {
  if (event.data.stop) { stopped = true; void reader?.cancel().catch(() => {}); return }
  const surface = new OffscreenCanvas(MARKER_WIDTH, MARKER_SIZE), markers = new FrameMarkerReader(surface.getContext('2d', { willReadFrequently: true }))
  const stats = new ObserverFrameStats()
  reader = event.data.readable.getReader()
  void (async () => {
    let processingTotalMs = 0, processingMaxMs = 0
    try {
      while (!stopped) {
        const item = await reader.read(); if (item.done) break
        const frame = item.value, began = performance.now()
        try {
          const authority = await markers.read(frame, 0), program = await markers.read(frame, 1), provenance = await markers.read(frame, 2)
          stats.accept(authority, program, provenance, Date.now())
          const elapsed = performance.now() - began; processingTotalMs += elapsed; processingMaxMs = Math.max(processingMaxMs, elapsed)
          self.postMessage({ ...stats.snapshot(), nativeMarkerReads: markers.nativeReads, canvasMarkerReads: markers.canvasReads, processingTotalMs, processingMaxMs })
        } finally { frame.close() }
      }
    } catch { if (!stopped) self.postMessage({ error: 'Decoded-frame validation worker stopped' }) }
    finally { await reader.cancel().catch(() => {}) }
  })()
}
