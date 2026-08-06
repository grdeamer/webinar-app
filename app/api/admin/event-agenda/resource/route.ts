import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bucket = "upload"
const maxFileSize = 50 * 1024 * 1024

const allowedFiles: Record<string, Set<string>> = {
  pdf: new Set(["application/pdf"]),
  ppt: new Set(["application/vnd.ms-powerpoint", "application/octet-stream"]),
  pptx: new Set([
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/octet-stream",
  ]),
  xls: new Set(["application/vnd.ms-excel", "application/octet-stream"]),
  xlsx: new Set([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/octet-stream",
  ]),
  doc: new Set(["application/msword", "application/octet-stream"]),
  docx: new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
  ]),
  jpg: new Set(["image/jpeg"]),
  jpeg: new Set(["image/jpeg"]),
  png: new Set(["image/png"]),
  webp: new Set(["image/webp"]),
  csv: new Set(["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"]),
  txt: new Set(["text/plain"]),
  zip: new Set(["application/zip", "application/x-zip-compressed", "application/octet-stream"]),
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function extensionOf(name: string): string {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || ""
}

function hasValidSignature(bytes: Uint8Array, extension: string): boolean {
  if (extension === "pdf") return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
  if (extension === "jpg" || extension === "jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (extension === "png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)
  if (extension === "webp") return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  if (["pptx", "xlsx", "docx", "zip"].includes(extension)) return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b
  if (["ppt", "xls", "doc"].includes(extension)) return bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0
  return extension === "csv" || extension === "txt"
}

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  try {
    const form = await req.formData()
    const file = form.get("file")
    const eventId = form.get("event_id")

    if (!isUuid(eventId)) {
      return NextResponse.json({ error: "A valid event_id is required" }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a resource to upload" }, { status: 400 })
    }

    const extension = extensionOf(file.name)
    const allowedTypes = allowedFiles[extension]
    if (!allowedTypes || !allowedTypes.has(file.type || "application/octet-stream")) {
      return NextResponse.json({ error: "Upload a PDF, PowerPoint, Excel, Word, image, CSV, text, or ZIP file" }, { status: 400 })
    }
    if (file.size === 0 || file.size > maxFileSize) {
      return NextResponse.json({ error: "Resources must be between 1 byte and 50 MB" }, { status: 400 })
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!hasValidSignature(bytes, extension)) {
      return NextResponse.json({ error: "The uploaded file does not match its file type" }, { status: 400 })
    }

    const path = `event-agenda/resources/${eventId}/${randomUUID()}.${extension}`
    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    return NextResponse.json({
      ok: true,
      resource: {
        id: randomUUID(),
        label: file.name.replace(/\.[^.]+$/, ""),
        url: data.publicUrl,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resource upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
