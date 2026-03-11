import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import crypto from "crypto"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200): Response {
  return NextResponse.json(data, { status })
}

const MAX_BYTES = 2_000_000_000 // 2GB

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  try {
    const body = await req.json().catch(() => ({}))
    const fileName: string = body?.fileName || "general-session.mp4"
    const fileSize: number | null =
      typeof body?.fileSize === "number" ? body.fileSize : null

    if (!fileName.toLowerCase().endsWith(".mp4")) {
      return json({ error: "Only .mp4 files are allowed" }, 400)
    }

    if (fileSize != null && fileSize > MAX_BYTES) {
      return json({ error: "File too large (max 2GB)." }, 400)
    }

    const safeBase = fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-120)

    const id = crypto.randomUUID()
    const path = `general-session/${id}-${safeBase}`

    const { data, error } = await supabaseAdmin.storage
      .from("private")
      .createSignedUploadUrl(path, 60)

    if (error) return json({ error: error.message }, 400)

    return json({
      path: data.path,
      token: data.token,
    })
  } catch (e: any) {
    return json({ error: e?.message || "Unexpected error" }, 500)
  }
}