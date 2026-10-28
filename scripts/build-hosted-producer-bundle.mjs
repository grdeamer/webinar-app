import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..'), files = []
function include(directory) {
  for (const entry of readdirSync(resolve(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`
    if (directory === 'lib/production' && entry.name === 'hosted') continue
    if (directory === 'tools/production-local' && entry.name === 'release') continue
    if (entry.isDirectory()) include(path)
    else if (entry.isFile() && /\.(ts|js|html|css|svg)$/.test(entry.name)) files.push({ path, content: readFileSync(resolve(root, path)).toString('base64') })
  }
}
include('lib/production'); include('tools/production-local')
for (const path of ['lib/live/producerControl.ts', 'scripts/production-producer-hosted.ts', 'lib/production/hosted/protocol.ts', 'lib/production/hosted/transportPolicy.ts']) files.push({ path, content: readFileSync(resolve(root, path)).toString('base64') })
writeFileSync(resolve(root, 'tools/production-local/release/hosted-worker-files.json'), JSON.stringify(files))
console.log(`Prepared ${files.length} explicit hosted worker source files; no environment, local state or media files.`)
