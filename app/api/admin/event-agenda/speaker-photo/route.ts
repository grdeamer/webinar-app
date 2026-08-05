import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bucket = "upload"
const maxFileSize = 5 * 1024 * 1024
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function hasValidSignature(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }

  if (contentType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
  }

  return (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png"
  if (contentType === "image/webp") return "webp"
  return "jpg"
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
      return NextResponse.json({ error: "Choose a speaker photo to upload" }, { status: 400 })
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        { error: "Speaker photos must be JPEG, PNG, or WebP" },
        { status: 400 }
      )
    }

    if (file.size === 0 || file.size > maxFileSize) {
      return NextResponse.json(
        { error: "Speaker photos must be between 1 byte and 5 MB" },
        { status: 400 }
      )
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!hasValidSignature(bytes, file.type)) {
      return NextResponse.json(
        { error: "The uploaded file does not match its image type" },
        { status: 400 }
      )
    }

    const path = `event-agenda/speakers/${eventId}/${randomUUID()}.${extensionFor(file.type)}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)

    return NextResponse.json({
      ok: true,
      path,
      url: data.publicUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speaker photo upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
