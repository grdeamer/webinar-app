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

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  try {
    const body = await req.json().catch((): null => null)
    const eventId = body?.event_id
    const fileName = typeof body?.file_name === "string" ? body.file_name : ""
    const fileType = typeof body?.mime_type === "string" && body.mime_type ? body.mime_type : "application/octet-stream"
    const fileSize = typeof body?.size_bytes === "number" ? body.size_bytes : 0

    if (!isUuid(eventId)) {
      return NextResponse.json({ error: "A valid event_id is required" }, { status: 400 })
    }
    if (!fileName) {
      return NextResponse.json({ error: "Choose a resource to upload" }, { status: 400 })
    }

    const extension = extensionOf(fileName)
    const allowedTypes = allowedFiles[extension]
    if (!allowedTypes || !allowedTypes.has(fileType)) {
      return NextResponse.json({ error: "Upload a PDF, PowerPoint, Excel, Word, image, CSV, text, or ZIP file" }, { status: 400 })
    }
    if (fileSize === 0 || fileSize > maxFileSize) {
      return NextResponse.json({ error: "Resources must be between 1 byte and 50 MB" }, { status: 400 })
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

    const path = `event-agenda/resources/${eventId}/${randomUUID()}.${extension}`
    const { data: upload, error: uploadError } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path)

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    return NextResponse.json({
      ok: true,
      path: upload.path,
      token: upload.token,
      resource: {
        id: randomUUID(),
        label: fileName.replace(/\.[^.]+$/, ""),
        url: data.publicUrl,
        file_name: fileName,
        mime_type: fileType,
        size_bytes: fileSize,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resource upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
