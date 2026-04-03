import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"
import {
  updateLegacyEventLiveStateSchema,
} from "@/lib/validators/liveRouting"
import { updateEventLiveState } from "@/lib/services/admin/updateEventLiveState"

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

  const { data, error } = await supabaseAdmin
    .from("event_live_state")
    .select("id,event_id,mode,breakout_id,force_redirect,updated_at")
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) {
    return json({ error: error.message }, 400)
  }

  return json({
    liveState:
      data || {
        event_id: eventId,
        mode: "lobby",
        breakout_id: null,
        force_redirect: false,
        updated_at: null,
      },
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