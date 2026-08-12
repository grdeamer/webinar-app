import { NextResponse } from "next/server"
import { loadPublishDestination } from "@/lib/external-publishing/destinations"
import { listRemoteFiles } from "@/lib/external-publishing/ftpPublisher"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await context.params
  const url = new URL(request.url)
  const destinationId = url.searchParams.get("destination_id") || ""
  const browserPath = url.searchParams.get("path") || ""

  try {
    const { connection } = await loadPublishDestination(destinationId, id)
    const files = await listRemoteFiles(connection, browserPath)
    return NextResponse.json({ files, path: browserPath })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load remote files" },
      { status: 400 },
    )
  }
}
