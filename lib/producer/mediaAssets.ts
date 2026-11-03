export type ProducerAssetKind = "image" | "pdf" | "video" | "audio"
export const PRODUCER_MEDIA_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/aac,audio/flac"
const kinds: Record<string, ProducerAssetKind> = {
  "image/png": "image", "image/jpeg": "image", "image/webp": "image", "image/gif": "image",
  "application/pdf": "pdf", "video/mp4": "video", "video/webm": "video", "video/quicktime": "video",
  "audio/mpeg": "audio", "audio/wav": "audio", "audio/x-wav": "audio", "audio/ogg": "audio",
  "audio/mp4": "audio", "audio/aac": "audio", "audio/flac": "audio",
}
export function producerAssetKind(mime: string): ProducerAssetKind | null { return kinds[mime] ?? null }
export function validateProducerMedia(mime: string, bytes: number): ProducerAssetKind {
  const kind = producerAssetKind(mime)
  if (!kind) throw new Error("Unsupported format. Choose PNG, JPEG, WebP, GIF, PDF, MP4, WebM, QuickTime, MP3, WAV, Ogg, M4A, AAC or FLAC.")
  if (!Number.isFinite(bytes) || bytes < 1 || bytes > 50 * 1024 * 1024) throw new Error("Live assets must be between 1 byte and 50 MB")
  return kind
}
export function uniqueProducerAssetLabel(base: string, labels: string[]): string {
  const label = base.trim() || "Source", existing = new Set(labels)
  let candidate = label, suffix = 2
  while (existing.has(candidate)) candidate = `${label} ${suffix++}`
  return candidate
}
export function isHoldingAsset(asset: { holding?: boolean; label: string; segment?: string }): boolean {
  return asset.holding ?? /holding/i.test(`${asset.label} ${asset.segment ?? ""}`)
}
