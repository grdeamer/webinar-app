import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { getEventLiveRoom } from "@/lib/live/stageState"
import { egressStatusLabel, isTerminalEgressStatus } from "@/lib/live/producerControl"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sanitizeBroadcastError } from "@/lib/broadcast/config"
import { broadcastOutputFingerprint, createBroadcastEgressClient } from "@/lib/broadcast/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

type RunRow = { id: string; egress_id: string; status: string; quality_profile: string; recording_enabled: boolean; started_at: string; ended_at: string | null; error_message: string | null }
type RunDestinationRow = { id: string; destination_id: string | null; provider: string; label: string; output_fingerprint: string; status: string; retries: number; error_message: string | null }

function publicRun(run: RunRow, destinations: RunDestinationRow[]) {
  return { id: run.id, egressId: run.egress_id, status: run.status, qualityProfile: run.quality_profile, recordingEnabled: run.recording_enabled, startedAt: run.started_at, endedAt: run.ended_at, error: run.error_message, destinations: destinations.map((destination) => ({ id: destination.id, destinationId: destination.destination_id, provider: destination.provider, label: destination.label, status: destination.status, retries: destination.retries, error: destination.error_message })) }
}

export async function GET(_request: Request, context: Params): Promise<Response> {
  const { id } = await context.params
  const access = await requireEventOperatorAccess(id)
  if (access instanceof Response) return access

  try {
    const { data: runData, error: runError } = await supabaseAdmin
      .from("event_broadcast_runs")
      .select("id,egress_id,status,quality_profile,recording_enabled,started_at,ended_at,error_message")
      .eq("event_id", access.eventId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (runError) throw new Error(runError.message)
    if (!runData) return NextResponse.json({ ok: true, active: false, run: null })

    const run = runData as RunRow
    const { data: destinationData, error: destinationError } = await supabaseAdmin
      .from("event_broadcast_run_destinations")
      .select("id,destination_id,provider,label,output_fingerprint,status,retries,error_message")
      .eq("run_id", run.id)
      .order("started_at", { ascending: true })
    if (destinationError) throw new Error(destinationError.message)
    let destinations = (destinationData ?? []) as RunDestinationRow[]

    if (["complete", "failed", "aborted", "limit_reached"].includes(run.status)) {
      return NextResponse.json({ ok: true, active: false, run: publicRun(run, destinations) })
    }

    const room = await getEventLiveRoom(access.eventId)
    const egresses = await createBroadcastEgressClient().listEgress({ egressId: run.egress_id })
    const egress = egresses[0]
    if (!egress || (room && egress.roomName !== room.room_name)) {
      const now = new Date().toISOString()
      await Promise.all([
        supabaseAdmin.from("event_broadcast_runs").update({ status: "failed", error_message: "LiveKit egress could not be found.", ended_at: now, updated_at: now }).eq("id", run.id),
        supabaseAdmin.from("event_broadcast_run_destinations").update({ status: "failed", error_message: "LiveKit egress could not be found.", ended_at: now, updated_at: now }).eq("run_id", run.id).in("status", ["starting", "active"]),
      ])
      run.status = "failed"
      run.error_message = "LiveKit egress could not be found."
      run.ended_at = now
      destinations = destinations.map((destination) => ({ ...destination, status: destination.status === "starting" || destination.status === "active" ? "failed" : destination.status, error_message: destination.status === "starting" || destination.status === "active" ? "LiveKit egress could not be found." : destination.error_message }))
      return NextResponse.json({ ok: true, active: false, run: publicRun(run, destinations) })
    }

    const streamByFingerprint = new Map(egress.streamResults.map((stream) => [broadcastOutputFingerprint(stream.url), stream]))
    await Promise.all(destinations.map(async (destination) => {
      const stream = streamByFingerprint.get(destination.output_fingerprint)
      if (!stream) return
      const status = Number(stream.status) === 0 ? "active" : Number(stream.status) === 1 ? "complete" : "failed"
      destination.status = status
      destination.retries = stream.retries
      destination.error_message = stream.error ? sanitizeBroadcastError(stream.error) : null
      await supabaseAdmin.from("event_broadcast_run_destinations").update({ status, retries: stream.retries, error_message: destination.error_message, ended_at: status === "active" ? null : new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", destination.id)
    }))

    const numericStatus = Number(egress.status)
    const terminal = isTerminalEgressStatus(numericStatus)
    run.status = egressStatusLabel(numericStatus)
    const egressError = (egress as { error?: string }).error
    run.error_message = egressError ? sanitizeBroadcastError(egressError) : null
    run.ended_at = terminal ? new Date().toISOString() : null
    await supabaseAdmin.from("event_broadcast_runs").update({ status: run.status, error_message: run.error_message, ended_at: run.ended_at, updated_at: new Date().toISOString() }).eq("id", run.id)

    return NextResponse.json({ ok: true, active: !terminal && destinations.some((destination) => destination.status === "starting" || destination.status === "active"), run: publicRun(run, destinations) })
  } catch (error) {
    return NextResponse.json({ ok: false, error: sanitizeBroadcastError(error) }, { status: 500 })
  }
}
