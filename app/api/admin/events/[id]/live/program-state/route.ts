import { NextResponse } from "next/server"
import { ensureEventLiveProgramState } from "@/lib/live/state"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof Response) return auth

  try {
    const { id } = await context.params

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
