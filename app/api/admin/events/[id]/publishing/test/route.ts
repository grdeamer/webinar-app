import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requirePublishingApiAccess } from "@/lib/external-publishing/authorization"
import { loadPublishDestination } from "@/lib/external-publishing/destinations"
import { testFtpConnection } from "@/lib/external-publishing/ftpPublisher"
import { logPublishingEvent } from "@/lib/external-publishing/logging"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await requirePublishingApiAccess(id)
  if (access instanceof NextResponse) return access
  const body = await request.json().catch((): null => null)

  try {
    const { row, connection } = await loadPublishDestination(String(body?.destination_id || ""), id)
    logPublishingEvent("info", "connection-test.started", { eventId: id, destinationId: row.id })
    await testFtpConnection(connection)
    const testedAt = new Date().toISOString()
    await supabaseAdmin.from("event_publish_destinations").update({ last_tested_at: testedAt, last_status: "connected", last_error: null, updated_at: testedAt }).eq("id", row.id)
    logPublishingEvent("info", "connection-test.completed", { eventId: id, destinationId: row.id })
    return NextResponse.json({ ok: true, tested_at: testedAt })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed"
    logPublishingEvent("error", "connection-test.failed", { eventId: id, destinationId: body?.destination_id || null, error: message })
    if (body?.destination_id) {
      await supabaseAdmin.from("event_publish_destinations").update({ last_status: "failed", last_error: message, updated_at: new Date().toISOString() }).eq("id", String(body.destination_id)).eq("event_id", id)
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
