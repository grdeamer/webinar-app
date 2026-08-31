import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { canManageEventAccess, getEventTeamAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { recordAuditEvent } from "@/lib/cloud/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bucket = "upload"
const maxFileSize = 2 * 1024 * 1024
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

type Params = { params: Promise<{ id: string }> }

function hasValidSignature(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (contentType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
  }
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
}

function extensionFor(contentType: string): string {
  if (contentType === "image/png") return "png"
  if (contentType === "image/webp") return "webp"
  return "jpg"
}

async function authorize(id: string) {
  const access = await getEventTeamAccess(id)
  if (!access || !canManageEventAccess(access)) {
    return NextResponse.json({ error: "Your event role does not allow identity changes." }, { status: 403 })
  }
  return access
}

export async function POST(request: Request, context: Params): Promise<Response> {
  const { id } = await context.params
  const access = await authorize(id)
  if (access instanceof Response) return access

  try {
    const form = await request.formData()
    const file = form.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an event badge to upload." }, { status: 400 })
    }
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "Event badges must be JPEG, PNG, or WebP." }, { status: 400 })
    }
    if (file.size === 0 || file.size > maxFileSize) {
      return NextResponse.json({ error: "Event badges must be between 1 byte and 2 MB." }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!hasValidSignature(bytes, file.type)) {
      return NextResponse.json({ error: "The uploaded file does not match its image type." }, { status: 400 })
    }

    const path = `events/${access.eventId}/badge/${randomUUID()}.${extensionFor(file.type)}`
    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    })
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    const { error: updateError } = await supabaseAdmin
      .from("events")
      .update({ badge_image_url: data.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", access.eventId)

    if (updateError) {
      await supabaseAdmin.storage.from(bucket).remove([path])
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await recordAuditEvent({ eventId: access.eventId, actorId: access.user.id, actorEmail: access.user.email, category: "experience", action: "event.badge.updated", summary: "Updated event workspace badge", targetType: "event", targetId: access.eventId })

    return NextResponse.json({ ok: true, badgeImageUrl: data.publicUrl })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Badge upload failed." }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: Params): Promise<Response> {
  const { id } = await context.params
  const access = await authorize(id)
  if (access instanceof Response) return access

  const { error } = await supabaseAdmin
    .from("events")
    .update({ badge_image_url: null, updated_at: new Date().toISOString() })
    .eq("id", access.eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await recordAuditEvent({ eventId: access.eventId, actorId: access.user.id, actorEmail: access.user.email, category: "experience", action: "event.badge.reset", summary: "Restored the default Jupiter event badge", targetType: "event", targetId: access.eventId })
  return NextResponse.json({ ok: true, badgeImageUrl: null })
}
