import { NextResponse } from "next/server"
import { EgressClient } from "livekit-server-sdk"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { getEventLiveRoom } from "@/lib/live/stageState"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { sanitizeBroadcastError } from "@/lib/broadcast/config"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

type StopRecordingRequest = {
  eventId?: string
  egressId?: string
}

function requiredEnv(name: string, fallbackName?: string): string {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined)

  if (!value) {
    throw new Error(
      fallbackName
        ? `Missing env: ${name} or ${fallbackName}`
        : `Missing env: ${name}`
    )
  }

  return value
}

function normalizeEgressId(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function errorMessage(error: unknown): string {
  return sanitizeBroadcastError(error)
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as StopRecordingRequest
    const eventId = normalizeEgressId(body.eventId)
    const egressId = normalizeEgressId(body.egressId)

    if (!eventId) {
      return NextResponse.json(
        { ok: false, error: "eventId is required" },
        { status: 400 }
      )
    }

    const access = await requireEventOperatorAccess(eventId)
    if (access instanceof Response) return access as NextResponse
    const room = await getEventLiveRoom(access.eventId)

    if (!room) {
      return NextResponse.json(
        { ok: false, error: "Event live room not found" },
        { status: 404 }
      )
    }

    console.log("[recording.stop] request", {
      egressId,
    })

    if (!egressId) {
      return NextResponse.json(
        { ok: false, error: "egressId is required" },
        { status: 400 }
      )
    }

    const livekitUrl = requiredEnv("LIVEKIT_URL", "NEXT_PUBLIC_LIVEKIT_URL")
    const apiKey = requiredEnv("LIVEKIT_API_KEY")
    const apiSecret = requiredEnv("LIVEKIT_API_SECRET")

    const egressClient = new EgressClient(livekitUrl, apiKey, apiSecret)

    const activeEgresses = await egressClient.listEgress({
      egressId,
    })

    const existingEgress = activeEgresses[0]
    console.log("[recording.stop] existing egress", {
      egressId: existingEgress?.egressId ?? null,
      status: existingEgress?.status ?? null,
      startedAt: existingEgress?.startedAt?.toString() ?? null,
      endedAt: existingEgress?.endedAt?.toString() ?? null,
      fileResults: existingEgress?.fileResults ?? [],
      error: (existingEgress as { error?: string } | undefined)?.error ?? null,
    })

    if (!existingEgress) {
      return NextResponse.json(
        {
          ok: false,
          error: "Recording egress no longer exists or already stopped",
          egressId,
        },
        { status: 404 }
      )
    }

    if (existingEgress.roomName !== room.room_name) {
      return NextResponse.json(
        { ok: false, error: "Recording does not belong to this event" },
        { status: 403 }
      )
    }

const existingStatus = Number(existingEgress.status)

/**
 * LiveKit EgressStatus enum:
 * 0 = EGRESS_STARTING
 * 1 = EGRESS_ACTIVE
 * 2 = EGRESS_ENDING
 * 3 = EGRESS_COMPLETE
 * 4 = EGRESS_FAILED
 * 5 = EGRESS_ABORTED
 * 6 = EGRESS_LIMIT_REACHED
 */

if (
  existingStatus === 3 ||
  existingStatus === 4 ||
  existingStatus === 5 ||
  existingStatus === 6
){
      await supabaseAdmin
        .from("event_live_recordings")
        .update({
          status: existingStatus === 3 ? "complete" : existingStatus === 4 ? "failed" : "aborted",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", access.eventId)
        .eq("egress_id", existingEgress.egressId)
      console.log("[recording.stop] terminal egress", {
        egressId: existingEgress.egressId,
        status: existingEgress.status,
        endedAt: existingEgress.endedAt?.toString() ?? null,
        fileResults: existingEgress.fileResults ?? [],
        error: (existingEgress as { error?: string }).error ?? null,
      })
      return NextResponse.json({
        ok: true,
        terminal: true,
        egressId: existingEgress.egressId,
        status: existingEgress.status,
        endedAt: existingEgress.endedAt?.toString() ?? null,
        file: existingEgress.fileResults?.[0]?.filename ?? null,
        error: existingStatus === 4
  ? "Recording egress already failed before stop was requested"
  : null,
      })
    }

    const egressInfo = await egressClient.stopEgress(egressId)
    const endedAt = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from("event_live_recordings")
      .update({ status: "ending", updated_at: endedAt })
      .eq("event_id", access.eventId)
      .eq("egress_id", egressId)
    if (updateError) throw new Error(updateError.message)
    const { data: broadcastRun } = await supabaseAdmin
      .from("event_broadcast_runs")
      .select("id")
      .eq("event_id", access.eventId)
      .eq("egress_id", egressId)
      .maybeSingle()
    if (broadcastRun) {
      await Promise.all([
        supabaseAdmin
          .from("event_broadcast_runs")
          .update({ status: "ending", ended_at: endedAt, updated_at: endedAt })
          .eq("id", broadcastRun.id),
        supabaseAdmin
          .from("event_broadcast_run_destinations")
          .update({ status: "stopped", ended_at: endedAt, updated_at: endedAt })
          .eq("run_id", broadcastRun.id)
          .in("status", ["starting", "active"]),
      ])
    }
    console.log("[recording.stop] stopped egress", {
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      startedAt: egressInfo.startedAt?.toString() ?? null,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      fileResults: egressInfo.fileResults ?? [],
      error: (egressInfo as { error?: string }).error ?? null,
    })

    return NextResponse.json({
      ok: true,
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      file: egressInfo.fileResults?.[0]?.filename ?? null,
      fileResults: egressInfo.fileResults ?? [],
      error: (egressInfo as { error?: string }).error ?? null,
    })
  } catch (error) {
    console.error("[recording.stop] failed", errorMessage(error))
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage(error),
      },
      { status: 500 }
    )
  }
}
