export const SOAK_OBSERVATION_MS = 60 * 60_000
export const SOAK_HARD_LIMIT_MS = 65 * 60_000
export const SOAK_FAULTS = [
  { atMs: 10 * 60_000, kind: 'stall' as const },
  { atMs: 25 * 60_000, kind: 'crash' as const },
  { atMs: 40 * 60_000, kind: 'stall' as const },
  { atMs: 55 * 60_000, kind: 'crash' as const },
]
export function haRuntimeBudget(soak: boolean, controlKey?: string) {
  if (soak && (!controlKey || !/^[a-f0-9]{64}$/.test(controlKey))) throw new Error('Managed soak requires a private local control capability')
  return { durationMs: soak ? SOAK_HARD_LIMIT_MS : 10 * 60_000, primaryRestarts: soak ? 2 : 1 }
}
export function assessSoakWindow(metrics: { fullHdThroughout: boolean; distinctFps: number; decodedFps: number; presentedFps: number; seconds: number }) {
  if (!metrics.fullHdThroughout) throw new Error('Soak resolution dropped below 1920×1080')
  if (metrics.seconds < 29) throw new Error('Incomplete steady soak window')
  if ([metrics.distinctFps, metrics.decodedFps, metrics.presentedFps].some(n => n > 30.5)) throw new Error('Steady soak FPS exceeded the 30.5 ceiling; possible duplicate frames')
  if (![metrics.distinctFps, metrics.decodedFps, metrics.presentedFps].every(n => Number.isFinite(n) && n >= 29.5)) throw new Error('Steady soak FPS fell below the 29.5 floor')
}
