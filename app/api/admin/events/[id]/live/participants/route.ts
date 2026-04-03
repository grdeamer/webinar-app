import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { ensureEventLiveRoom } from "@/lib/live/stageState"
import { getLiveKitRoomService } from "@/lib/live/livekit/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function safeValue(value: any): any {
  if (typeof value === "bigint") return value.toString()
  if (Array.isArray(value)) return value.map(safeValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, safeValue(v)])
    )
  }
  return value
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const { id } = await ctx.params

  try {
    const room = await ensureEventLiveRoom({ eventId: id })
    const svc = getLiveKitRoomService()

    let participants: any[] = []

    try {
      participants = await svc.listParticipants(room.room_name)
    } catch (err: any) {
      const msg = String(err?.message || "")
      if (msg.toLowerCase().includes("requested room does not exist")) {
        return json({ room: safeValue(room), participants: [] })
      }
      throw err
    }

    const normalized = participants.map((p: any) => {
      const tracks = Array.isArray(p.tracks) ? p.tracks : []

      const cameraTrack = tracks.find(
        (t: any) => t.source === 1 || t.source === "CAMERA"
      )
      const micTrack = tracks.find(
        (t: any) => t.source === 2 || t.source === "MICROPHONE"
      )
      const screenTrack = tracks.find(
        (t: any) => t.source === 3 || t.source === "SCREEN_SHARE"
      )

      let metadata: Record<string, unknown> = {}
      try {
        metadata = p.metadata ? JSON.parse(p.metadata) : {}
      } catch {
        metadata = {}
      }

      return safeValue({
        identity: p.identity,
        name: p.name || p.identity,
        joinedAt: p.joinedAt || null,
        state: p.state || null,
        isPublisher: !!p.isPublisher,
        metadata,
        cameraEnabled: !!cameraTrack,
        micEnabled: !!micTrack,
        screenShareEnabled: !!screenTrack,
        tracks: tracks.map((t: any) =>
          safeValue({
            sid: t.sid,
            name: t.name,
            source: t.source,
            muted: t.muted,
          })
        ),
      })
    })

    return json({
      room: safeValue(room),
      participants: normalized,
    })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to load participants" }, 500)
  }
}