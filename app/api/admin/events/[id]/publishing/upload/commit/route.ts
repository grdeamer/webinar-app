import { Readable } from "node:stream"
import { NextResponse } from "next/server"
import { loadPublishDestination } from "@/lib/external-publishing/destinations"
import { RemoteFileExistsError, uploadRemoteFile } from "@/lib/external-publishing/ftpPublisher"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const maxDuration = 60

const bucket = "upload"
const maxFileSize = 50 * 1024 * 1024

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await context.params
  const body = await request.json().catch((): null => null)
  const destinationId = String(body?.destination_id || "")
  const stagingPath = String(body?.staging_path || "")
  const expectedPrefix = `external-publishing/${id}/${destinationId}/`

  if (!stagingPath.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Upload reference is invalid" }, { status: 400 })
  }

  try {
    const { connection } = await loadPublishDestination(destinationId, id)
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(stagingPath, 60)
    if (error) throw error

    const response = await fetch(data.signedUrl, { cache: "no-store" })
    if (!response.ok || !response.body) throw new Error("Could not read the staged upload")
    const contentLength = Number(response.headers.get("content-length") || 0)
    if (contentLength > maxFileSize) throw new Error("Files must be 50 MB or smaller")

    const result = await uploadRemoteFile({
      connection,
      browserPath: String(body?.path || ""),
      fileName: String(body?.file_name || ""),
      source: Readable.from(response.body as unknown as AsyncIterable<Uint8Array>),
      overwrite: body?.overwrite === true,
    })

    await supabaseAdmin.storage.from(bucket).remove([stagingPath])
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof RemoteFileExistsError) {
      return NextResponse.json({ error: error.message, conflict: true }, { status: 409 })
    }
    await supabaseAdmin.storage.from(bucket).remove([stagingPath])
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not upload remote file" },
      { status: 400 },
    )
  }
}
