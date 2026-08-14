import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { ensureEventLiveStageState, getEventLiveStageState } from "@/lib/live/stageState"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id)
  if (auth instanceof Response) return auth

  try {
    const state = (await getEventLiveStageState(id)) || (await ensureEventLiveStageState(id))
    return json({ state })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to load stage state" }, 500)
  }
}
