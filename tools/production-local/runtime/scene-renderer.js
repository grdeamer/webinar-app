import { color, finite, fitRect, layout, orderedLayers, playbackSeconds } from './layout.js'

export function drawComposition(ctx, bus, state, inputs, assets, now = Date.now()) {
  const warnings = []
  ctx.save(); ctx.scale(2, 2); ctx.fillStyle = '#07111d'; ctx.fillRect(0, 0, 640, 360)
  for (const layer of orderedLayers(bus.composition)) {
    const p = layer.props, box = layout(p)
    if (box.hidden || box.opacity === 0 || layer.kind === 'audio') continue
    ctx.save(); ctx.globalAlpha = box.opacity; ctx.globalCompositeOperation = box.blend === 'normal' ? 'source-over' : box.blend
    ctx.translate(box.x + box.width / 2 + box.dx, box.y + box.height / 2 + box.dy)
    ctx.rotate(box.rotation * Math.PI / 180); ctx.scale(box.scale, box.scale); ctx.translate(-box.width / 2, -box.height / 2)
    const effects = []
    if (box.blur) effects.push(`blur(${box.blur}px)`)
    if (box.blend === 'overlay') effects.push('contrast(1.06) saturate(1.08)')
    if (box.blend === 'soft-light') effects.push('brightness(1.02) saturate(1.04)')
    if (box.blend === 'hard-light') effects.push('contrast(1.12) saturate(1.12)')
    if (box.blend === 'screen') effects.push('brightness(1.08)')
    if (box.glow) effects.push(`drop-shadow(0 0 ${Math.round(28 + box.glow * 52)}px ${color(p.glowColor, '#7dd3fc')})`)
    ctx.filter = effects.join(' ') || 'none'
    ctx.shadowColor = color(p.shadowColor, '#000000') + Math.round(Math.min(.45, box.shadow * .34) * 255).toString(16).padStart(2, '0')
    ctx.shadowBlur = box.shadow ? 48 : 0; ctx.shadowOffsetY = box.shadow ? 18 : 0
    ctx.fillStyle = layer.kind === 'text' ? color(p.backgroundColor, '#000000') : '#000000'
    ctx.beginPath(); ctx.roundRect(0, 0, box.width, box.height, Math.min(box.radius, box.width / 2, box.height / 2)); ctx.fill()
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.clip()
    if (layer.kind === 'text') {
      ctx.fillStyle = color(p.color); const size = finite(p.fontSize, 14, 8, 120)
      ctx.font = `${p.fontWeight === 'bold' ? 'bold' : 'normal'} ${size}px sans-serif`; ctx.textBaseline = 'top'
      let y = 8; const lineHeight = size * 1.25
      for (const paragraph of String(p.content || '').split('\n')) {
        let line = ''
        for (const word of paragraph.split(/\s+/)) {
          if (line && ctx.measureText(`${line} ${word}`).width > box.width - 16) { ctx.fillText(line, 8, y); y += lineHeight; line = word }
          else line += `${line ? ' ' : ''}${word}`
        }
        ctx.fillText(line, 8, y); y += lineHeight
      }
    } else {
      let drawable = assets.get(layer), fresh = true
      if (['camera', 'screen'].includes(layer.kind)) {
        const input = inputs.get(state.bindings[layer.sourceId]?.participantIdentity)
        fresh = Boolean(input?.lastFrameAt && performance.now() - input.lastFrameAt < 2000 && input.sourceProgressAtMs && now - input.sourceProgressAtMs < 2000)
        const hold = state.sources[layer.sourceId]?.fallback === 'hold-last'
        drawable = input?.video?.readyState >= 2 && (fresh || hold) ? input.video : null
        if (!fresh) warnings.push(`${layer.sourceId}: ${drawable ? 'holding last frame' : 'fallback slate'}`)
      }
      if (drawable instanceof HTMLVideoElement && layer.kind === 'video') {
        const duration = Number.isFinite(drawable.duration) ? drawable.duration : Number(drawable.dataset.localDuration)
        const intent = bus.playback[layer.id], position = playbackSeconds(intent, now, duration)
        if (Math.abs(drawable.currentTime - position) > .15) drawable.currentTime = position
        drawable.loop = Boolean(intent?.loop)
        if (intent && !intent.paused && (intent.loop || position < duration)) drawable.play().catch(() => {})
        else drawable.pause()
      }
      const width = drawable?.videoWidth || drawable?.naturalWidth || drawable?.width
      const height = drawable?.videoHeight || drawable?.naturalHeight || drawable?.height
      if (drawable && width && height) {
        const rect = fitRect(width, height, box.width, box.height, p.fit || (layer.kind === 'camera' ? 'cover' : 'contain'))
        ctx.drawImage(drawable, rect.x, rect.y, rect.width, rect.height)
      } else {
        ctx.fillStyle = '#152b3d'; ctx.fillRect(0, 0, box.width, box.height); ctx.fillStyle = '#e0bc85'; ctx.font = '14px sans-serif'
        ctx.fillText('Source unavailable / fallback slate', 12, 30)
      }
      if (!fresh) { ctx.fillStyle = '#efbd83'; ctx.font = '12px sans-serif'; ctx.fillText('SOURCE STALE', 10, box.height - 20) }
    }
    ctx.restore()
  }
  ctx.restore(); return warnings
}
