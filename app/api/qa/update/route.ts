import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import type { QAStatus } from "@/lib/qa"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

const allowedStatuses = new Set<QAStatus>(["pending", "approved", "rejected", "answered"])

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const id = String(body?.id || "").trim()
    const action = String(body?.action || "").trim()
    const status = String(body?.status || "").trim() as QAStatus

    if (!id) return json({ error: "Missing question id." }, 400)

    if (action === "set_status") {
      if (!allowedStatuses.has(status)) {
        return json({ error: "Invalid status." }, 400)
      }

      const patch: any = { status }
      if (status === "answered") patch.answered_at = new Date().toISOString()

      const { data, error } = await supabaseAdmin
        .from("qa_messages")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single()

      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, message: data })
    }

    if (action === "feature") {
      const { data, error } = await supabaseAdmin
        .from("qa_messages")
        .update({
          is_featured: true,
          featured_at: new Date().toISOString(),
          status: "approved",
        })
        .eq("id", id)
        .select("*")
        .single()

      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, message: data })
    }

    if (action === "unfeature") {
      const { data, error } = await supabaseAdmin
        .from("qa_messages")
        .update({ is_featured: false })
        .eq("id", id)
        .select("*")
        .single()

      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, message: data })
    }

    return json({ error: "Invalid action." }, 400)
  } catch (e: any) {
    return json({ error: e?.message || "Failed to update question." }, 500)
  }
}