import { NextResponse } from "next/server"
import { RoomServiceClient } from "livekit-server-sdk"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { applyProducerStageAction, ensureEventLiveRoom } from "@/lib/live/stageState"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { ProducerStageActionInput } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_ACTIONS: ProducerStageActionInput["action"][] = [
  "add_to_stage",
  "remove_from_stage",
  "pin_participant",
  "unpin_participant",
  "set_primary",
  "clear_primary",
  "set_screen_share",
  "clear_screen_share",
  "go_live",
  "go_off_air",
]

type StageRequestBody = ProducerStageActionInput & {
  commandId?: string
  expectedPreviewVersion?: number | null
}

function parseStageBody(raw: unknown): StageRequestBody | null {
  if (!raw || typeof raw !== "object") return null

  const record = raw as Record<string, unknown>
  const action = record.action
  if (typeof action !== "string" || !ALLOWED_ACTIONS.includes(action as ProducerStageActionInput["action"])) {
    return null
  }

  const participantId = record.participantId === undefined || record.participantId === null
    ? null
    : record.participantId
  if (participantId !== null && typeof participantId !== "string") return null

  const trackId = record.trackId === undefined || record.trackId === null
    ? null
    : record.trackId
  if (trackId !== null && typeof trackId !== "string") return null

  const commandId = record.commandId === undefined ? undefined : record.commandId
  if (commandId !== undefined && typeof commandId !== "string") return null

  const expectedPreviewVersion = record.expectedPreviewVersion === undefined || record.expectedPreviewVersion === null
    ? null
    : record.expectedPreviewVersion
  if (expectedPreviewVersion !== null && typeof expectedPreviewVersion !== "number") return null

  return {
    action: action as ProducerStageActionInput["action"],
    participantId: participantId as string | null,
    trackId: trackId as string | null,
    ...(commandId !== undefined && { commandId: commandId as string }),
    expectedPreviewVersion: expectedPreviewVersion as number | null,
  }
}

function json(data: unknown, status = 200): Response {
  return NextResponse.json(data, { status })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id)
  if (auth instanceof Response) return auth
  const raw = await req.json().catch((): null => null)
  const body = parseStageBody(raw)

  if (!body) {
    return json({ error: "Invalid request body" }, 400)
  }

  try {
    let state
    let programState = null
    if (body.action === "go_live" || body.action === "go_off_air") {
      const commandId = body.commandId ?? crypto.randomUUID()
      const { data, error } = await supabaseAdmin.rpc("producer_set_live", {
        p_event_id: auth.eventId,
        p_command_id: commandId,
        p_is_live: body.action === "go_live",
        p_expected_preview_version: body.expectedPreviewVersion ?? null,
        p_actor_id: auth.user.id,
        p_actor_label: auth.user.email ?? auth.user.id,
      })

      if (error) {
        const conflict = error.code === "40001" || error.message.includes("another console")
        return json({ error: error.message }, conflict ? 409 : 500)
      }
      state = data?.preview ?? data
      programState = data?.program ?? null
    } else {
      state = await applyProducerStageAction({
        eventId: auth.eventId,
        input: body,
        expectedVersion: body.expectedPreviewVersion ?? null,
        commandId: body.commandId ?? crypto.randomUUID(),
        actorId: auth.user.id,
        updatedBy: auth.user.email ?? auth.user.id,
      })
    }

    const livekitUrl = process.env.LIVEKIT_URL
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (livekitUrl && apiKey && apiSecret && body.participantId) {
      const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret)
      const room = await ensureEventLiveRoom({ eventId: auth.eventId })

      if (body.action === "add_to_stage") {
        await roomService.updateParticipant(
          room.room_name,
          body.participantId,
          JSON.stringify({ onStage: true })
        )
      }

      if (body.action === "remove_from_stage") {
        await roomService.updateParticipant(
          room.room_name,
          body.participantId,
          JSON.stringify({ onStage: false })
        )
      }
    }

    return json({ state, programState })
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to update stage state",
      },
      500
    )
  }
}
