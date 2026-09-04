import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import {
  updateLegacyEventLiveStateSchema,
} from "@/lib/validators/liveRouting"
import { updateEventLiveState } from "@/lib/services/admin/updateEventLiveState"
import { recordAuditEvent } from "@/lib/cloud/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Params): Promise<Response> {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id: eventId } = await ctx.params

  const [liveStateResult, runOfShowResult] = await Promise.all([
    supabaseAdmin
      .from("event_live_state")
      .select("id,event_id,mode,active_breakout_id,destination_type,destination_session_id,headline,message,force_redirect,transition_type,transition_duration_ms,transition_active,updated_at")
      .eq("event_id", eventId)
      .maybeSingle(),
    supabaseAdmin
      .from("event_run_of_show")
      .select("cues")
      .eq("event_id", eventId)
      .maybeSingle(),
  ])

  if (liveStateResult.error) {
    return json({ error: liveStateResult.error.message }, 400)
  }

  const data = liveStateResult.data ?? null
  const cues = Array.isArray(runOfShowResult.data?.cues) ? runOfShowResult.data.cues : []
  const nextCue = cues.find((cue) => cue && typeof cue === "object") ?? null

  return json({
    liveState:
      data || {
        event_id: eventId,
        mode: "lobby",
        breakout_id: null,
        force_redirect: false,
        transition_type: "fade",
        transition_duration_ms: 3000,
        updated_at: null,
      },
    nextCue,
  })
}

export async function POST(req: Request, ctx: Params): Promise<Response> {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id: eventId } = await ctx.params
  const body = await req.json().catch((): null => null)

  const parsed = updateLegacyEventLiveStateSchema.safeParse({
    eventId,
    mode: typeof body?.mode === "string" ? body.mode : "lobby",
    breakoutId:
      typeof body?.breakout_id === "string" ? body.breakout_id : null,
    forceRedirect: !!body?.force_redirect,
  })

  if (!parsed.success) {
    return json(
      {
        error: "Invalid live routing payload",
        issues: parsed.error.flatten(),
      },
      400
    )
  }

  try {
    const liveState = await updateEventLiveState(parsed.data)
    await recordAuditEvent({
      eventId,
      actorId: authResult.user.id,
      actorEmail: authResult.user.email,
      category: "broadcast",
      action: "event.routing.updated",
      summary: `Updated audience routing to ${parsed.data.mode}`,
      targetType: "event_live_state",
      targetId: eventId,
      metadata: {
        mode: parsed.data.mode,
        breakoutId: parsed.data.breakoutId,
        forceRedirect: parsed.data.forceRedirect,
      },
    })
    return json({ ok: true, liveState })
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update live routing",
      },
      400
    )
  }
}
