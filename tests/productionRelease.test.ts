import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertRuntimeMatch, sha256, verifyReleaseFiles } from '../lib/production/releaseManifest.ts'

test('a pinned runtime rejects drift and release integrity rejects altered files and paths', t => {
  assertRuntimeMatch({ node: '24.19.0', browser: 'fixed' }, { node: '24.19.0', browser: 'fixed' })
  assert.throws(() => assertRuntimeMatch({ node: '24.19.0' }, { node: '24.20.0' }), /differs/)
  const root = mkdtempSync(join(tmpdir(), 'jupiter-release-')); t.after(() => rmSync(root, { recursive: true, force: true }))
  const bytes = Buffer.from('reviewed runtime'); writeFileSync(join(root, 'runtime.ts'), bytes)
  verifyReleaseFiles(root, { 'runtime.ts': sha256(bytes) })
  writeFileSync(join(root, 'runtime.ts'), 'modified')
  assert.throws(() => verifyReleaseFiles(root, { 'runtime.ts': sha256(bytes) }), /integrity/)
  assert.throws(() => verifyReleaseFiles(root, { '../private': sha256(bytes) }), /Invalid/)
})
