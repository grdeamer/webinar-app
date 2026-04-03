import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { setEventLiveLayout } from "@/lib/live/stageState"
import type { ProducerLayoutInput } from "@/lib/types"

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
  const body = (await req.json().catch((): null => null)) as ProducerLayoutInput | null
         
  if (!body?.layout || !["solo", "grid", "screen_speaker"].includes(body.layout)) {
    return json({ error: "Invalid layout" }, 400)
  }

  try {
    const state = await setEventLiveLayout({
      eventId: id,
      layout: body.layout,
      updatedBy: auth.user.email ?? auth.user.id,
    })

    return json({ state })
  } catch (err: any) {
    return json({ error: err?.message || "Failed to update layout" }, 500)
  }
}