import { NextResponse } from "next/server"
import { EgressClient } from "livekit-server-sdk"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { getEventLiveRoom } from "@/lib/live/stageState"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { egressStatusLabel, isTerminalEgressStatus } from "@/lib/live/producerControl"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

type RecordingStatusRequest = {
  eventId?: string
  egressId?: string
}

function hasUsableFile(file: { size?: bigint | number | string | null; location?: string | null } | null): boolean {
  if (!file) return false

  const sizeValue = typeof file.size === "bigint" ? Number(file.size) : Number(file.size ?? 0)
  return sizeValue > 0 && Boolean(file.location)
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
  if (error instanceof Error) return error.message
  return "Unknown recording status error"
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as RecordingStatusRequest
    const eventId = normalizeEgressId(body.eventId)
    let egressId = normalizeEgressId(body.egressId)

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

    console.log("[recording.status] request", {
      egressId,
    })

    if (!egressId) {
      const { data: activeRecording, error: activeError } = await supabaseAdmin
        .from("event_live_recordings")
        .select("egress_id")
        .eq("event_id", access.eventId)
        .in("status", ["starting", "active", "ending"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (activeError) throw new Error(activeError.message)
      egressId = activeRecording?.egress_id ?? null
    }

    if (!egressId) {
      const { data: recordings, error: historyError } = await supabaseAdmin
        .from("event_live_recordings")
        .select("*")
        .eq("event_id", access.eventId)
        .order("started_at", { ascending: false })
        .limit(50)
      if (historyError) throw new Error(historyError.message)
      return NextResponse.json({ ok: true, active: false, recordings: recordings ?? [] })
    }

    const livekitUrl = requiredEnv("LIVEKIT_URL", "NEXT_PUBLIC_LIVEKIT_URL")
    const apiKey = requiredEnv("LIVEKIT_API_KEY")
    const apiSecret = requiredEnv("LIVEKIT_API_SECRET")

    const egressClient = new EgressClient(livekitUrl, apiKey, apiSecret)
    const egresses = await egressClient.listEgress({
      egressId,
    })

    const egressInfo = egresses[0]

    if (!egressInfo) {
      return NextResponse.json(
        {
          ok: false,
          error: "Recording egress not found",
          egressId,
        },
        { status: 404 }
      )
    }

    if (egressInfo.roomName !== room.room_name) {
      return NextResponse.json(
        { ok: false, error: "Recording does not belong to this event" },
        { status: 403 }
      )
    }

    const status = Number(egressInfo.status)
    const terminal = isTerminalEgressStatus(status)
    const statusLabel = egressStatusLabel(status)
    const file = egressInfo.fileResults?.[0] ?? null
    const uploaded = hasUsableFile(file)
    const endedAt = terminal ? new Date().toISOString() : null
    const { error: updateError } = await supabaseAdmin
      .from("event_live_recordings")
      .update({
        status: statusLabel,
        file_name: file?.filename ?? null,
        file_location: file?.location ?? null,
        file_size: file?.size ? Number(file.size) : null,
        error_message:
          (egressInfo as { error?: string }).error ||
          (terminal && !uploaded ? "Recording finalized without a usable uploaded file" : null),
        ended_at: endedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", access.eventId)
      .eq("egress_id", egressInfo.egressId)
    if (updateError) throw new Error(updateError.message)

    const { data: recordings, error: historyError } = await supabaseAdmin
      .from("event_live_recordings")
      .select("*")
      .eq("event_id", access.eventId)
      .order("started_at", { ascending: false })
      .limit(50)
    if (historyError) throw new Error(historyError.message)
    const detailedFileResults =
      egressInfo.fileResults?.map((result) => ({
        filename: result.filename,
        location: result.location,
        size: result.size?.toString() ?? null,
        startedAt: result.startedAt?.toString() ?? null,
        endedAt: result.endedAt?.toString() ?? null,
        duration: result.duration?.toString() ?? null,
      })) ?? []
    console.log("[recording.status] result", {
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      statusLabel,
      uploaded,
      terminal,
      startedAt: egressInfo.startedAt?.toString() ?? null,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      fileResults: detailedFileResults,
      error: (egressInfo as { error?: string }).error ?? null,
    })

    return NextResponse.json({
      ok: true,
      active: !terminal,
      egressId: egressInfo.egressId,
      status: egressInfo.status,
      statusLabel,
      uploaded,
      terminal,
      startedAt: egressInfo.startedAt?.toString() ?? null,
      endedAt: egressInfo.endedAt?.toString() ?? null,
      file: file?.filename ?? null,
      size: file?.size?.toString() ?? null,
      location: file?.location ?? null,
      fileResults: detailedFileResults,
      error:
        (egressInfo as { error?: string }).error ||
        (terminal && !uploaded ? "Recording finalized without a usable uploaded file" : null),
      recordings: recordings ?? [],
    })
  } catch (error) {
    console.error("[recording.status] failed", error)
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage(error),
      },
      { status: 500 }
    )
  }
}
