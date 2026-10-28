import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type LocalAsset = { id: string; name: string; type: string; bytes: number; kind: 'image' | 'pdf' | 'video' }
const types: Record<string, LocalAsset['kind']> = { 'image/png': 'image', 'image/jpeg': 'image', 'application/pdf': 'pdf', 'video/mp4': 'video', 'video/webm': 'video' }
/** Content-addressed local files; never accepts paths or fetches remote assets. */
export class LocalAssetLibrary {
  readonly directory: string
  constructor(directory: string) { this.directory = directory; mkdirSync(directory, { recursive: true, mode: 0o700 }) }
  list(): LocalAsset[] {
    const path = join(this.directory, 'manifest.json')
    if (!existsSync(path)) return []
    return JSON.parse(readFileSync(path, 'utf8')) as LocalAsset[]
  }
  add(name: string, type: string, bytes: Buffer): LocalAsset {
    if (!Object.hasOwn(types, type) || !bytes.length || bytes.length > 20_000_000) throw new Error('Use PNG, JPEG, PDF, MP4 or WebM, up to 20 MB')
    const valid = type === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : type === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
      : type === 'video/webm' ? bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))
      : bytes.subarray(4, 8).toString() === 'ftyp'
    if (!valid) throw new Error('Asset header does not match its file type')
    const id = `asset-${createHash('sha256').update(bytes).digest('hex')}`
    const assets = this.list(), previous = assets.find(asset => asset.id === id)
    if (previous) return previous
    if (assets.length >= 100 || assets.reduce((sum, asset) => sum + asset.bytes, 0) + bytes.length > 200_000_000) throw new Error('Local asset library limit reached')
    const asset: LocalAsset = { id, type, bytes: bytes.length, kind: types[type], name: name.replace(/[^\w .-]/g, '_').slice(0, 100) || 'Local asset' }
    writeFileSync(join(this.directory, id), bytes, { mode: 0o600 })
    const temporary = join(this.directory, 'manifest.tmp')
    writeFileSync(temporary, JSON.stringify([...assets, asset]), { mode: 0o600 }); renameSync(temporary, join(this.directory, 'manifest.json'))
    return asset
  }
  resolve(id: string): { path: string; asset: LocalAsset } {
    if (!/^asset-[a-f0-9]{64}$/.test(id)) throw new Error('Invalid local asset ID')
    const asset = this.list().find(asset => asset.id === id)
    if (!asset) throw new Error('Local asset is not registered')
    const path = join(this.directory, id)
    if (!existsSync(path)) throw new Error('Local asset file is unavailable')
    return { path, asset }
  }
}
