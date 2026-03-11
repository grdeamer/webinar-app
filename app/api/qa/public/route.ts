import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get("slug") || "general-session"

  const { data: session, error: sErr } = await supabaseAdmin
    .from("qa_sessions")
    .select("id, slug, enabled, allow_anonymous")
    .eq("slug", slug)
    .maybeSingle()

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
  if (!session) {
    return NextResponse.json(
      { error: `Q&A session not found for slug: ${slug}. Did you run the qa.sql?` },
      { status: 404 }
    )
  }

  const { data: questions, error: qErr } = await supabaseAdmin
    .from("qa_questions")
    .select("id, question, asked_by, pinned, created_at")
    .eq("session_id", session.id)
    .eq("status", "approved")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200)

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  const pinned = (questions || []).find((q) => q.pinned) || null
  const list = (questions || []).filter((q) => !q.pinned)

  return NextResponse.json({
    slug: session.slug,
    enabled: session.enabled,
    allow_anonymous: session.allow_anonymous,
    pinned,
    questions: list,
  })
}
