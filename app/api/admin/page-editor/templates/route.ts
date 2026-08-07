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

  const { data, error } = await supabaseAdmin
    .from("page_templates")
    .insert({
      name: body.name,
      description: null,
      sections_json: body.sections ?? [],
      elements_json: body.elements ?? []
    })
    .select("*")
    .single()

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ template: data })
}
