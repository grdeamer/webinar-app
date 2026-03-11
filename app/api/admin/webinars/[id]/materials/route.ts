import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { Material } from "@/lib/types"

export const runtime = "nodejs"

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  )
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  try {
    const { id } = await context.params

    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid webinar id" }, { status: 400 })
    }

    const body = (await req.json()) as {
      agenda_pdf_url?: string | null
      materials?: Material[] | null
    }

    const agenda_pdf_url =
      typeof body.agenda_pdf_url === "string" && body.agenda_pdf_url.trim().length > 0
        ? body.agenda_pdf_url.trim()
        : null

    const materials = Array.isArray(body.materials)
      ? body.materials
          .filter((m) => m && typeof m.label === "string" && typeof m.url === "string")
          .map((m) => ({
            label: m.label.trim(),
            url: m.url.trim(),
            kind: m.kind,
          }))
          .filter((m) => m.label.length > 0 && m.url.length > 0)
      : []

    const { error } = await supabaseAdmin
      .from("webinars")
      .update({
        agenda_pdf_url,
        materials,
      })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    )
  }
}