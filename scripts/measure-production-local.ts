import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LocalMediaSession } from '../lib/production/localMediaSession.ts'

const seconds = Number(process.argv[2] ?? 60)
if (!Number.isInteger(seconds) || seconds < 10 || seconds > 120) throw new Error('Choose 10-120 seconds; this never extends the media session')
const samples: ReturnType<LocalMediaSession['publicStatus']>[] = []
for (let n = 0; n <= seconds; n++) {
  const response = await fetch('http://127.0.0.1:4310/api/media/status')
  if (!response.ok) throw new Error('Local media status is unavailable')
  samples.push(await response.json())
  if (n !== seconds) await new Promise(resolve => setTimeout(resolve, 1000))
}
const first = samples[0], last = samples.at(-1)!
const elapsed = (last.observer.reportedAtMs - first.observer.reportedAtMs) / 1000
const fps = (last.observer.report.decodedFrames - first.observer.report.decodedFrames) / elapsed
const result = {
  measuredAtMs: Date.now(), elapsedSeconds: elapsed, uniqueDecodedFps: Math.round(fps * 100) / 100,
  encodedSendFps: Math.round((last.renderer.report.framesSent - first.renderer.report.framesSent) * 1000 / (last.renderer.reportedAtMs - first.renderer.reportedAtMs) * 100) / 100,
  width: last.observer.report.width, height: last.observer.report.height,
  unhealthySamples: samples.filter(s => s.engine.status !== 'healthy').length,
  generations: [...new Set(samples.map(s => s.engine.generation))],
  revisions: [...new Set(samples.map(s => s.engine.appliedRevision))],
  restarts: last.restarts - first.restarts,
  minimumIntervalFps: Math.min(...samples.map(s => s.observer.fps)),
  maximumIntervalFps: Math.max(...samples.map(s => s.observer.fps)),
  note: 'Local decoded Program measurement; not a cloud capacity, Full HD or sustained 30 fps certification.',
}
writeFileSync(resolve(import.meta.dirname, '../.local/production/media/parity-timing.json'), JSON.stringify(result, null, 2), { mode: 0o600 })
console.log(JSON.stringify(result, null, 2))
