import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  try {

    const form = await req.formData()
    const file = form.get("file")
    const rowId = String(form.get("rowId") || "").trim()

    if (!rowId) return NextResponse.json({ error: "Missing rowId" }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 })
    if (file.type !== "video/mp4") {
      return NextResponse.json({ error: "Only video/mp4 allowed" }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const filenameSafe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `${rowId}/${Date.now()}_${filenameSafe}`

    const { error: upErr } = await supabaseAdmin.storage
      .from("general-session")
      .upload(storagePath, bytes, {
        contentType: "video/mp4",
        upsert: true,
      })

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // ✅ For private bucket: return path only. We'll sign it on the server page.
    return NextResponse.json({ ok: true, storagePath })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}