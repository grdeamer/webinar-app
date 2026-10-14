import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function normEmail(v: unknown) {
  return typeof v === "string" ? v.trim().toLowerCase() : ""
}

function cleanOptionalString(v: unknown) {
  if (typeof v !== "string") return null
  const s = v.trim()
  return s ? s : null
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: event_id } = await context.params
    const eventAccess = await requireEventOperatorAccess(event_id, ["event_admin", "producer"], "people")
    if (eventAccess instanceof Response) return eventAccess
    const body = await req.json().catch(() => ({}))

    const email = normEmail(body.email)
    const first_name = cleanOptionalString(body.first_name)
    const last_name = cleanOptionalString(body.last_name)
    const tag = body.role === "presenter" ? "Presenter" : "Registrant"

    if (!email || !email.includes("@")) {
      return json({ error: "Valid email required" }, 400)
    }

    const { data: saved, error: saveError } = await supabaseAdmin.rpc("save_event_registration", {
      p_event_id: event_id, p_email: email, p_first_name: first_name, p_last_name: last_name,
      p_answers: {}, p_session_ids: null, p_source: "admin", p_tag: tag,
    })
    if (saveError) return json({ error: saveError.message }, 400)
    return json({
      success: true,
      attendee: {
        user_id: saved.userId,
        email,
        first_name,
        last_name,
      },
    })
  } catch (err: unknown) {
    console.error("add-attendee error:", err)
    return json({ error: err instanceof Error ? err.message : "Server error" }, 500)
  }
}
