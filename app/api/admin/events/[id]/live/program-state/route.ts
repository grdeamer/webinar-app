import { NextResponse } from "next/server"
import { ensureEventLiveProgramState } from "@/lib/live/state"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    }

    const state = await ensureEventLiveProgramState(id)

    return NextResponse.json({ state })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load program state" },
      { status: 500 }
    )
  }
}