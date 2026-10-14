import { sendRegistrationReceipt } from "@/lib/registration/receipt"
import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
export async function PATCH(req: Request, context: { params: Promise<{ id: string; registrantId: string }> }) {
  const { id, registrantId } = await context.params
  const access = await requireEventOperatorAccess(id, ["event_admin"], "people")
  if (access instanceof Response) return access
  const body = await req.json().catch(() => ({}))
  if (!["approved", "declined", "cancelled", "waitlisted"].includes(body.status)) return NextResponse.json({ error: "Invalid registration status" }, { status: 400 })
  const { error } = await supabaseAdmin.rpc("set_event_registration_status", { p_event_id: id, p_registrant_id: registrantId, p_status: body.status })
  if (!error) {
    const [{ data: person }, { data: event }] = await Promise.all([
      supabaseAdmin.from("event_registrants").select("email").eq("event_id", id).eq("id", registrantId).single(),
      supabaseAdmin.from("events").select("slug,title").eq("id", id).single(),
    ])
    if (person && event) await sendRegistrationReceipt({ eventId: id, slug: event.slug, title: event.title, email: person.email, registrantId, status: body.status }).catch(() => false)
  }
  return NextResponse.json(error ? { error: error.message } : { ok: true }, { status: error ? 409 : 200 })
}
