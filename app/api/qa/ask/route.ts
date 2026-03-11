import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const slug = typeof body?.slug === "string" ? body.slug : "general-session"
  const question = typeof body?.question === "string" ? body.question.trim() : ""
  const askedBy = typeof body?.askedBy === "string" ? body.askedBy.trim() : null

  if (!question || question.length < 3) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 })
  }

  // Read session config
  const { data: session, error: sErr } = await supabaseAdmin
    .from("qa_sessions")
    .select("id, enabled, allow_anonymous")
    .eq("slug", slug)
    .maybeSingle()

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
  if (!session) return NextResponse.json({ error: "Q&A session not found." }, { status: 404 })
  if (!session.enabled) return NextResponse.json({ error: "Q&A is currently closed." }, { status: 403 })

  // Auth
  const supabase = createSupabaseServerClient()
  const { data: auth, error: authErr } = await supabase.auth.getUser()
  const user = auth?.user || null

  if (!session.allow_anonymous && !user) {
    return NextResponse.json({ error: "Please log in to submit a question." }, { status: 401 })
  }
  if (authErr && !user) {
    return NextResponse.json({ error: "Auth error. Please log in again." }, { status: 401 })
  }

  const asked_by =
    askedBy ||
    (user?.email ? user.email : null) ||
    (session.allow_anonymous ? "Anonymous" : null)

  const { error: insErr } = await supabaseAdmin.from("qa_questions").insert({
    session_id: session.id,
    asked_by,
    asked_by_user_id: user?.id ?? null,
    question,
    status: "pending",
  })

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
