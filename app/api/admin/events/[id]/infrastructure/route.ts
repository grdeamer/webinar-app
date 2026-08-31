import { NextResponse } from "next/server"
import { getEventInfrastructureSnapshot } from "@/lib/cloud/status"
import { getEventTeamAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await getEventTeamAccess(id)
  if (!access) return NextResponse.json({ error: "Event access denied" }, { status: 403 })

  try {
    return NextResponse.json(await getEventInfrastructureSnapshot(access.eventId), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Infrastructure status unavailable" }, { status: 500 })
  }
}
