import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { loadPublishDestination } from "@/lib/external-publishing/destinations"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bucket = "upload"
const maxFileSize = 50 * 1024 * 1024

function safeFileName(value: unknown) {
  const name = String(value || "").trim()
  if (!name || name === "." || name === ".." || name === ".jupiter" || /[\\/\0]/.test(name)) return null
  return name.slice(0, 255)
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await context.params
  const body = await request.json().catch((): null => null)
  const destinationId = String(body?.destination_id || "")
  const fileName = safeFileName(body?.file_name)
  const fileSize = Number(body?.size_bytes || 0)

  if (!fileName) return NextResponse.json({ error: "File name is invalid" }, { status: 400 })
  if (!Number.isInteger(fileSize) || fileSize < 1 || fileSize > maxFileSize) {
    return NextResponse.json({ error: "Files must be between 1 byte and 50 MB" }, { status: 400 })
  }

  try {
    await loadPublishDestination(destinationId, id)
    const stagingPath = `external-publishing/${id}/${destinationId}/${randomUUID()}/${fileName}`
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(stagingPath)
    if (error) throw error

    return NextResponse.json({ path: data.path, token: data.token })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare upload" },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
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
    await loadPublishDestination(destinationId, id)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publish destination not found" },
      { status: 400 },
    )
  }

  await supabaseAdmin.storage.from(bucket).remove([stagingPath])
  return NextResponse.json({ ok: true })
}
