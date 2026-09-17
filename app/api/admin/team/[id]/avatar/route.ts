import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const bucket = "upload"
const maxAvatarSize = 2 * 1024 * 1024
const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"])

function hasValidSignature(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { user } = await requireAdmin()
  const { id } = await context.params
  const [{ data: actor }, { data: target }] = await Promise.all([
    supabaseAdmin.from("profiles").select("team_role").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("profiles").select("role").eq("id", id).maybeSingle(),
  ])
  if (actor?.team_role !== "owner") {
    return NextResponse.json({ error: "Only the Owner can change another team member’s photo." }, { status: 403 })
  }
  if (target?.role !== "admin") {
    return NextResponse.json({ error: "This administrator account is not available." }, { status: 404 })
  }

  const { data: authUser, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(id)
  if (authLookupError || !authUser.user) {
    return NextResponse.json({ error: authLookupError?.message || "Account profile not found." }, { status: 404 })
  }

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a profile photo." }, { status: 400 })
  if (!allowedAvatarTypes.has(file.type)) return NextResponse.json({ error: "Profile photos must be JPEG, PNG, or WebP." }, { status: 400 })
  if (file.size === 0 || file.size > maxAvatarSize) return NextResponse.json({ error: "Profile photos must be 2 MB or smaller." }, { status: 400 })

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasValidSignature(bytes, file.type)) return NextResponse.json({ error: "The uploaded file does not match its image type." }, { status: 400 })

  const path = `profiles/${id}/avatar/${randomUUID()}.${extensionFor(file.type)}`
  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: publicUrl } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { ...authUser.user.user_metadata, avatar_url: publicUrl.publicUrl },
  })
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, avatarUrl: publicUrl.publicUrl })
}
