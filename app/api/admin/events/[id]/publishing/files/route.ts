import { NextResponse } from "next/server"
import { loadPublishDestination } from "@/lib/external-publishing/destinations"
import { listRemoteFiles } from "@/lib/external-publishing/ftpPublisher"
import { requirePublishingApiAccess } from "@/lib/external-publishing/authorization"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await requirePublishingApiAccess(id)
  if (access instanceof NextResponse) return access
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
