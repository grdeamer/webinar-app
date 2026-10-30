import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { exportHostedReview } from '../lib/production/hostedMetadata.ts'
test('terminal metadata exports bounded retrievable chunks without raw private fields or media', t => {
  const dir = mkdtempSync(join(tmpdir(), 'hosted-review-test-')); t.after(() => rmSync(dir, { recursive: true, force: true }))
  const rows = Array.from({ length: 100 }, (_, i) => ({ atMs: i * 1000, elapsedMs: i * 1000, status: { privateCapability: 'must-not-export', sourceMedia: { 'source-a': { atMs: i * 1000, encoding: { framesEncoded: i * 30 } } }, observer: { videoTrackSid: 'video1', audioTrackSid: 'audio1', candidate: 'primary' }, generation: 1 }, resource: { availableBytes: 1000, networkBytes: i * 100, load: [2] } }))
  writeFileSync(join(dir, 'samples.ndjson'), rows.map(x => JSON.stringify(x)).join('\n'))
  exportHostedReview(dir, { runId: 'one-run', recordingEnabled: false })
  const manifest = JSON.parse(readFileSync(join(dir, 'review-manifest.json'), 'utf8'))
  const parts = Array.from({ length: manifest.chunks }, (_, i) => readFileSync(join(dir, `review-part-${i}`)))
  assert.ok(parts.every(x => x.length <= 900))
  const archive = Buffer.concat(parts); assert.equal(archive.length, manifest.bytes); assert.equal(createHash('sha256').update(archive).digest('hex'), manifest.sha256)
  const text = gunzipSync(archive).toString(), review = JSON.parse(text)
  assert.equal(text.includes('must-not-export'), false)
  assert.equal(review.rawSampleCount, 100); assert.equal(review.recordingEnabled, false)
  assert.equal(review.samples.at(-1)[0], 99000); assert.ok(review.samples.length < 100 && review.samples.length >= 31)
})
