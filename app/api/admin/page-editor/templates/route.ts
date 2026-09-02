import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { BUILT_IN_PAGE_TEMPLATES } from "@/lib/page-editor/builtInTemplates"
import { requireAdmin } from "@/lib/requireAdmin"

export async function GET() {
  await requireAdmin()
  const { data, error } = await supabaseAdmin
    .from("page_templates")
    .select("*")
    .order("created_at", { ascending: false })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ templates: [...BUILT_IN_PAGE_TEMPLATES, ...(data ?? [])] })
}

export async function POST(req: Request) {
  await requireAdmin()
  const body = await req.json()
  const name = String(body?.name ?? "").trim().slice(0, 100)
  if (!name) return NextResponse.json({ error: "Template name required" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("page_templates")
    .insert({
      name,
      description: null,
      sections_json: Array.isArray(body?.sections) ? body.sections : [],
      elements_json: Array.isArray(body?.elements) ? body.elements : [],
      event_theme: body?.eventTheme && typeof body.eventTheme === "object" && !Array.isArray(body.eventTheme) ? body.eventTheme : {},
    })
    .select("*")
    .single()

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ template: data })
}
