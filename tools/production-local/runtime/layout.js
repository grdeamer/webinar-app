// Shared 640x360 producer-space geometry. No DOM, services or mutable state.
export const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity']
export function finite(value, fallback, min = -10000, max = 10000) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
}
export function layout(props) {
  if (props.groupId === 'source-route') props = { ...props, opacity: 1, borderRadius: 0, shadowIntensity: 0, blendMode: 'normal' }
  const progress = finite(props.animationProgress, 1, 0, 1)
  const ease = 1 - (1 - progress) ** 3
  const animation = props.animationType || 'none'
  return {
    x: finite(props.x, 0), y: finite(props.y, 0), width: finite(props.width, 640, 1, 1920), height: finite(props.height, 360, 1, 1080),
    scale: finite(props.scale, 1, .05, 5), rotation: finite(props.rotation, 0, -360, 360),
    opacity: finite(props.opacity, 1, 0, 1) * (animation === 'fade' ? ease : 1),
    dx: animation === 'push-left' ? -(1 - ease) * 120 : animation === 'push-right' ? (1 - ease) * 120 : 0,
    dy: animation === 'push-up' ? -(1 - ease) * 120 : animation === 'push-down' ? (1 - ease) * 120 : animation === 'drift' ? (1 - ease) * 18 : 0,
    radius: finite(props.borderRadius, 18, 0, 540), blur: finite(props.blur, 0, 0, 30),
    glow: finite(props.glow, 0, 0, 3), shadow: finite(props.shadowIntensity, .35, 0, 1),
    blend: BLENDS.includes(props.blendMode) ? props.blendMode : 'normal', hidden: props.hidden === true,
  }
}
export function fitRect(sourceWidth, sourceHeight, width, height, fit = 'contain') {
  if (![sourceWidth, sourceHeight, width, height].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid media dimensions')
  const scale = fit === 'cover' ? Math.max(width / sourceWidth, height / sourceHeight) : Math.min(width / sourceWidth, height / sourceHeight)
  const dw = sourceWidth * scale, dh = sourceHeight * scale
  return { x: (width - dw) / 2, y: (height - dh) / 2, width: dw, height: dh }
}
export function playbackSeconds(intent, nowMs, duration) {
  if (!intent || !Number.isFinite(duration) || duration <= 0) return 0
  const elapsed = intent.paused ? 0 : Math.max(0, nowMs - intent.anchorTimeMs)
  const position = Math.max(0, intent.positionMs + elapsed) / 1000
  return intent.loop ? position % duration : Math.min(position, duration)
}
export function color(value, fallback = '#ffffff') {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : fallback
}
export function orderedLayers(composition) {
  return composition.layers.map((layer, index) => ({ layer, index })).sort((a, b) => finite(a.layer.props.zIndex, 0) - finite(b.layer.props.zIndex, 0) || a.index - b.index).map(item => item.layer)
}
