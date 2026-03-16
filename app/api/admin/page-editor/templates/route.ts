import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("page_templates")
    .select("*")
    .order("created_at", { ascending: false })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: Request) {
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