import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function cleanSlot(n: any) {
  const v = Number(n)
  return Number.isFinite(v) ? v : null
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("general_session_multiview")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (error) return json({ error: error.message }, 400)

  return json({ state: data || { id: 1, slots: {} } })
}

export async function POST(req: Request) {

  const unauthorized = await requireAdmin()
  if (unauthorized) return unauthorized
  const body = await req.json().catch(() => ({}))
  const slot = cleanSlot(body?.slot)
  if (!slot || slot < 1 || slot > 7) return json({ error: "Invalid slot (1-7)" }, 400)

  // store slots as a jsonb map: {"1": {source}, ...}
  const source = body?.source ?? null

  const { data: current, error: readErr } = await supabaseAdmin
    .from("general_session_multiview")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  if (readErr) return json({ error: readErr.message }, 400)

  const nextSlots = { ...(current?.slots || {}) }
  if (source) nextSlots[String(slot)] = source
  else delete nextSlots[String(slot)]

  const { data, error } = await supabaseAdmin
    .from("general_session_multiview")
    .upsert(
      {
        id: 1,
        slots: nextSlots,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ state: data })
}
