import type { PlaybackIntent, ProductionState } from "./contracts.ts"

/** Durable control timeline only; the future engine maps this to its media clock. */
export function playbackPositionAt(intent: PlaybackIntent, nowMs: number, durationMs?: number): number {
  const elapsed = intent.paused ? 0 : Math.max(0, nowMs - intent.anchorTimeMs)
  const position = intent.positionMs + elapsed
  if (durationMs === undefined) return position
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new RangeError("A positive media duration is required")
  return intent.loop ? position % durationMs : Math.min(position, durationMs)
}

export function transitionProgressAt(state: ProductionState, nowMs: number): number {
  if (!state.transition || state.transition.durationMs === 0) return 1
  return Math.max(0, Math.min(1, (nowMs - state.transition.startedAtMs) / state.transition.durationMs))
}
