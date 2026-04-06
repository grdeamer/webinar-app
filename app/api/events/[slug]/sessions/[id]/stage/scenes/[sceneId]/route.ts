import { NextResponse } from "next/server"
import { deleteSessionStageScene } from "@/lib/app/sessionStageScenes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ sceneId: string }> }
): Promise<Response> {
  try {
    const { sceneId } = await ctx.params

    await deleteSessionStageScene(sceneId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete scene",
      },
      { status: 500 }
    )
  }
}