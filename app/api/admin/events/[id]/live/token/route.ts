import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { createLiveKitToken } from "@/lib/live/livekit/token"
import { ensureEventLiveRoom, ensureEventLiveStageState } from "@/lib/live/stageState"
import type { LiveParticipantRole } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function sanitizeRole(value: unknown): LiveParticipantRole {
  const role = String(value || "producer")
  if (role === "producer" || role === "host" || role === "speaker" || role === "guest") {
    return role
  }
  return "producer"
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))

  const role = sanitizeRole(body?.role)
  const displayName =
    String(body?.display_name || auth.user.email || "Producer").trim().slice(0, 120) || "Producer"

  try {
    const room = await ensureEventLiveRoom({ eventId: id })
    await ensureEventLiveStageState(id)

    const identity = `${role}_${auth.user.id}`

    const token = await createLiveKitToken({
      roomName: room.room_name,
      identity,
      name: displayName,
      role,
      metadata: {
        eventId: id,
        userId: auth.user.id,
        email: auth.user.email ?? null,
      },
    })

    return json(token)
  } catch (err: any) {
    return json({ error: err?.message || "Failed to create token" }, 500)
  }
}