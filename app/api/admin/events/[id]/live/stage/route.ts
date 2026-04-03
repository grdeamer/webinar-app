import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { applyProducerStageAction } from "@/lib/live/stageState"
import type { ProducerStageActionInput } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
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

    return json({ state })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to update stage state" }, 500)
  }
}