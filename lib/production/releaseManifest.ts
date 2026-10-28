import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function sha256(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex') }
export function nativeRuntimeFingerprint(root: string) {
  if (process.platform !== 'darwin') throw new Error('The checked native runtime profile is macOS; the Linux container profile still requires its own build verification')
  const versions: Record<string, string> = {}
  for (const name of ['playwright-core', 'livekit-client', 'livekit-server-sdk', 'pdfjs-dist']) versions[name] = JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')).version
  const chrome = execFileSync('/usr/bin/plutil', ['-extract', 'CFBundleShortVersionString', 'raw', '-o', '-', '/Applications/Google Chrome.app/Contents/Info.plist'], { encoding: 'utf8' }).trim()
  return { platform: process.platform, architecture: process.arch, node: process.versions.node,
    chrome, chromeLauncherSha256: sha256(readFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')),
    livekit: execFileSync('/opt/homebrew/bin/livekit-server', ['--version'], { encoding: 'utf8' }).trim(),
    livekitSha256: sha256(readFileSync('/opt/homebrew/bin/livekit-server')), packages: versions }
}
export function assertRuntimeMatch(expected: unknown, actual: unknown) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('Native runtime differs from the checked profile; review dependency/browser drift before creating a release')
}
export function verifyReleaseFiles(root: string, files: Record<string, string>) {
  for (const [path, hash] of Object.entries(files)) {
    if (path.startsWith('/') || path.split('/').some(part => part === '..' || part.startsWith('.')) || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid release manifest path or hash')
    if (sha256(readFileSync(join(root, path))) !== hash) throw new Error(`Release integrity mismatch: ${path}`)
  }
}
