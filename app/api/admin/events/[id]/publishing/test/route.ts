import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { loadPublishDestination } from "@/lib/external-publishing/destinations"
import { testFtpConnection } from "@/lib/external-publishing/ftpPublisher"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await context.params
  const body = await request.json().catch((): null => null)

  try {
    const { row, connection } = await loadPublishDestination(String(body?.destination_id || ""), id)
    await testFtpConnection(connection)
    const testedAt = new Date().toISOString()
    await supabaseAdmin.from("event_publish_destinations").update({ last_tested_at: testedAt, last_status: "connected", last_error: null, updated_at: testedAt }).eq("id", row.id)
    return NextResponse.json({ ok: true, tested_at: testedAt })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed"
    if (body?.destination_id) {
      await supabaseAdmin.from("event_publish_destinations").update({ last_status: "failed", last_error: message, updated_at: new Date().toISOString() }).eq("id", String(body.destination_id)).eq("event_id", id)
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
