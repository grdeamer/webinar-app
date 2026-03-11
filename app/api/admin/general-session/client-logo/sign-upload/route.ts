import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200): Response {
  return NextResponse.json(data, { status })
}

function safeBase(name: string) {
  return (
    name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "client-logo"
  )
}

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  const body = await req.json().catch(() => ({}))

  const fileName =
    typeof body?.fileName === "string" && body.fileName.trim()
      ? body.fileName.trim()
      : ""

  const fileSize =
    typeof body?.fileSize === "number" && Number.isFinite(body.fileSize)
      ? body.fileSize
      : 0

  if (!fileName) return json({ error: "Missing fileName" }, 400)
  if (!fileSize || fileSize <= 0) return json({ error: "Missing fileSize" }, 400)
  if (fileSize > 10 * 1024 * 1024) {
    return json({ error: "Logo must be 10MB or smaller" }, 400)
  }

  const ext = fileName.split(".").pop()?.toLowerCase() || ""
  const allowed = ["png", "jpg", "jpeg", "webp", "svg"]
  if (!allowed.includes(ext)) {
    return json({ error: "Allowed types: png, jpg, jpeg, webp, svg" }, 400)
  }

  const stamp = Date.now()
  const base = safeBase(fileName)
  const path = `general-session/client-logos/${base}-${stamp}.${ext}`

  const { data, error } = await supabaseAdmin.storage
    .from("private")
    .createSignedUploadUrl(path)

  if (error) return json({ error: error.message }, 400)

  return json({
    path,
    token: data?.token ?? null,
  })
}