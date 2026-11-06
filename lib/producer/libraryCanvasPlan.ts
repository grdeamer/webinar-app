import type { PreviewBlock } from '../../app/admin/events/[id]/producer/useProducerBlocks'

export const MAX_LIBRARY_CANVAS_LAYERS = 16

/** Snapshot the complete Preview before preparing its private next-Program input. */
export function libraryCanvasPlan(blocks: PreviewBlock[]): PreviewBlock[] {
  const visible = blocks.filter(block => !block.hidden)
  if (!visible.length) throw Error('Add a visible library source before TAKE.')
  if (visible.length > MAX_LIBRARY_CANVAS_LAYERS) throw Error('A library canvas supports up to 16 visible layers.')
  if (visible.filter(block => block.type === 'video').length > 4) throw Error('A library canvas supports up to four simultaneous video files.')
  const ids = new Set<string>()
  for (const block of visible) {
    if (ids.has(block.id)) throw Error('Canvas layer identifiers must be unique.')
    ids.add(block.id)
    if (!['image', 'pdf', 'video', 'audio', 'text'].includes(block.type)) throw Error('Live camera slots are not library inputs. Use library video, slides, graphics, text or audio for this canvas.')
    if (block.type !== 'text' && !block.src) throw Error(`${block.label || 'Source'} is unavailable.`)
    for (const key of ['x', 'y', 'width', 'height', 'zIndex', 'opacity', 'scale', 'rotation', 'blur', 'borderRadius', 'mediaGain'] as const) {
      if (block[key] !== undefined && !Number.isFinite(block[key])) throw Error('Canvas layer geometry must be finite.')
    }
    if (block.width <= 0 || block.height <= 0 || block.width > 2560 || block.height > 1440) throw Error('Invalid canvas layer size.')
  }
  return structuredClone(visible).sort((a, b) => a.zIndex - b.zIndex)
}

/** A precomposed input already contains layer transforms; never apply them twice. */
export function libraryCanvasInputBlock(): PreviewBlock {
  return { id: 'library-canvas', type: 'video', label: 'Library canvas', x: 0, y: 0, width: 640, height: 360, zIndex: 1, opacity: 1, scale: 1, rotation: 0, borderRadius: 0, shadowIntensity: 0 }
}
