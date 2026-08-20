import type { PreviewBlock } from "./useProducerBlocks"

const STORAGE_MARKER = "event-live/"

export function buildProducerAssetUrl(eventId: string, storagePath: string): string {
  return `/api/admin/events/${encodeURIComponent(eventId)}/live/assets/file?path=${encodeURIComponent(storagePath)}`
}

function extractStoragePath(eventId: string, source: string): string | null {
  if (!source) return null

  let decoded = source
  try {
    decoded = decodeURIComponent(source)
  } catch {
    // Keep the original source when it contains malformed escape sequences.
  }

  const expectedPrefix = `${STORAGE_MARKER}${eventId}/`
  const markerIndex = decoded.indexOf(expectedPrefix)
  if (markerIndex < 0) return null

  return decoded.slice(markerIndex).split("?")[0] || null
}

export function normalizeProducerAssetUrl(
  eventId: string,
  source?: string | null,
  storagePath?: string | null,
): string | null {
  const path =
    storagePath?.startsWith(`${STORAGE_MARKER}${eventId}/`)
      ? storagePath
      : extractStoragePath(eventId, source ?? "")

  return path ? buildProducerAssetUrl(eventId, path) : source ?? null
}

export function normalizeProducerBlocks(
  eventId: string,
  blocks: PreviewBlock[],
): PreviewBlock[] {
  return blocks.map((block) => {
    if (!block.src || !["image", "video", "pdf"].includes(block.type)) return block

    const src = normalizeProducerAssetUrl(eventId, block.src, block.storagePath)
    return src === block.src ? block : { ...block, src }
  })
}
