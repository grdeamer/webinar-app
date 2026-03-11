import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import crypto from "crypto"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  try {
    const form = await req.formData()
    const file = form.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"]
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF or image files allowed" },
        { status: 400 }
      )
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const filenameSafe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const id = crypto.randomUUID()
    const storagePath = `general-session/slides/${id}_${Date.now()}_${filenameSafe}`

    const { error: upErr } = await supabaseAdmin.storage
      .from("private")
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: true,
      })

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    const { data: row, error: dbErr } = await supabaseAdmin
      .from("general_session_slides")
      .insert({
        id,
        name: file.name,
        slide_path: storagePath,
      })
      .select("id,name,slide_path,created_at")
      .single()

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, slide: row })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    )
  }
}