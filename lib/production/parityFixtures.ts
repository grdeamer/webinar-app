import { importLegacyComposition } from './legacyComposition.ts'

const camera = (id: string, participant: string, x: number, y: number, width: number, height: number) => ({ id, type: 'camera-slot', assignedParticipantId: participant, x, y, width, height, borderRadius: 18, shadowIntensity: .35, zIndex: 1 })
const title = { id: 'lower-third', type: 'text', x: 28, y: 270, width: 480, height: 52, zIndex: 5, borderRadius: 10, fontSize: 18, fontWeight: 'bold', content: 'Jupiter / Independent Program\nLocal rendering parity', color: '#ffffff', backgroundColor: '#123b50' }
const logo = { id: 'brand', type: 'image', x: 534, y: 24, width: 78, height: 48, zIndex: 8, assetId: 'brand-mark', borderRadius: 0, shadowIntensity: 0 }
const definitions = [
  { id: 'two-presenters', name: 'Two presenters + lower third', blocks: [camera('a', 'presenter-a', 20, 70, 292, 164), camera('b', 'presenter-b', 328, 70, 292, 164), title, logo] },
  { id: 'slides-speaker', name: 'PDF slides + presenter', blocks: [{ id: 'deck', type: 'pdf', assetId: 'sample-deck', page: 1, x: 16, y: 46, width: 432, height: 243, zIndex: 1, borderRadius: 8 }, camera('a', 'presenter-a', 464, 110, 160, 90), logo] },
  { id: 'second-slide', name: 'PDF page 2', blocks: [{ id: 'deck', type: 'pdf', assetId: 'sample-deck', page: 2, x: 16, y: 24, width: 608, height: 302, zIndex: 1, borderRadius: 8 }] },
  { id: 'style-effects', name: 'Transforms, opacity + clipping', blocks: [{ ...camera('a', 'presenter-a', 76, 65, 280, 158), rotation: -8, scale: .95, glow: .3, glowColor: '#7dd3fc' }, { ...camera('b', 'presenter-b', 292, 108, 265, 149), rotation: 8, opacity: .8, zIndex: 2, borderRadius: 40 }, title, logo] },
  { id: 'motion-asset', name: 'Video asset + graphic', blocks: [{ id: 'clip', type: 'video', assetId: 'motion-clip', x: 20, y: 20, width: 600, height: 300, zIndex: 1, borderRadius: 0 }, logo] },
  { id: 'missing-source', name: 'Missing source / safe slate', blocks: [camera('missing', 'not-present', 20, 40, 600, 270), logo] },
]

/** Representative legacy-shaped fixtures; never reads a production event. */
export function parityFixtures() {
  return definitions.map(item => ({ id: item.id, name: item.name, composition: importLegacyComposition(item.blocks, { 'presenter-a': 'camera-a', 'presenter-b': 'camera-b', 'not-present': 'missing-camera' }, item.id) }))
}
