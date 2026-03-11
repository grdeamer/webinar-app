import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get("status") || "pending"
    const roomKey = url.searchParams.get("room_key") || "general"

    let query = supabaseAdmin
      .from("qa_messages")
      .select("id,name,question,status,created_at,updated_at,answered_at,is_featured,featured_at")
      .eq("room_key", roomKey)
      .order("created_at", { ascending: false })
      .limit(500)

    if (status !== "all") {
      query = query.eq("status", status)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ items: data ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error"
    console.error("admin qa list error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}