import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { getEventLiveRoom } from "@/lib/live/stageState"
import { isBroadcastEncryptionConfigured } from "@/lib/broadcast/credentials"
import { normalizeDestinationIds, prepareBroadcastDestinations } from "@/lib/broadcast/prepare"
import { isBroadcastRecordingConfigured, isLiveKitBroadcastConfigured } from "@/lib/broadcast/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Params): Promise<Response> {
  const { id } = await context.params
  const access = await requireEventOperatorAccess(id)
  if (access instanceof Response) return access

  const body = await request.json().catch((): null => null) as Record<string, unknown> | null
  const destinationIds = normalizeDestinationIds(body?.destinationIds)
  const recordingEnabled = body?.recordingEnabled !== false
  const room = await getEventLiveRoom(access.eventId)
  const checks = [
    { id: "livekit", label: "LiveKit egress", ready: isLiveKitBroadcastConfigured(), required: true, detail: isLiveKitBroadcastConfigured() ? "Media service credentials available" : "LiveKit server credentials are missing" },
    { id: "room", label: "Program room", ready: Boolean(room), required: true, detail: room ? room.room_name : "Open Producer Room once to initialize the event room" },
    { id: "encryption", label: "Credential security", ready: isBroadcastEncryptionConfigured(), required: true, detail: isBroadcastEncryptionConfigured() ? "AES-256-GCM key available" : "BROADCAST_CREDENTIALS_KEY is missing" },
    { id: "recording", label: "Jupiter Cloud recording", ready: !recordingEnabled || isBroadcastRecordingConfigured(), required: recordingEnabled, detail: recordingEnabled ? (isBroadcastRecordingConfigured() ? "S3 recording output ready" : "Recording storage credentials are missing") : "Recording disabled for this run" },
  ]

  let preparedCount = 0
  let destinationError: string | null = null
  try {
    preparedCount = (await prepareBroadcastDestinations(access.eventId, destinationIds)).length
  } catch (error) {
    destinationError = error instanceof Error ? error.message : "Destinations could not be prepared."
  }
  checks.push({ id: "destinations", label: "Outbound destinations", ready: preparedCount > 0 && !destinationError, required: true, detail: destinationError ?? `${preparedCount} encrypted destination${preparedCount === 1 ? "" : "s"} ready` })

  const ready = checks.every((check) => !check.required || check.ready)
  return NextResponse.json({
    ok: true,
    ready,
    roomName: room?.room_name ?? null,
    profile: "Universal 720p30 · H.264/AAC · 3.5 Mbps",
    checks,
    note: "Preflight validates Jupiter configuration. Confirm the incoming preview in each platform before making that platform public.",
  })
}
