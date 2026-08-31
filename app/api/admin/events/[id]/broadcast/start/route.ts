import { NextResponse } from "next/server"
import { getAppUrl } from "@/lib/email/resend"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { ensureEventLiveRoom } from "@/lib/live/stageState"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { recordAuditEvent } from "@/lib/cloud/audit"
import { normalizeDestinationIds, prepareBroadcastDestinations } from "@/lib/broadcast/prepare"
import { sanitizeBroadcastError } from "@/lib/broadcast/config"
import { createBroadcastEgressClient, createBroadcastOutputs, isBroadcastRecordingConfigured, universalBroadcastEncoding } from "@/lib/broadcast/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Params): Promise<Response> {
  const { id } = await context.params
  const access = await requireEventOperatorAccess(id)
  if (access instanceof Response) return access

  const body = await request.json().catch((): null => null) as Record<string, unknown> | null
  const destinationIds = normalizeDestinationIds(body?.destinationIds)
  const recordingEnabled = body?.recordingEnabled !== false
  let egressId: string | null = null
  let createdEgress = false
  let attachedUrls: string[] = []

  try {
    if (recordingEnabled && !isBroadcastRecordingConfigured()) {
      return NextResponse.json({ ok: false, error: "Jupiter Cloud recording storage is not configured. Disable recording or configure S3 egress storage." }, { status: 400 })
    }

    const destinations = await prepareBroadcastDestinations(access.eventId, destinationIds)
    const room = await ensureEventLiveRoom({ eventId: access.eventId })
    const egressClient = createBroadcastEgressClient()
    const activeEgresses = await egressClient.listEgress({ roomName: room.room_name, active: true })
    let egressInfo = activeEgresses[0]
    attachedUrls = destinations.map((destination) => destination.outputUrl)

    if (egressInfo) {
      egressId = egressInfo.egressId
      egressInfo = await egressClient.updateStream(egressInfo.egressId, attachedUrls, [])
    } else {
      egressInfo = await egressClient.startRoomCompositeEgress(
        room.room_name,
        createBroadcastOutputs(attachedUrls, recordingEnabled),
        {
          layout: "speaker-dark",
          customBaseUrl: `${getAppUrl()}/program-output/${encodeURIComponent(access.eventSlug)}`,
          encodingOptions: universalBroadcastEncoding(),
        },
      )
      egressId = egressInfo.egressId
      createdEgress = true
    }

    const { data: existingRun } = await supabaseAdmin
      .from("event_broadcast_runs")
      .select("id")
      .eq("event_id", access.eventId)
      .eq("egress_id", egressInfo.egressId)
      .maybeSingle()

    let runId = existingRun?.id as string | undefined
    if (runId) {
      const { error } = await supabaseAdmin.from("event_broadcast_runs").update({ status: "active", ended_at: null, error_message: null, updated_at: new Date().toISOString() }).eq("id", runId)
      if (error) throw new Error(error.message)
    } else {
      const { data: run, error } = await supabaseAdmin
        .from("event_broadcast_runs")
        .insert({ event_id: access.eventId, room_name: room.room_name, egress_id: egressInfo.egressId, status: Number(egressInfo.status) === 1 ? "active" : "starting", quality_profile: "universal-720p30", recording_enabled: recordingEnabled, started_by: access.user.id })
        .select("id")
        .single()
      if (error) throw new Error(error.message)
      runId = run.id
    }

    if (!runId) throw new Error("Broadcast run could not be created.")
    const destinationStatus: "active" | "starting" = Number(egressInfo.status) === 1 ? "active" : "starting"
    const destinationUpdatedAt = new Date().toISOString()
    const runDestinationRows: Array<{
      run_id: string
      destination_id: string
      provider: string
      label: string
      server_url_masked: string
      output_fingerprint: string
      status: "active" | "starting"
      updated_at: string
    }> = destinations.map((destination) => ({
      run_id: runId,
      destination_id: destination.id,
      provider: destination.provider,
      label: destination.label,
      server_url_masked: destination.maskedServerUrl,
      output_fingerprint: destination.outputFingerprint,
      status: destinationStatus,
      updated_at: destinationUpdatedAt,
    }))

    const { error: destinationError } = await supabaseAdmin
      .from("event_broadcast_run_destinations")
      .upsert(runDestinationRows, { onConflict: "run_id,destination_id" })
    if (destinationError) throw new Error(destinationError.message)

    if (createdEgress && recordingEnabled) {
      const { error: recordingError } = await supabaseAdmin.from("event_live_recordings").insert({ event_id: access.eventId, room_name: room.room_name, egress_id: egressInfo.egressId, status: "starting", source: "Program Feed", destination: "Jupiter Cloud + Simulcast", quality: "720p Universal", file_name: egressInfo.fileResults?.[0]?.filename ?? null, started_by: access.user.id })
      if (recordingError) throw new Error(recordingError.message)
    }

    await recordAuditEvent({ eventId: access.eventId, actorId: access.user.id, actorEmail: access.user.email, category: "broadcast", action: "broadcast.started", summary: `Started outbound broadcast to ${destinations.length} destination${destinations.length === 1 ? "" : "s"}`, targetType: "event_broadcast_run", targetId: runId, metadata: { destinationIds, recordingEnabled, egressId: egressInfo.egressId, profile: "universal-720p30" } })

    return NextResponse.json({ ok: true, runId, egressId: egressInfo.egressId, status: Number(egressInfo.status), recordingEnabled, attachedToExistingEgress: !createdEgress, destinations: destinations.map(({ id: destinationId, provider, label }) => ({ id: destinationId, provider, label, status: "starting" })) })
  } catch (error) {
    const message = sanitizeBroadcastError(error, attachedUrls)
    if (egressId && attachedUrls.length > 0) {
      try {
        const client = createBroadcastEgressClient()
        if (createdEgress) await client.stopEgress(egressId).catch((): null => null)
        else await client.updateStream(egressId, [], attachedUrls).catch((): null => null)
      } catch {
        // Preserve the original failure when LiveKit itself is unavailable.
      }
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
