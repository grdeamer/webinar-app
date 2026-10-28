export type QualityPoint = { atMs: number; frames: number; decoded: number; presented: number; width: number; height: number; videoTrackSid: string; generation: number }
/** Counter-derived quality measurements. Startup, resets and publication switches cannot masquerade as FPS. */
export function qualityWindow(points: QualityPoint[]) {
  if (points.length < 2) throw new Error('Insufficient quality samples')
  const first = points[0], last = points.at(-1)!, durationMs = last.atMs - first.atMs
  if (durationMs < 10_000) throw new Error('Measure at least ten seconds after warmup')
  for (let index = 0; index < points.length; index++) {
    const x = points[index], prior = points[Math.max(0, index - 1)]
    if (![x.atMs, x.frames, x.decoded, x.presented].every(Number.isFinite) || ![x.frames, x.decoded, x.presented].every(n => Number.isSafeInteger(n) && n >= 0) || x.frames < prior.frames || x.decoded < prior.decoded || x.presented < prior.presented || (index > 0 && x.atMs <= prior.atMs) || x.videoTrackSid !== first.videoTrackSid || x.generation !== first.generation) throw new Error('Quality window crossed a reset, clock discontinuity or publication change')
  }
  const intervals: number[] = []
  let anchor = first
  for (const x of points) if (x.atMs - anchor.atMs >= 1000) { intervals.push((x.frames - anchor.frames) * 1000 / (x.atMs - anchor.atMs)); anchor = x }
  const sorted = intervals.toSorted((a, b) => a - b)
  return { seconds: durationMs / 1000, distinctFps: (last.frames - first.frames) * 1000 / durationMs, decodedFps: (last.decoded - first.decoded) * 1000 / durationMs,
    presentedFps: (last.presented - first.presented) * 1000 / durationMs, minimumWidth: Math.min(...points.map(x => x.width)), minimumHeight: Math.min(...points.map(x => x.height)), p05WindowFps: sorted[Math.floor(sorted.length * .05)] ?? null,
    fullHdThroughout: points.every(x => x.width === 1920 && x.height === 1080) }
}
