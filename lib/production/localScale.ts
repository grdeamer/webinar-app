/** Local encoder controls. These are caps, not promises of delivered bitrate/FPS. */
export const LOCAL_PROFILES = {
  standard: { maxBitrate: 3_000_000, maxFramerate: 30, scaleResolutionDownBy: 1 },
  balanced: { maxBitrate: 1_500_000, maxFramerate: 30, scaleResolutionDownBy: 1 },
  economy: { maxBitrate: 600_000, maxFramerate: 15, scaleResolutionDownBy: 2 },
} as const
export type LocalProfile = keyof typeof LOCAL_PROFILES
export function parseLocalProfile(value: unknown): LocalProfile {
  if (typeof value !== 'string' || !Object.hasOwn(LOCAL_PROFILES, value)) throw new Error('Unknown local bitrate profile')
  return value as LocalProfile
}
export function counterRate(before: number, after: number, elapsedMs: number): number | null {
  if (![before, after, elapsedMs].every(Number.isFinite) || before < 0 || after < before || elapsedMs <= 0) return null
  return (after - before) * 1000 / elapsedMs
}
export function validateScalePlan(viewers: number, seconds: number, delayMs: number) {
  if (!Number.isInteger(viewers) || viewers < 1 || viewers > 4 || !Number.isInteger(seconds) || seconds < 10 || seconds > 30 || !Number.isInteger(delayMs) || delayMs < 0 || delayMs > 250) throw new Error('Local scale bounds: 1–4 receivers, 10–30 seconds, 0–250 ms control delay')
  return { viewers, seconds, delayMs }
}

/** Reclaimable estimate, not a promise of immediately free RAM. Inactive pages are counted once. */
export function macMemoryAvailable(vmStat: string): number {
  const pageSize = Number(vmStat.match(/page size of (\d+) bytes/)?.[1])
  const pages = ['free', 'inactive', 'speculative'].map(name => Number(vmStat.match(new RegExp(`Pages ${name}:\\s+(\\d+)`))?.[1]))
  if (!pageSize || !pages.every(Number.isSafeInteger) || pages.some(n => n < 0)) throw new Error('Unavailable macOS memory metadata')
  return pages.reduce((sum, n) => sum + n, 0) * pageSize
}
