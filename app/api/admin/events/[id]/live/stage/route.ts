import { NextResponse } from "next/server"
import { RoomServiceClient } from "livekit-server-sdk"
import { requireAdmin } from "@/lib/requireAdmin"
import { applyProducerStageAction } from "@/lib/live/stageState"
import type { ProducerStageActionInput } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  const { id } = await ctx.params
  const body = (await req.json().catch((): null => null)) as ProducerStageActionInput | null

  if (!body?.action) {
    return json({ error: "Missing action" }, 400)
  }

  try {
    const state = await applyProducerStageAction({
      eventId: id,
      input: body,
      updatedBy: auth.user.email ?? auth.user.id,
    })

    const livekitUrl = process.env.LIVEKIT_URL
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (livekitUrl && apiKey && apiSecret && body.participantId) {
      const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret)

      try {
        if (body.action === "add_to_stage") {
          await roomService.updateParticipant(
            id,
            body.participantId,
            JSON.stringify({ onStage: true })
          )
        }

        if (body.action === "remove_from_stage") {
          await roomService.updateParticipant(
            id,
            body.participantId,
            JSON.stringify({ onStage: false })
          )
        }
      } catch (error) {
        console.error("LiveKit metadata update failed", error)
      }
    }

    return json({ state })
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to update stage state",
      },
      500
    )
  }
}