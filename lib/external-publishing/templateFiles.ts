import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

export type TemplateArtifact = {
  name: string
  content: Buffer
}

const ignoredNames = new Set(["README.txt", "config.js"])

function safeRelativePath(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "")
  const parts = normalized.split("/")
  if (!normalized || parts.some((part) => !part || part === "." || part === ".." || part === ".jupiter")) {
    throw new Error("Template contains an unsafe path")
  }
  return normalized
}

export async function readTemplateArtifacts(root: string, relative = ""): Promise<TemplateArtifact[]> {
  const directory = path.join(root, relative)
  const entries = await readdir(directory, { withFileTypes: true })
  const artifacts: TemplateArtifact[] = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name.startsWith(".") || (!relative && ignoredNames.has(entry.name))) continue
    if (entry.isSymbolicLink()) throw new Error("Template symlinks are not supported")
    const childRelative = safeRelativePath(relative ? `${relative}/${entry.name}` : entry.name)
    if (entry.isDirectory()) {
      artifacts.push(...await readTemplateArtifacts(root, childRelative))
    } else if (entry.isFile()) {
      artifacts.push({ name: childRelative, content: await readFile(path.join(root, childRelative)) })
    }
  }

  return artifacts
}
