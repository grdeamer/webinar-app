import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
/** Compact counter-only evidence can be retrieved before the independent cloud expiry. */
export function exportHostedReview(directory: string, result: unknown) {
  const paths = [
    'sourceMedia.source-a.encoding.framesEncoded', 'sourceMedia.source-a.atMs',
    ...['primary', 'standby'].flatMap(role => ['rendered', 'frames', 'atMs', 'capture.written', 'encoding.framesEncoded', 'capture.clock.targetFps', 'capture.clock.drawTotalMs', 'capture.clock.drawMaxMs', 'capture.clock.maxLatenessMs', 'capture.clock.reanchors'].map(key => `candidateMedia.${role}.${key}`)),
    'gateway.capturedFrames', 'gateway.outputFrames', 'gateway.sent.framesEncoded', 'gateway.atMs', 'gateway.diagnostics.renderTotalMs', 'gateway.diagnostics.renderCount',
    'observer.validFrames', 'observer.rtc.framesDecoded', 'observer.presentedFrames', 'observer.rtc.framesDropped', 'observer.rtc.packetsLost', 'observer.generation', 'observer.revision', 'observer.selectionMismatches', 'observer.width', 'observer.height', 'observer.atMs',
  ]
  function field(value: unknown, path: string): unknown {
    for (const key of path.split('.')) value = value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : null
    return typeof value === 'number' ? Math.round(value * 1000) / 1000 : value ?? null
  }
  const file = join(directory, 'samples.ndjson')
  const raw = existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as { atMs: number; elapsedMs: number; status: unknown; resource: unknown }) : []
  const selected = raw.filter((_, index) => index % 10 === 0 || index >= raw.length - 31)
  const samples = selected.map(row => [row.atMs, row.elapsedMs, ...paths.map(path => field(row.status, path)), field(row.resource, 'availableBytes'), field(row.resource, 'networkBytes'), field(row.resource, 'load.0')])
  const identities = Object.fromEntries(['observer.videoTrackSid', 'observer.audioTrackSid', 'observer.candidate', 'generation'].map(path => [path, [...new Set(raw.map(row => field(row.status, path)))]]))
  const body = gzipSync(Buffer.from(JSON.stringify({ schemaVersion: 1, recordingEnabled: false, result, rawSampleCount: raw.length, sampling: 'Every tenth sample plus every sample in the final thirty seconds', columns: ['atMs', 'elapsedMs', ...paths, 'resource.availableBytes', 'resource.networkBytes', 'resource.load1'], identities, samples })))
  const chunks = Math.ceil(body.length / 900)
  for (let i = 0; i < chunks; i++) writeFileSync(join(directory, `review-part-${i}`), body.subarray(i * 900, (i + 1) * 900), { mode: 0o600 })
  writeFileSync(join(directory, 'review-manifest.json'), JSON.stringify({ chunks, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex'), recordingEnabled: false }), { mode: 0o600 })
}
