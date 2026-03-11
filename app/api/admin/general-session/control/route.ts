import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * general_session_control
 *  - id: boolean (PK, always true)
 *  - state: text ('holding' | 'live' | 'paused' | 'ended')
 *  - message: text nullable
 *  - updated_at: timestamptz
 */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("general_session_control")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (error) return json({ error: error.message }, 400)

  return json({
    control:
      data ||
      ({
        id: 1,
        state: "holding",
        message: null,
        updated_at: new Date().toISOString(),
      } as any),
  })
}

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const body = await req.json().catch(() => ({}))

  const state = typeof body?.state === "string" ? body.state : null
  const message =
    typeof body?.message === "string" && body.message.trim()
      ? body.message.trim().slice(0, 500)
      : null

  if (!state || !["holding", "live", "paused", "ended"].includes(state)) {
    return json({ error: "Invalid state. Use holding|live|paused|ended" }, 400)
  }

  const { data, error } = await supabaseAdmin
    .from("general_session_control")
    .upsert(
      {
        id: 1,
        state,
        message,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ control: data })
}
