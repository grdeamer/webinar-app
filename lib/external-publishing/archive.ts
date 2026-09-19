import JSZip from "jszip"
import type { PublishArtifact } from "./letsTemplate"

const maxArchiveFiles = 500
const maxExpandedBytes = 200 * 1024 * 1024

export function normalizeArchivePath(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "")
  const segments = normalized.split("/").filter(Boolean)
  if (!normalized || segments.some((segment) => segment === "." || segment === ".." || segment === ".jupiter")) {
    throw new Error("ZIP contains an unsafe path")
  }
  return segments.join("/")
}

function commonRoot(paths: string[]) {
  if (!paths.length) return null
  const first = paths[0].split("/")[0]
  return paths.every((filePath) => filePath.includes("/") && filePath.split("/")[0] === first)
    ? first
    : null
}

export async function extractPublishArchive(content: Buffer): Promise<PublishArtifact[]> {
  const archive = await JSZip.loadAsync(content, { checkCRC32: true })
  const entries = Object.values(archive.files).filter((entry) => !entry.dir && !entry.name.startsWith("__MACOSX/"))
  if (!entries.length) throw new Error("ZIP does not contain any files")
  if (entries.length > maxArchiveFiles) throw new Error(`ZIP may contain at most ${maxArchiveFiles} files`)

  const normalizedNames = entries.map((entry) => normalizeArchivePath(entry.name))
  const root = commonRoot(normalizedNames)
  let expandedBytes = 0
  const artifacts: PublishArtifact[] = []

  for (let index = 0; index < entries.length; index += 1) {
    let name = normalizedNames[index]
    if (root) name = normalizeArchivePath(name.slice(root.length + 1))
    const buffer = await entries[index].async("nodebuffer")
    expandedBytes += buffer.byteLength
    if (expandedBytes > maxExpandedBytes) throw new Error("Expanded ZIP may not exceed 200 MB")
    artifacts.push({ name, content: buffer })
  }

  return artifacts
}
