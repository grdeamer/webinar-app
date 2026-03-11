import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { SlideAssetRow } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET() {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const { data, error } = await supabaseAdmin
    .from("general_session_slides")
    .select("id,name,slide_path,created_at")
    .order("created_at", { ascending: false })
    .limit(25)
    .returns<SlideAssetRow[]>()

  if (error) return json({ error: error.message }, 400)
  return json({ slides: data || [] })
}
