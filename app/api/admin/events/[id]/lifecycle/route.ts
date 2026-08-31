import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { recordAuditEvent } from "@/lib/cloud/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof Response) return auth

    const { id: eventId } = await context.params
    if (!UUID_PATTERN.test(eventId)) return json({ error: "Invalid event" }, 400)

    const body = await request.json().catch(() => ({}))
    const action = body.action
    if (!["archive", "restore", "delete"].includes(action)) return json({ error: "Invalid action" }, 400)

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id,title,lifecycle_stage")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError || !event) return json({ error: eventError?.message || "Event not found" }, 404)

    if (action === "delete") {
      if (body.confirmation !== event.title) return json({ error: "Enter the event name exactly to delete it" }, 409)

      // Related event records use ON DELETE CASCADE; import-job history retains
      // its audit row and releases only the event reference.
      const { data: deleted, error: deleteError } = await supabaseAdmin
        .from("events")
        .delete()
        .eq("id", eventId)
        .select("id")
        .maybeSingle()

      if (deleteError) return json({ error: deleteError.message }, 400)
      if (!deleted) return json({ error: "Event was not deleted" }, 409)
      await recordAuditEvent({ actorId: auth.user.id, actorEmail: auth.user.email, category: "event", action: "event.deleted", summary: `Deleted event ${event.title}`, targetType: "event", targetId: eventId, metadata: { deletedEventId: eventId } })
      return json({ success: true, action: "delete" })
    }

    const lifecycleStage = action === "archive" ? "archived" : "build"
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("events")
      .update({ lifecycle_stage: lifecycleStage, updated_at: new Date().toISOString() })
      .eq("id", eventId)
      .select("id,lifecycle_stage")
      .maybeSingle()

    if (updateError) return json({ error: updateError.message }, 400)
    if (!updated) return json({ error: "Event was not updated" }, 409)
    await recordAuditEvent({ eventId, actorId: auth.user.id, actorEmail: auth.user.email, category: "event", action: `event.${action}d`, summary: `${action === "archive" ? "Archived" : "Restored"} event ${event.title}`, targetType: "event", targetId: eventId })
    return json({ success: true, action, lifecycle_stage: lifecycleStage })
  } catch (error) {
    console.error("event lifecycle error:", error)
    return json({ error: error instanceof Error ? error.message : "Server error" }, 500)
  }
}
