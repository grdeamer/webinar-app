import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getContentType(file: File) {
  return file.type || "application/octet-stream"
}

function getExtension(filename: string) {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop() : ""
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const ext = getExtension(file.name)
    const safeExt = ext ? `.${ext}` : ""
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`

    let folder = "misc"

    if (file.type.startsWith("image/")) folder = "images"
    else if (file.type === "application/pdf") folder = "pdfs"
    else if (file.type.startsWith("video/")) folder = "videos"

    const path = `page-editor/${folder}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from("page-editor")
      .upload(path, buffer, {
        contentType: getContentType(file),
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from("page-editor").getPublicUrl(path)

    return NextResponse.json({
      path,
      url: publicData.publicUrl,
      fileName: file.name,
      contentType: file.type,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    )
  }
}