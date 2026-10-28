import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertRuntimeMatch, nativeRuntimeFingerprint } from '../lib/production/releaseManifest.ts'

const root = resolve(import.meta.dirname, '..')
const expected = JSON.parse(readFileSync(resolve(root, 'tools/production-local/release/native-runtime.json'), 'utf8'))
assertRuntimeMatch(expected, nativeRuntimeFingerprint(root))
console.log('PASS checked native Node, Chrome, LiveKit binary and media dependency versions; no cloud access')
