import { LK, canvas, connect, jsonFetch, scheduleFrames, status } from './common.js'
import { LocalAssets } from './assets.js'
import { drawComposition } from './scene-renderer.js'
import { color, layout, orderedLayers } from './layout.js'

const assets = new LocalAssets(), inputs = new Map(), nodes = new Map()
const surface = canvas(1280, 720), ctx = surface.getContext('2d'), dom = document.getElementById('dom-scene')
let snapshot = null, pending = false, stopped = false
function buildDom() {
  dom.replaceChildren(); nodes.clear()
  for (const layer of orderedLayers(snapshot.preview.composition)) {
    const p = layer.props, b = layout(p)
    if (b.hidden || layer.kind === 'audio') continue
    const frame = document.createElement('div')
    Object.assign(frame.style, { position: 'absolute', left: `${b.x}px`, top: `${b.y}px`, width: `${b.width}px`, height: `${b.height}px`, opacity: b.opacity,
      transform: `translate(${b.dx}px,${b.dy}px) scale(${b.scale}) rotate(${b.rotation}deg)`, transformOrigin: 'center', overflow: 'hidden', borderRadius: `${b.radius}px`,
      mixBlendMode: b.blend, background: layer.kind === 'text' ? color(p.backgroundColor, '#000000') : 'black',
      filter: b.blur ? `blur(${b.blur}px)` : 'none', boxShadow: `0 18px 48px rgba(0,0,0,${Math.min(.45, b.shadow * .34)})${b.glow ? `, 0 0 ${Math.round(28 + b.glow * 52)}px ${color(p.glowColor, '#7dd3fc')}` : ''}` })
    if (layer.kind === 'text') {
      const text = document.createElement('div'); text.textContent = String(p.content || '')
      Object.assign(text.style, { padding: '8px', font: `${p.fontWeight === 'bold' ? 'bold' : 'normal'} ${p.fontSize || 14}px sans-serif`, lineHeight: '1.25', whiteSpace: 'pre-wrap', color: color(p.color) }); frame.append(text)
    } else {
      const media = document.createElement(['camera', 'screen', 'video'].includes(layer.kind) ? 'video' : 'img')
      if (media instanceof HTMLVideoElement) { media.muted = true; media.playsInline = true }
      Object.assign(media.style, { width: '100%', height: '100%', objectFit: p.fit || (layer.kind === 'camera' ? 'cover' : 'contain') })
      const asset = assets.get(layer)
      if (media instanceof HTMLImageElement && asset) media.src = asset instanceof HTMLCanvasElement ? asset.toDataURL() : asset.src
      if (layer.kind === 'video' && asset) { media.src = asset.src; media.loop = true; media.play().catch(() => {}) }
      const fallback = document.createElement('div'); fallback.className = 'reference-fallback'; fallback.textContent = 'Source unavailable / fallback slate'
      fallback.hidden = Boolean(asset); media.hidden = !asset && !['camera', 'screen'].includes(layer.kind)
      frame.append(media, fallback); nodes.set(layer.id, { media, fallback })
    }
    dom.append(frame)
  }
}
const viewport = document.querySelector('.reference-viewport')
const resize = new ResizeObserver(() => { dom.style.transform = `scale(${viewport.clientWidth / 640})` })
resize.observe(viewport)
async function read() {
  if (pending || stopped) return
  pending = true
  try {
    const { state, sourceReports } = await jsonFetch('/api/state')
    for (const [id, report] of Object.entries(sourceReports || {})) {
      const input = inputs.get(state.bindings[id]?.participantIdentity)
      if (input) input.sourceProgressAtMs = report.progressedAtMs
    }
    if (state.revision !== snapshot?.revision) { await assets.prepare(state.preview.composition); snapshot = state; buildDom() }
    status(`Preview revision ${state.revision} / ${state.preview.composition.sceneId || 'custom scene'} / comparison only`)
  } catch (error) { status(`Comparison: ${error.message}`) }
  finally { pending = false }
}
const { room } = await connect('preview', (track, publication, participant) => {
  if (track.kind !== LK.Track.Kind.Video) return
  const video = document.createElement('video'); video.muted = true; video.srcObject = new MediaStream([track.mediaStreamTrack]); video.play().catch(() => {})
  const input = { video, lastFrameAt: 0, decoded: 0 }; inputs.set(participant.identity, input)
  function frame() { input.lastFrameAt = performance.now(); input.decoded++; if (!stopped) video.requestVideoFrameCallback(frame) }
  video.requestVideoFrameCallback(frame)
})
await read(); const poll = setInterval(() => void read(), 500)
const stopFrames = scheduleFrames(() => {
  if (!snapshot) return
  document.getElementById('parity-warnings').textContent = drawComposition(ctx, snapshot.preview, snapshot, inputs, assets).join(' / ')
  for (const layer of snapshot.preview.composition.layers) {
    const node = nodes.get(layer.id)
    if (!node || !['camera', 'screen'].includes(layer.kind)) continue
    const input = inputs.get(snapshot.bindings[layer.sourceId]?.participantIdentity), fresh = input && performance.now() - input.lastFrameAt < 2000 && input.sourceProgressAtMs && Date.now() - input.sourceProgressAtMs < 2000
    const visible = input?.video.readyState >= 2 && (fresh || snapshot.sources[layer.sourceId]?.fallback === 'hold-last')
    if (visible && node.media.srcObject !== input.video.srcObject) { node.media.srcObject = input.video.srcObject; node.media.play().catch(() => {}) }
    node.media.hidden = !visible; node.fallback.hidden = Boolean(visible)
    if (!fresh && visible) { node.fallback.hidden = false; node.fallback.textContent = 'SOURCE STALE / HOLDING LAST FRAME' }
  }
})
async function stop() { if (stopped) return; stopped = true; clearInterval(poll); resize.disconnect(); stopFrames(); assets.dispose(); await room.disconnect(); status('Comparison expired. Reload to start another two-minute local view.') }
setTimeout(() => void stop(), 120_000)
window.addEventListener('pagehide', () => void stop())
