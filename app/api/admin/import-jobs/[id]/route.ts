import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const { data, error } = await supabaseAdmin
    .from("import_jobs")
    .select("*")
    .eq("id", params.id)
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json(data)
}