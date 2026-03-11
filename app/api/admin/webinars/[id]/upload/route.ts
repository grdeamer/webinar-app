import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  )
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_")
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  await requireAdmin()

  try {
    const { id } = await context.params

    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid webinar id" }, { status: 400 })
    }

    const form = await req.formData()
    const file = form.get("file")
    const kind = String(form.get("kind") ?? "material")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const bucket = "webinar-materials"
    const original = safeName(file.name || "upload")
    const ts = Date.now()
    const folder = id
    const prefix = kind === "agenda" ? "agenda" : "material"
    const path = `${folder}/${prefix}-${ts}-${original}`

    const bytes = new Uint8Array(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const storageUrl = `storage:${bucket}/${path}`

    return NextResponse.json({
      ok: true,
      bucket,
      path,
      storageUrl,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 500 }
    )
  }
}