import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import type { QASessionRow, QAQuestionRow } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized

  const url = new URL(req.url)
  const slug = url.searchParams.get("slug") || "general-session"

  const { data: session, error: sErr } = await supabaseAdmin
    .from("qa_sessions")
    .select("id, slug, enabled, allow_anonymous")
    .eq("slug", slug)
    .maybeSingle<QASessionRow>()

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: "Q&A session not found." }, { status: 404 })

  const { data: questions, error: qErr } = await supabaseAdmin
    .from("qa_questions")
    .select("id, question, asked_by, status, pinned, created_at")
    .eq("session_id", session.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<QAQuestionRow[]>()

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  return NextResponse.json({ session, questions: questions || [] })
}
