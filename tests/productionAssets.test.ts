import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalAssetLibrary } from '../lib/production/localAssetLibrary.ts'

test('local assets persist with stable content IDs, bounded types and no caller paths', t => {
  const directory = mkdtempSync(join(tmpdir(), 'jupiter-assets-')); t.after(() => rmSync(directory, { recursive: true, force: true }))
  const library = new LocalAssetLibrary(directory)
  const pdf = readFileSync(new URL('../tools/production-local/runtime/assets/deck.pdf', import.meta.url))
  const asset = library.add('../../local deck.pdf', 'application/pdf', pdf)
  assert.match(asset.id, /^asset-[a-f0-9]{64}$/)
  assert.equal(asset.kind, 'pdf')
  assert.equal(library.add('renamed.pdf', 'application/pdf', pdf).id, asset.id)
  assert.equal(library.list().length, 1)
  const reopened = new LocalAssetLibrary(directory)
  assert.deepEqual(readFileSync(reopened.resolve(asset.id).path), pdf)
  assert.throws(() => reopened.resolve('../../secret'), /Invalid/)
  assert.throws(() => library.add('bad.png', 'image/png', pdf), /header/)
  assert.throws(() => library.add('script.svg', 'image/svg+xml', pdf), /Use PNG/)
  assert.throws(() => library.add('large.pdf', 'application/pdf', Buffer.alloc(20_000_001)), /20 MB/)
  rmSync(reopened.resolve(asset.id).path)
  assert.throws(() => reopened.resolve(asset.id), /unavailable/)
})
