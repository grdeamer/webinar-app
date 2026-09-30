import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function DELETE(_req: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params

  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 })
  }

  try {
    const { data: session, error: lookupError } = await supabaseAdmin
      .from("event_sessions").select("event_id").eq("id", id).maybeSingle()
    if (lookupError) return NextResponse.json({ error: "Unable to load session" }, { status: 500 })
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
    const access = await requireEventOperatorAccess(session.event_id, ["event_admin"], "program")
    if (access instanceof Response) return access
    const { error } = await supabaseAdmin
      .from("event_sessions")
      .delete()
      .eq("id", id)
      .eq("event_id", access.eventId)

    if (error) {
      console.error("Delete session error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Delete session unexpected error:", error)
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}