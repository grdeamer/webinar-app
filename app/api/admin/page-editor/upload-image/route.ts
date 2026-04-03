import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "-")
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filePath = `page-editor/images/${Date.now()}-${safeFileName(file.name)}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("upload")
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("upload")
      .getPublicUrl(filePath)

    return NextResponse.json({
      ok: true,
      path: filePath,
      url: publicUrlData.publicUrl,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    )
  }
}