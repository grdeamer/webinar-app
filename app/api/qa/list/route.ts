// app/api/qa/list/route.ts

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const room_key = String(searchParams.get("room_key") || "general").trim() || "general"
    const admin = searchParams.get("admin") === "1"

    let query = supabaseAdmin
      .from("qa_messages")
      .select("*")
      .eq("room_key", room_key)
      .order("is_featured", { ascending: false })
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false })

    if (!admin) {
      query = query.in("status", ["approved", "answered"])
    }

    const { data, error } = await query

    if (error) return json({ error: error.message }, 400)

    return json({ items: data || [] })
  } catch (e: any) {
    return json({ error: e?.message || "Failed to load questions." }, 500)
  }
}