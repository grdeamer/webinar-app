import { NextResponse } from "next/server"
import { deleteSessionStageScene } from "@/lib/app/sessionStageScenes"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string; sceneId: string }> }
): Promise<Response> {
  try {
    const { slug, sceneId } = await ctx.params
    const access = await requireEventOperatorAccess(slug)
    if (access instanceof Response) return access

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