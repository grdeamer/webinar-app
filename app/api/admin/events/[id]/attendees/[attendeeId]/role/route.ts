import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; attendeeId: string }> },
) {
  await requireAdmin()
  const { id: eventId, attendeeId } = await context.params
  const body = await request.json().catch((): null => null)
  const role = body?.role === "presenter" ? "presenter" : body?.role === "registrant" ? "registrant" : null

  if (!role) return NextResponse.json({ error: "Role must be registrant or presenter" }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from("event_registrants")
    .update({ tag: role === "presenter" ? "Presenter" : "Registrant", updated_at: new Date().toISOString() })
    .eq("id", attendeeId)
    .eq("event_id", eventId)
    .select("id,tag")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Person not found for this event" }, { status: 404 })
  return NextResponse.json({ ok: true, role })
}
