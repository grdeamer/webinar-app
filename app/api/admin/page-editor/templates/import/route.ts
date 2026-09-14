import { randomUUID } from "node:crypto"
import path from "node:path"
import JSZip from "jszip"
import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { CUSTOM_CODE_SECTION_ID } from "@/lib/page-editor/customCode"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024
const MAX_EXTRACTED_BYTES = 40 * 1024 * 1024
const MAX_FILE_COUNT = 250
const ASSET_EXTENSIONS = new Set([
  ".avif", ".gif", ".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp",
  ".eot", ".otf", ".ttf", ".woff", ".woff2",
  ".mp3", ".mp4", ".ogg", ".pdf", ".webm",
])

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status })
}

function safeArchivePath(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "")
  if (!normalized || normalized.startsWith("/") || normalized.includes("\0")) return null
  const segments = normalized.split("/")
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null
  return segments.join("/")
}

function safeStoragePath(value: string) {
  return value
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "asset")
    .join("/")
}

function contentTypeFor(fileName: string) {
  switch (path.posix.extname(fileName).toLowerCase()) {
    case ".avif": return "image/avif"
    case ".gif": return "image/gif"
    case ".ico": return "image/x-icon"
    case ".jpeg": case ".jpg": return "image/jpeg"
    case ".png": return "image/png"
    case ".svg": return "image/svg+xml"
    case ".webp": return "image/webp"
    case ".eot": return "application/vnd.ms-fontobject"
    case ".otf": return "font/otf"
    case ".ttf": return "font/ttf"
    case ".woff": return "font/woff"
    case ".woff2": return "font/woff2"
    case ".mp3": return "audio/mpeg"
    case ".mp4": return "video/mp4"
    case ".ogg": return "audio/ogg"
    case ".pdf": return "application/pdf"
    case ".webm": return "video/webm"
    default: return "application/octet-stream"
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function replaceAssetReferences(source: string, replacements: Map<string, string>) {
  let result = source
  const uniqueBaseNames = new Map<string, string | null>()
  for (const [name, url] of replacements) {
    const baseName = path.posix.basename(name)
    uniqueBaseNames.set(baseName, uniqueBaseNames.has(baseName) ? null : url)
  }

  const references = [
    ...replacements.entries(),
    ...[...uniqueBaseNames.entries()].filter((entry): entry is [string, string] => Boolean(entry[1])),
  ].sort((left, right) => right[0].length - left[0].length)

  for (const [reference, url] of references) {
    result = result.replace(new RegExp(escapeRegExp(reference), "g"), url)
    result = result.replace(new RegExp(escapeRegExp(encodeURI(reference)), "g"), url)
  }
  return result
}

function extractBody(html: string) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)
  return (body?.[1] ?? html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .trim()
}

function extractInlineScripts(html: string) {
  return [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean)
}

function getRootPrefix(indexPath: string) {
  const directory = path.posix.dirname(indexPath)
  return directory === "." ? "" : `${directory}/`
}

function relativeToRoot(filePath: string, rootPrefix: string) {
  return rootPrefix && filePath.startsWith(rootPrefix) ? filePath.slice(rootPrefix.length) : filePath
}

export async function POST(request: Request) {
  const form = await request.formData().catch((): null => null)
  const file = form?.get("file")
  const eventId = String(form?.get("event_id") ?? "").trim()
  const requestedName = String(form?.get("name") ?? "").trim().slice(0, 100)

  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".zip")) {
    return json({ error: "Choose a ZIP file containing index.html" }, 400)
  }
  if (file.size < 1 || file.size > MAX_ARCHIVE_BYTES) {
    return json({ error: "Template ZIP files must be smaller than 20 MB" }, 413)
  }

  const access = await requireEventOperatorAccess(eventId)
  if (access instanceof NextResponse) return access

  const archive = await JSZip.loadAsync(await file.arrayBuffer()).catch((): null => null)
  if (!archive) return json({ error: "The ZIP file could not be opened" }, 400)

  const entries = Object.values(archive.files).filter((entry) => !entry.dir && !entry.name.startsWith("__MACOSX/"))
  if (!entries.length || entries.length > MAX_FILE_COUNT) {
    return json({ error: `Template ZIP files may contain up to ${MAX_FILE_COUNT} files` }, 400)
  }

  const normalizedEntries = entries.map((entry) => ({ entry, name: safeArchivePath(entry.name) }))
  if (normalizedEntries.some(({ name }) => !name)) {
    return json({ error: "The ZIP contains an unsafe file path" }, 400)
  }

  const indexEntry = normalizedEntries
    .filter(({ name }) => name?.toLowerCase().endsWith("index.html"))
    .sort((left, right) => left.name!.length - right.name!.length)[0]
  if (!indexEntry?.name) return json({ error: "The ZIP must contain an index.html file" }, 400)

  const rootPrefix = getRootPrefix(indexEntry.name)
  const files = new Map<string, Buffer>()
  let extractedBytes = 0
  for (const { entry, name } of normalizedEntries) {
    const buffer = Buffer.from(await entry.async("uint8array"))
    extractedBytes += buffer.byteLength
    if (extractedBytes > MAX_EXTRACTED_BYTES) {
      return json({ error: "The extracted template is larger than 40 MB" }, 413)
    }
    files.set(name!, buffer)
  }

  const importId = randomUUID()
  const storagePrefix = `page-editor/${access.eventId}/template-imports/${importId}`
  const replacements = new Map<string, string>()
  const uploadedPaths: string[] = []

  try {
    for (const [archivePath, buffer] of files) {
      const relativePath = relativeToRoot(archivePath, rootPrefix)
      if (!ASSET_EXTENSIONS.has(path.posix.extname(relativePath).toLowerCase())) continue
      const storagePath = `${storagePrefix}/${safeStoragePath(relativePath)}`
      const { error } = await supabaseAdmin.storage.from("page-editor").upload(storagePath, buffer, {
        contentType: contentTypeFor(relativePath),
        cacheControl: "31536000",
        upsert: false,
      })
      if (error) throw error
      uploadedPaths.push(storagePath)
      const { data } = supabaseAdmin.storage.from("page-editor").getPublicUrl(storagePath)
      replacements.set(relativePath, data.publicUrl)
    }

    const sourceHtml = files.get(indexEntry.name)?.toString("utf8") ?? ""
    const css = [...files.entries()]
      .filter(([name]) => name.toLowerCase().endsWith(".css"))
      .map(([, content]) => content.toString("utf8"))
      .join("\n\n")
    const localScripts = [...files.entries()]
      .filter(([name]) => name.toLowerCase().endsWith(".js") && path.posix.basename(name).toLowerCase() !== "config.js")
      .map(([, content]) => content.toString("utf8"))
    const script = replaceAssetReferences([...extractInlineScripts(sourceHtml), ...localScripts].join("\n\n"), replacements)
    const customHtml = replaceAssetReferences(extractBody(sourceHtml), replacements)
    const customCss = replaceAssetReferences(css, replacements)
    const favicon = [...replacements.entries()].find(([name]) => /^favicon\.(?:ico|png|svg)$/i.test(path.posix.basename(name)))?.[1]
    const customHeadHtml = favicon ? `<link rel="icon" href="${favicon}">` : ""
    const templateName = requestedName || file.name.replace(/\.zip$/i, "").trim().slice(0, 100) || "Imported site"

    const { data: template, error: templateError } = await supabaseAdmin
      .from("page_templates")
      .insert({
        name: templateName,
        description: `Imported from ${file.name}`,
        sections_json: [{
          id: CUSTOM_CODE_SECTION_ID,
          type: "content",
          config: {
            visible: false,
            adminLabel: `Imported site · ${templateName}`,
            customCodeMode: true,
            customHtml,
            customCss,
            customScript: script,
            customHeadHtml,
            importedTemplateName: templateName,
            importedAssetPaths: uploadedPaths,
          },
          blocks: [],
        }],
        elements_json: [],
        event_theme: { pageBackgroundColor: "#ffffff", panelBackgroundColor: "#ffffff", textColor: "#11161c" },
      })
      .select("*")
      .single()

    if (templateError || !template) throw templateError || new Error("Template could not be saved")
    return json({ template, imported: { files: entries.length, assets: uploadedPaths.length } }, 201)
  } catch (error) {
    if (uploadedPaths.length) await supabaseAdmin.storage.from("page-editor").remove(uploadedPaths)
    return json({ error: error instanceof Error ? error.message : "Template import failed" }, 500)
  }
}
