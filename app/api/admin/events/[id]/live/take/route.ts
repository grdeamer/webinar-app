import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import {
  isProducerCompositionTooLarge,
  isProducerConcurrencyError,
  normalizeProducerBlocks,
  parseExpectedProducerVersion,
} from "@/lib/live/producerControl"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const auth = await requireEventOperatorAccess(id)
    if (auth instanceof Response) return auth
    const body = await req.json().catch((): null => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
    const commandId = isUuid(String((body as Record<string, unknown>).commandId ?? ""))
      ? String(body.commandId)
      : crypto.randomUUID()
    const expectedPreviewVersion = parseExpectedProducerVersion(body?.expectedPreviewVersion)
    const programBlocks = normalizeProducerBlocks(body?.programBlocks) ?? []
    const transition = body?.transition && typeof body.transition === "object"
      ? body.transition
      : {}

    if (isProducerCompositionTooLarge(programBlocks)) {
      return NextResponse.json(
        { error: "Program composition is too large" },
        { status: 413 }
      )
    }

    if (!id) {
      return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    }

    const { data: program, error } = await supabaseAdmin.rpc("producer_take", {
      p_event_id: auth.eventId,
      p_command_id: commandId,
      p_expected_preview_version: expectedPreviewVersion,
      p_program_blocks: programBlocks,
      p_transition: transition,
      p_actor_id: auth.user.id,
      p_actor_label: auth.user.email ?? auth.user.id,
    })

    if (error) {
      const conflict = isProducerConcurrencyError(error)
      return NextResponse.json(
        { error: error.message || "Failed to commit Program" },
        { status: conflict ? 409 : 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      commandId,
      state: program,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to take program live",
      },
      { status: 500 }
    )
  }
}
