import type { PreviewBlock } from "../../app/admin/events/[id]/producer/useProducerBlocks"
import type { BroadcastAssetTelemetry } from "../../app/admin/events/[id]/producer/BottomAssetDockAssetRenderers"

export const PREVIEW_ASSET_DRAG_TYPE = "application/x-jupiter-preview-block"

/** Keep asset identity, original media and slide number on both add and drag paths. */
export function previewBlockFromLibraryAsset(
  asset: BroadcastAssetTelemetry,
  id: string,
  { slide = 1, fullFrame = false }: { slide?: number; fullFrame?: boolean } = {},
): PreviewBlock {
  const page = asset.deck ? Math.max(1, Math.min(asset.deck.pageCount, Math.floor(slide))) : undefined
  const type = asset.assetKind ?? (asset.type === "audio" ? "audio" : asset.type === "video" ? "video" : "image")
  const source = asset.mediaUrl ?? asset.imageUrl ?? ""
  return {
    id, type, label: asset.label,
    src: page ? `${source.split("#")[0]}#page=${page}` : source,
    pdfPage: page, assetId: asset.id ?? null, storagePath: asset.storagePath ?? null,
    x: fullFrame ? 0 : 24, y: type === "audio" ? 306 : fullFrame ? 0 : 24,
    width: fullFrame ? 640 : 320, height: type === "audio" ? 54 : fullFrame ? 360 : 180,
    opacity: 1, scale: 1, rotation: 0, zIndex: 1,
    groupId: null, loop: asset.holding ?? /holding/i.test(`${asset.label} ${asset.segment ?? ""}`),
  }
}

export function appendPreviewAsset(current: PreviewBlock[], block: PreviewBlock, id: string): PreviewBlock[] {
  return [...current, { ...block, id, zIndex: current.reduce((top, item) => Math.max(top, item.zIndex ?? 0), 0) + 1 }]
}

/** Center the new layer at the pointer, keeping the entire layer inside Preview. */
export function positionPreviewAsset(block: PreviewBlock, x: number, y: number): PreviewBlock {
  const width = Math.max(1, Math.min(640, block.width))
  const height = Math.max(1, Math.min(360, block.height))
  return { ...block, width, height,
    x: Math.round(Math.max(0, Math.min(640 - width, x - width / 2))),
    y: Math.round(Math.max(0, Math.min(360 - height, y - height / 2))),
  }
}
