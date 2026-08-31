import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { setEventLivePreviewComposition } from "@/lib/live/stageState"
import {
  isProducerCompositionTooLarge,
  isProducerConcurrencyError,
  normalizeProducerBlocks,
  parseExpectedProducerVersion,
} from "@/lib/live/producerControl"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const access = await requireEventOperatorAccess(id)
  if (access instanceof Response) return access

  const body = await request.json().catch((): null => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const blocks = normalizeProducerBlocks((body as Record<string, unknown>).blocks)
  if (!blocks) {
    return NextResponse.json({ error: "blocks must be an array" }, { status: 400 })
  }
  if (isProducerCompositionTooLarge(blocks)) {
    return NextResponse.json({ error: "Preview composition is too large" }, { status: 413 })
  }

  try {
    const state = await setEventLivePreviewComposition({
      eventId: access.eventId,
      blocks,
      expectedVersion: parseExpectedProducerVersion((body as Record<string, unknown>).expectedVersion),
      commandId: crypto.randomUUID(),
      actorId: access.user.id,
      updatedBy: access.user.email ?? access.user.id,
    })
    return NextResponse.json({ state })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save Preview"
    return NextResponse.json(
      { error: message },
      { status: isProducerConcurrencyError({ message }) ? 409 : 500 }
    )
  }
}
