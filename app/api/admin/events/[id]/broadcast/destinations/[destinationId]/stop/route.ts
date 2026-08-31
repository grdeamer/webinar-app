import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { recordAuditEvent } from "@/lib/cloud/audit"
import { buildBroadcastOutputUrl, sanitizeBroadcastError } from "@/lib/broadcast/config"
import { decryptBroadcastSecret } from "@/lib/broadcast/credentials"
import { createBroadcastEgressClient } from "@/lib/broadcast/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string; destinationId: string }> }

export async function POST(_request: Request, context: Params): Promise<Response> {
  const { id, destinationId } = await context.params
  const access = await requireEventOperatorAccess(id)
  if (access instanceof Response) return access

  let outputUrl = ""
  try {
    const { data: run } = await supabaseAdmin.from("event_broadcast_runs").select("id,egress_id").eq("event_id", access.eventId).in("status", ["starting", "active"]).order("started_at", { ascending: false }).limit(1).maybeSingle()
    if (!run) return NextResponse.json({ ok: false, error: "No active broadcast run." }, { status: 404 })

    const { data: destination } = await supabaseAdmin.from("event_broadcast_destinations").select("id,label,server_url,stream_key_ciphertext").eq("event_id", access.eventId).eq("id", destinationId).maybeSingle()
    if (!destination) return NextResponse.json({ ok: false, error: "Destination not found." }, { status: 404 })

    outputUrl = buildBroadcastOutputUrl(destination.server_url, decryptBroadcastSecret(destination.stream_key_ciphertext))
    await createBroadcastEgressClient().updateStream(run.egress_id, [], [outputUrl])
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin.from("event_broadcast_run_destinations").update({ status: "stopped", ended_at: now, updated_at: now }).eq("run_id", run.id).eq("destination_id", destinationId)
    if (error) throw new Error(error.message)

    await recordAuditEvent({ eventId: access.eventId, actorId: access.user.id, actorEmail: access.user.email, category: "broadcast", action: "broadcast.destination.stopped", summary: `Stopped output to ${destination.label}`, targetType: "event_broadcast_destination", targetId: destination.id, metadata: { runId: run.id, egressId: run.egress_id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, error: sanitizeBroadcastError(error, [outputUrl]) }, { status: 500 })
  }
}
