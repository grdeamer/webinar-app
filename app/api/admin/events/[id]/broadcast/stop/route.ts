import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { recordAuditEvent } from "@/lib/cloud/audit"
import { buildBroadcastOutputUrl, sanitizeBroadcastError } from "@/lib/broadcast/config"
import { decryptBroadcastSecret } from "@/lib/broadcast/credentials"
import { createBroadcastEgressClient } from "@/lib/broadcast/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Params): Promise<Response> {
  const { id } = await context.params
  const access = await requireEventOperatorAccess(id)
  if (access instanceof Response) return access

  let outputUrls: string[] = []
  try {
    const { data: run } = await supabaseAdmin.from("event_broadcast_runs").select("id,egress_id,recording_enabled").eq("event_id", access.eventId).in("status", ["starting", "active"]).order("started_at", { ascending: false }).limit(1).maybeSingle()
    if (!run) return NextResponse.json({ ok: false, error: "No active broadcast run." }, { status: 404 })

    const { data: runDestinations, error: runDestinationError } = await supabaseAdmin.from("event_broadcast_run_destinations").select("destination_id").eq("run_id", run.id).in("status", ["starting", "active"])
    if (runDestinationError) throw new Error(runDestinationError.message)
    const destinationIds = (runDestinations ?? []).map((item) => item.destination_id).filter((value): value is string => Boolean(value))
    let destinations: Array<{ server_url: string; stream_key_ciphertext: string }> = []
    if (destinationIds.length > 0) {
      const result = await supabaseAdmin
        .from("event_broadcast_destinations")
        .select("server_url,stream_key_ciphertext")
        .eq("event_id", access.eventId)
        .in("id", destinationIds)
      if (result.error) throw new Error(result.error.message)
      destinations = (result.data ?? []) as Array<{ server_url: string; stream_key_ciphertext: string }>
    }
    outputUrls = destinations.map((destination) => buildBroadcastOutputUrl(destination.server_url, decryptBroadcastSecret(destination.stream_key_ciphertext)))

    const egressClient = createBroadcastEgressClient()
    if (run.recording_enabled) await egressClient.updateStream(run.egress_id, [], outputUrls)
    else await egressClient.stopEgress(run.egress_id)

    const now = new Date().toISOString()
    await Promise.all([
      supabaseAdmin.from("event_broadcast_runs").update({ status: "complete", ended_at: now, updated_at: now }).eq("id", run.id),
      supabaseAdmin.from("event_broadcast_run_destinations").update({ status: "stopped", ended_at: now, updated_at: now }).eq("run_id", run.id).in("status", ["starting", "active"]),
    ])
    await recordAuditEvent({ eventId: access.eventId, actorId: access.user.id, actorEmail: access.user.email, category: "broadcast", action: "broadcast.stopped", summary: "Stopped all outbound broadcast destinations", targetType: "event_broadcast_run", targetId: run.id, metadata: { egressId: run.egress_id, recordingContinues: run.recording_enabled } })
    return NextResponse.json({ ok: true, recordingContinues: run.recording_enabled })
  } catch (error) {
    return NextResponse.json({ ok: false, error: sanitizeBroadcastError(error, outputUrls) }, { status: 500 })
  }
}
