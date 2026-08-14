import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"

import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bucket = "upload"
const maxFileSize = 50 * 1024 * 1024
const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
])

function extensionOf(name: string): string {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "bin"
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id)
  if (auth instanceof Response) return auth

  const body = await req.json().catch((): null => null)
  const fileName = String(body?.fileName || "").slice(0, 255)
  const mimeType = String(body?.mimeType || "application/octet-stream")
  const byteSize = Number(body?.byteSize || 0)

  if (!fileName || !allowedTypes.has(mimeType)) {
    return NextResponse.json(
      { error: "Choose a PDF, image, MP4, WebM, or QuickTime file" },
      { status: 400 }
    )
  }
  if (!Number.isFinite(byteSize) || byteSize < 1 || byteSize > maxFileSize) {
    return NextResponse.json(
      { error: "Live assets must be between 1 byte and 50 MB" },
      { status: 400 }
    )
  }

  const extension = extensionOf(fileName)
  const path = `event-live/${id}/${randomUUID()}.${extension}`
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ path: data.path, token: data.token, bucket })
}
