import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bucket = "upload"
const maxAvatarSize = 2 * 1024 * 1024
const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"])

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

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

export async function GET(): Promise<Response> {
  const { user, profile: accessProfile } = await requireAdmin()
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("full_name,email,role,team_role")
    .eq("id", user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    profile: {
      name: profile?.full_name ?? String(user.user_metadata?.full_name ?? ""),
      email: profile?.email ?? user.email ?? "",
      avatarUrl: String(user.user_metadata?.avatar_url ?? "") || null,
      role: profile?.team_role ?? accessProfile.role ?? "member",
    },
  })
}

export async function PATCH(request: Request): Promise<Response> {
  const { user } = await requireAdmin()
  const body = await request.json().catch((): null => null) as { name?: unknown; email?: unknown; avatarUrl?: unknown } | null
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : ""
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const avatarUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl.trim().slice(0, 2000) : null

  if (!name) return NextResponse.json({ error: "Enter your name." }, { status: 400 })
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    email,
    user_metadata: {
      ...user.user_metadata,
      full_name: name,
      avatar_url: avatarUrl,
    },
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: name, email })
    .eq("id", user.id)
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ ok: true, profile: { name, email, avatarUrl } })
}

export async function POST(request: Request): Promise<Response> {
  const { user } = await requireAdmin()
  const form = await request.formData()
  const file = form.get("file")

  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a profile photo." }, { status: 400 })
  if (!allowedAvatarTypes.has(file.type)) return NextResponse.json({ error: "Profile photos must be JPEG, PNG, or WebP." }, { status: 400 })
  if (file.size === 0 || file.size > maxAvatarSize) return NextResponse.json({ error: "Profile photos must be 2 MB or smaller." }, { status: 400 })

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasValidSignature(bytes, file.type)) return NextResponse.json({ error: "The uploaded file does not match its image type." }, { status: 400 })

  const path = `profiles/${user.id}/avatar/${randomUUID()}.${extensionFor(file.type)}`
  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ ok: true, avatarUrl: data.publicUrl })
}
