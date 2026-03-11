import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request): Promise<Response> {
  await requireAdmin()

  const body = await req.json().catch(() => null)
  const id = typeof body?.id === "string" ? body.id : ""
  const status = typeof body?.status === "string" ? body.status : null
  const pinned = typeof body?.pinned === "boolean" ? body.pinned : null

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  if (!status && pinned === null) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 })
  }

  if (pinned === true) {
    const { data: question, error: qErr } = await supabaseAdmin
      .from("qa_questions")
      .select("session_id")
      .eq("id", id)
      .single<{ session_id: string }>()

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

    await supabaseAdmin
      .from("qa_questions")
      .update({ pinned: false })
      .eq("session_id", question.session_id)
  }

  const patch: { status?: string; pinned?: boolean } = {}
  if (status) patch.status = status
  if (pinned !== null) patch.pinned = pinned

  const { error } = await supabaseAdmin
    .from("qa_questions")
    .update(patch)
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}