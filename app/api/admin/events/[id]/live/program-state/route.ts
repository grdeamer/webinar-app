import { NextResponse } from "next/server"
import {
  ensureEventLiveProgramState,
  setEventLiveProgramComposition,
} from "@/lib/live/state"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import {
  isProducerCompositionTooLarge,
  isProducerConcurrencyError,
  normalizeProducerBlocks,
  parseExpectedProducerVersion,
} from "@/lib/live/producerControl"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const auth = await requireEventOperatorAccess(id, ["event_admin", "producer"], "producer_room")
    if (auth instanceof Response) return auth

    if (!id) {
      return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    }

    const state = await ensureEventLiveProgramState(id)

    return NextResponse.json({ state })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load program state",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const auth = await requireEventOperatorAccess(id, ["event_admin", "producer"], "producer_room")
  if (auth instanceof Response) return auth

  const body = await request.json().catch((): null => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  const blocks = normalizeProducerBlocks(record.blocks)
  if (!blocks) {
    return NextResponse.json({ error: "blocks must be an array" }, { status: 400 })
  }
  if (isProducerCompositionTooLarge(blocks)) {
    return NextResponse.json({ error: "Program composition is too large" }, { status: 413 })
  }

  try {
    const state = await setEventLiveProgramComposition({
      eventId: auth.eventId,
      blocks,
      expectedVersion: parseExpectedProducerVersion(record.expectedVersion),
      updatedBy: auth.user.email ?? auth.user.id,
    })
    return NextResponse.json({ state })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update Program"
    return NextResponse.json(
      { error: message },
      { status: isProducerConcurrencyError({ message }) ? 409 : 500 }
    )
  }
}
