import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import crypto from "crypto"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
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
    const storagePath = `general-session/lower-panel/${id}_${Date.now()}_${filenameSafe}`

    const { error: upErr } = await supabaseAdmin.storage
      .from("private")
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: true,
      })

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    const kind = file.type === "application/pdf" ? "pdf" : "image"

    const { data: panel, error: dbErr } = await supabaseAdmin
      .from("general_session_lower_panel")
      .upsert(
        {
          id: 1,
          kind,
          name: file.name,
          path: storagePath,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("*")
      .single()

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, panel })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    )
  }
}
