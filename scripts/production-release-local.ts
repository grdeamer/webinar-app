import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { assertRuntimeMatch, nativeRuntimeFingerprint, sha256, verifyReleaseFiles } from '../lib/production/releaseManifest.ts'

const root = resolve(import.meta.dirname, '..'), files: Record<string, string> = {}
const runtime = nativeRuntimeFingerprint(root)
assertRuntimeMatch(JSON.parse(readFileSync(join(root, 'tools/production-local/release/native-runtime.json'), 'utf8')), runtime)
function collect(relative: string) {
  for (const entry of readdirSync(join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) throw new Error('Unexpected hidden file or symlink in release sources')
    const path = `${relative}/${entry.name}`
    if (entry.isDirectory()) collect(path); else files[path] = sha256(readFileSync(join(root, path)))
  }
}
collect('lib/production'); collect('tools/production-local')
for (const path of ['package.json', 'package-lock.json', 'lib/live/producerControl.ts', 'scripts/production-local.ts', 'scripts/production-media-local.ts', 'scripts/production-preflight-local.ts', 'scripts/production-release-local.ts', 'scripts/verify-production-runtime-local.ts', 'scripts/verify-production-media-local.ts', 'scripts/verify-production-parity-local.ts', 'scripts/verify-production-delivery-local.ts', 'scripts/production-ha-local.ts', 'scripts/soak-production-ha-local.ts', 'scripts/load-production-ha-local.ts', 'scripts/production-producer-local.ts', 'scripts/verify-production-producer-local.ts', 'scripts/production-ha-soak-watchdog.py', 'scripts/verify-production-ha-quality-local.ts', 'scripts/verify-production-ha-local.ts', 'scripts/verify-production-scale-local.ts', 'scripts/measure-production-local.ts']) files[path] = sha256(readFileSync(join(root, path)))
const id = sha256(Buffer.from(JSON.stringify(files))), output = join(root, '.local/production/releases', id)
if (existsSync(output)) {
  const previous = JSON.parse(readFileSync(join(output, 'release-manifest.json'), 'utf8'))
  if (previous.id !== id || JSON.stringify(previous.files) !== JSON.stringify(files) || JSON.stringify(previous.runtime) !== JSON.stringify(runtime)) throw new Error('Existing release manifest differs from its content-addressed sources')
  verifyReleaseFiles(output, files)
}
else {
  for (const path of Object.keys(files)) { mkdirSync(dirname(join(output, path)), { recursive: true, mode: 0o700 }); copyFileSync(join(root, path), join(output, path)) }
  writeFileSync(join(output, 'release-manifest.json'), JSON.stringify({ schemaVersion: 1, id, runtime, files, containerImageBuilt: false, cloudDeployed: false }, null, 2), { mode: 0o600 })
}
verifyReleaseFiles(output, files)
console.log(`PASS content-addressed local source artifact ${id}\n${output}\nContainer image is prepared, not built; Docker is unavailable.`)
