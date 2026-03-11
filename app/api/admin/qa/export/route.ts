import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type QaExportRow = {
  id: string | null
  created_at: string | null
  name: string | null
  question: string | null
  status: string | null
  answered_at: string | null
  is_featured: boolean | null
  featured_at: string | null
}

function csvEscape(v: unknown) {
  const s = String(v ?? "")
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function safeFilePart(s: string) {
  return s.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const roomKey = url.searchParams.get("room_key") || "general"

  const { data, error } = await supabaseAdmin
    .from("qa_messages")
    .select("id,created_at,name,question,status,answered_at,is_featured,featured_at")
    .eq("room_key", roomKey)
    .order("created_at", { ascending: true })
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const rows = (data ?? []) as QaExportRow[]
  const header = ["id", "created_at", "name", "question", "status", "answered_at", "is_featured", "featured_at"]
  const lines = [
    header.join(","),
    ...rows.map((r) => header.map((h) => csvEscape(r[h as keyof QaExportRow])).join(",")),
  ]
  const csv = lines.join("\n")

  const today = new Date().toISOString().slice(0, 10)
  const filename = `${safeFilePart(roomKey)}-qa-${today}.csv`

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  })
}