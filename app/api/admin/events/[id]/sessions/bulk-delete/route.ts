import { NextResponse } from "next/server"
import { recordAuditEvent } from "@/lib/cloud/audit"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { validateSessionBulkDeleteIds } from "@/lib/sessions/bulkDelete"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { id: eventRef } = await context.params
  const access = await requireEventOperatorAccess(eventRef, ["event_admin"])
  if (access instanceof Response) return access

  try {
    const body = (await request.json().catch((): null => null)) as Record<string, unknown> | null
    const validation = validateSessionBulkDeleteIds(body?.session_ids)
    if (validation.ok === false) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const sessionIds = validation.sessionIds
    const { data: selected, error: lookupError } = await supabaseAdmin
      .from("event_sessions")
      .select("id,title,runtime_status")
      .eq("event_id", access.eventId)
      .in("id", sessionIds)

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 400 })
    }

    if (!selected?.length) {
      return NextResponse.json(
        { error: "None of the selected sessions belong to this event" },
        { status: 404 }
      )
    }

    if (selected.length !== sessionIds.length) {
      return NextResponse.json(
        { error: "Some selected sessions no longer exist. Refresh and try again." },
        { status: 409 }
      )
    }

    const scopedIds = selected.map((session) => session.id)
    const { data: deleted, error: deleteError } = await supabaseAdmin
      .from("event_sessions")
      .delete()
      .eq("event_id", access.eventId)
      .in("id", scopedIds)
      .select("id")

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    const deletedIds = (deleted ?? []).map((session) => session.id)
    await recordAuditEvent({
      eventId: access.eventId,
      actorId: access.user.id,
      actorEmail: access.user.email,
      category: "program",
      action: "sessions.bulk_deleted",
      summary: `Deleted ${deletedIds.length} sessions from the program`,
      targetType: "event_sessions",
      targetId: access.eventId,
      metadata: {
        deletedSessionIds: deletedIds,
        deletedSessionTitles: selected.map((session) => session.title),
        liveSessionCount: selected.filter((session) => session.runtime_status === "live").length,
      },
    })

    return NextResponse.json({
      ok: true,
      deleted_count: deletedIds.length,
      deleted_ids: deletedIds,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete selected sessions" },
      { status: 500 }
    )
  }
}
