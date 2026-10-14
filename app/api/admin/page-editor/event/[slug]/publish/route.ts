import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { findRegistrationProps, normalizeRegistrationConfig } from "@/lib/registration/schema"
export const runtime = "nodejs"
export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const access = await requireEventOperatorAccess(slug, ["event_admin", "producer"], "experience")
  if (access instanceof Response) return access
  const body = await req.json().catch(() => ({}))
  const pageKey = typeof body.pageKey === "string" ? body.pageKey : "event_home"
  const { data, error } = await supabaseAdmin.from("event_page_sections").select("sections,elements,page_theme,document_revision").eq("event_id", access.eventId).eq("page_key", pageKey).single()
  if (error || !data) return NextResponse.json({ error: "Save the draft before publishing" }, { status: 400 })
  if (body.revision !== data.document_revision) return NextResponse.json({ error: "Draft changed. Refresh and publish again." }, { status: 409 })
  const props = findRegistrationProps(data.sections)
  const config = normalizeRegistrationConfig(props, Boolean(props))
  if (config.sessions.length) {
    const { data: sessions, error: sessionError } = await supabaseAdmin.from("event_sessions").select("id").eq("event_id", access.eventId).in("id", config.sessions.map((s) => s.id))
    if (sessionError || sessions?.length !== new Set(config.sessions.map((s) => s.id)).size) return NextResponse.json({ error: "All registration sessions must belong to this event" }, { status: 400 })
  }
  const { error: publishError } = await supabaseAdmin.rpc("publish_event_registration_page", { p_event_id: access.eventId, p_page_key: pageKey, p_revision: data.document_revision, p_config: props || pageKey === "event_home" ? config : null })
  if (publishError) return NextResponse.json({ error: publishError.message }, { status: 409 })
  return NextResponse.json({ ok: true, revision: data.document_revision })
}
