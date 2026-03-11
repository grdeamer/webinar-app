// app/api/qa/submit/route.ts

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { cleanName, cleanQuestion, normalizeRoomKey } from "@/lib/qa"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const room_key = normalizeRoomKey(body?.room_key, "general")
    const name = cleanName(body?.name)
    const question = cleanQuestion(body?.question)
    const event_id = body?.event_id ? String(body.event_id) : null

    if (!question) {
      return json({ error: "Question is required." }, 400)
    }

    const { data, error } = await supabaseAdmin
      .from("qa_messages")
      .insert({
        room_key,
        event_id,
        name,
        question,
        status: "pending",
        is_featured: false,
      })
      .select("*")
      .single()

    if (error) return json({ error: error.message }, 400)

    return json({ ok: true, message: data })
  } catch (e: any) {
    return json({ error: e?.message || "Failed to submit question." }, 500)
  }
}