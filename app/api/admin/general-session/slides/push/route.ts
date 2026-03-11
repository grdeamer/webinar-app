import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

type Action = "set" | "next" | "prev" | "clear"

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const body = await req.json().catch(() => ({}))
  const action = String(body?.action || "") as Action
  const slideId = typeof body?.slide_id === "string" ? body.slide_id : null

  // Load slides ordered by created_at asc so Next feels natural.
  const { data: slides, error: sErr } = await supabaseAdmin
    .from("general_session_slides")
    .select("id,name,slide_path,created_at")
    .order("created_at", { ascending: true })

  if (sErr) return json({ error: sErr.message }, 400)
  const list = Array.isArray(slides) ? slides : []

  // Load current program row (we store current slide_id + path)
  const { data: prog, error: pErr } = await supabaseAdmin
    .from("general_session_program")
    .select("program_slide_id,program_slide_path")
    .eq("id", 1)
    .maybeSingle()

  if (pErr) return json({ error: pErr.message }, 400)

  let nextSlide = null as any

  if (action === "clear") {
    const { error: uErr } = await supabaseAdmin
      .from("general_session_program")
      .update({ program_kind: "video", program_slide_id: null, program_slide_path: null, updated_at: new Date().toISOString() })
      .eq("id", 1)
    if (uErr) return json({ error: uErr.message }, 400)
    return json({ ok: true })
  }

  if (action === "set") {
    if (!slideId) return json({ error: "slide_id is required" }, 400)
    nextSlide = list.find((s: any) => s.id === slideId) || null
    if (!nextSlide) return json({ error: "Slide not found" }, 404)
  } else {
    // next/prev
    const currentId = prog?.program_slide_id || null
    const idx = currentId ? list.findIndex((s: any) => s.id === currentId) : -1

    if (list.length === 0) return json({ error: "No slides uploaded yet" }, 400)

    if (action === "next") {
      nextSlide = list[clamp(idx + 1, 0, list.length - 1)]
    } else if (action === "prev") {
      nextSlide = list[clamp(idx - 1, 0, list.length - 1)]
    } else {
      return json({ error: "Invalid action" }, 400)
    }
  }

  const { error: uErr } = await supabaseAdmin
    .from("general_session_program")
    .update({
      program_kind: "slides",
      program_slide_id: nextSlide.id,
      program_slide_path: nextSlide.slide_path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)

  if (uErr) return json({ error: uErr.message }, 400)

  return json({ ok: true, slide: { id: nextSlide.id, name: nextSlide.name } })
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}
