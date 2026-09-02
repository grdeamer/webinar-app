import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const ALLOWED_MIME_PREFIXES = ["image/", "video/"]

function getContentType(file: File) {
  return file.type || "application/octet-stream"
}

function getExtension(filename: string) {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop() : ""
}

function getSafeBaseName(filename: string) {
  const withoutExtension = filename.replace(/\.[^.]+$/, "")
  return withoutExtension.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "asset"
}

function getDisplayName(storageName: string) {
  return storageName.replace(/^\d+-[a-z0-9]+-/, "")
}

function isEventId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function validateUpload(fileName: string, fileSize: number, contentType: string) {
  if (!fileName.trim()) return "File name required"
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_UPLOAD_BYTES) return "Files must be between 1 byte and 50 MB"
  if (contentType !== "application/pdf" && !ALLOWED_MIME_PREFIXES.some((prefix) => contentType.startsWith(prefix))) return "Only images, videos, and PDF files are supported"
  return null
}

function createAssetPath(eventId: string, fileName: string, contentType: string) {
  const ext = getExtension(fileName).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10)
  const safeExt = ext ? `.${ext}` : ""
  const storageName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${getSafeBaseName(fileName)}${safeExt}`
  const folder = contentType.startsWith("image/") ? "images" : contentType === "application/pdf" ? "pdfs" : contentType.startsWith("video/") ? "videos" : "misc"
  return `page-editor/${eventId}/${folder}/${storageName}`
}

export async function GET(req: Request) {
  try {
    const eventId = new URL(req.url).searchParams.get("eventId") ?? ""
    if (!isEventId(eventId)) return NextResponse.json({ error: "Valid eventId required" }, { status: 400 })
    const access = await requireEventOperatorAccess(eventId)
    if (access instanceof NextResponse) return access
    const supabase = supabaseAdmin

    const folders = ["images", "videos", "pdfs", "misc"]
    const locations = [...folders.map((folder) => ({ folder, trashed: false })), ...folders.map((folder) => ({ folder, trashed: true }))]
    const results = await Promise.all(locations.map(async ({ folder, trashed }) => {
      const prefix = `page-editor/${eventId}/${trashed ? `_trash/${folder}` : folder}`
      const { data, error } = await supabase.storage.from("page-editor").list(prefix, { limit: 100, sortBy: { column: "created_at", order: "desc" } })
      if (error) throw error
      return (data ?? []).filter((item) => item.name && item.id).map((item) => {
        const path = `${prefix}/${item.name}`
        const { data: publicData } = supabase.storage.from("page-editor").getPublicUrl(path)
        const activeStorageName = trashed ? item.name.replace(/^\d+-/, "") : item.name
        return { id: item.id, path, url: publicData.publicUrl, name: getDisplayName(activeStorageName), type: item.metadata?.mimetype ?? "application/octet-stream", trashed, originalPath: trashed ? `page-editor/${eventId}/${folder}/${activeStorageName}` : path }
      })
    }))
    return NextResponse.json({ assets: results.flat() })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Media library failed" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json()
      const eventId = String(body?.event_id ?? "")
      const fileName = String(body?.file_name ?? "")
      const fileSize = Number(body?.file_size)
      const contentType = String(body?.content_type ?? "")
      if (!isEventId(eventId)) return NextResponse.json({ error: "Valid event_id required" }, { status: 400 })
      const validationError = validateUpload(fileName, fileSize, contentType)
      if (validationError) return NextResponse.json({ error: validationError }, { status: validationError.includes("50 MB") ? 413 : 415 })
      const access = await requireEventOperatorAccess(eventId)
      if (access instanceof NextResponse) return access
      const path = createAssetPath(eventId, fileName, contentType)
      const { data, error } = await supabaseAdmin.storage.from("page-editor").createSignedUploadUrl(path)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const { data: publicData } = supabaseAdmin.storage.from("page-editor").getPublicUrl(path)
      return NextResponse.json({ path: data.path, token: data.token, signedUrl: data.signedUrl, url: publicData.publicUrl, fileName, contentType })
    }
    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }
    const validationError = validateUpload(file.name, file.size, file.type)
    if (validationError) return NextResponse.json({ error: validationError }, { status: validationError.includes("50 MB") ? 413 : 415 })

    const eventId = String(formData.get("event_id") ?? "")
    if (!isEventId(eventId)) return NextResponse.json({ error: "Valid event_id required" }, { status: 400 })
    const access = await requireEventOperatorAccess(eventId)
    if (access instanceof NextResponse) return access
    const supabase = supabaseAdmin

    const path = createAssetPath(eventId, file.name, file.type)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from("page-editor")
      .upload(path, buffer, {
        contentType: getContentType(file),
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from("page-editor").getPublicUrl(path)

    return NextResponse.json({
      path,
      url: publicData.publicUrl,
      fileName: file.name,
      contentType: file.type,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const eventId = String(body?.event_id ?? "")
    const path = String(body?.path ?? "")
    const url = String(body?.url ?? "")
    const permanent = body?.permanent === true
    const requiredPrefix = `page-editor/${eventId}/`
    if (!isEventId(eventId) || !path.startsWith(requiredPrefix) || path.includes("..")) {
      return NextResponse.json({ error: "Invalid asset path" }, { status: 400 })
    }
    const access = await requireEventOperatorAccess(eventId)
    if (access instanceof NextResponse) return access
    const supabase = supabaseAdmin
    if (!path.includes("/_trash/")) {
      const { data: pageRows, error: referenceError } = await supabase.from("event_page_sections").select("page_key,elements,page_theme").eq("event_id", eventId)
      if (referenceError) return NextResponse.json({ error: referenceError.message }, { status: 500 })
      const referencedBy = (pageRows ?? []).filter((row) => JSON.stringify({ elements: row.elements ?? [], eventTheme: row.page_theme ?? {} }).includes(url)).map((row) => row.page_key)
      if (url && referencedBy.length) {
        return NextResponse.json({ error: "Remove this asset from every page and wait for Saved before moving it to Trash.", code: "asset_in_use", referencedBy }, { status: 409 })
      }
      const relative = path.slice(requiredPrefix.length)
      const slash = relative.indexOf("/")
      if (slash < 1) return NextResponse.json({ error: "Invalid asset path" }, { status: 400 })
      const destination = `${requiredPrefix}_trash/${relative.slice(0, slash)}/${Date.now()}-${relative.slice(slash + 1)}`
      const { error } = await supabase.storage.from("page-editor").move(path, destination)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, trashed: true, path: destination })
    }
    if (!permanent) return NextResponse.json({ error: "Trash assets must be restored or permanently deleted." }, { status: 400 })
    const { error } = await supabase.storage.from("page-editor").remove([path])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const eventId = String(body?.event_id ?? "")
    const path = String(body?.path ?? "")
    const originalPath = String(body?.original_path ?? "")
    const requiredPrefix = `page-editor/${eventId}/`
    if (!isEventId(eventId) || !path.startsWith(`${requiredPrefix}_trash/`) || !originalPath.startsWith(requiredPrefix) || originalPath.includes("/_trash/") || path.includes("..") || originalPath.includes("..")) {
      return NextResponse.json({ error: "Invalid asset restore path" }, { status: 400 })
    }
    const access = await requireEventOperatorAccess(eventId)
    if (access instanceof NextResponse) return access
    const { error } = await supabaseAdmin.storage.from("page-editor").move(path, originalPath)
    if (error) return NextResponse.json({ error: error.message }, { status: error.message.toLowerCase().includes("exist") ? 409 : 500 })
    const { data: publicData } = supabaseAdmin.storage.from("page-editor").getPublicUrl(originalPath)
    return NextResponse.json({ ok: true, path: originalPath, url: publicData.publicUrl })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Restore failed" }, { status: 500 })
  }
}
