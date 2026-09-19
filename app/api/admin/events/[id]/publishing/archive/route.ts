import { NextResponse } from "next/server"
import { extractPublishArchive } from "@/lib/external-publishing/archive"
import { requirePublishingApiAccess } from "@/lib/external-publishing/authorization"
import { loadPublishDestination } from "@/lib/external-publishing/destinations"
import { publishArtifacts } from "@/lib/external-publishing/ftpPublisher"
import { logPublishingEvent } from "@/lib/external-publishing/logging"
import { recordAuditEvent } from "@/lib/cloud/audit"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const maxDuration = 300

const bucket = "upload"
const maxArchiveBytes = 50 * 1024 * 1024

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await requirePublishingApiAccess(id)
  if (access instanceof NextResponse) return access
  const body = await request.json().catch((): null => null)
  const destinationId = String(body?.destination_id || "")
  const stagingPath = String(body?.staging_path || "")
  const expectedPrefix = `external-publishing/${id}/${destinationId}/`
  if (!stagingPath.startsWith(expectedPrefix) || !stagingPath.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "ZIP upload reference is invalid" }, { status: 400 })
  }

  let deploymentId: string | null = null
  try {
    const { row, connection } = await loadPublishDestination(destinationId, id)
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(stagingPath, 120)
    if (error) throw error
    const response = await fetch(data.signedUrl, { cache: "no-store" })
    if (!response.ok) throw new Error("Could not read the staged ZIP")
    const content = Buffer.from(await response.arrayBuffer())
    if (!content.length || content.length > maxArchiveBytes) throw new Error("ZIP must be between 1 byte and 50 MB")
    const artifacts = await extractPublishArchive(content)

    const { data: deployment, error: deploymentError } = await supabaseAdmin
      .from("event_publish_deployments")
      .insert({ event_id: id, destination_id: row.id, status: "publishing", created_by: access.user.id })
      .select("id")
      .single()
    if (deploymentError || !deployment) throw new Error(deploymentError?.message || "Could not create deployment")
    deploymentId = deployment.id
    logPublishingEvent("info", "archive-publish.started", { eventId: id, destinationId: row.id, deploymentId, fileCount: artifacts.length })

    const result = await publishArtifacts({ connection, deploymentId, artifacts })
    const completedAt = new Date().toISOString()
    await Promise.all([
      supabaseAdmin.from("event_publish_deployments").update({ status: "published", files: result.files, backup_path: result.backupPath, completed_at: completedAt }).eq("id", deploymentId),
      supabaseAdmin.from("event_publish_destinations").update({ last_published_at: completedAt, last_status: "published", last_error: null, updated_at: completedAt }).eq("id", row.id),
      supabaseAdmin.storage.from(bucket).remove([stagingPath]),
    ])
    logPublishingEvent("info", "archive-publish.completed", { eventId: id, destinationId: row.id, deploymentId, fileCount: result.files.length })
    await recordAuditEvent({ eventId: id, actorId: access.user.id, actorEmail: access.user.email, category: "delivery", action: "experience.archive_published", summary: "Published an event site ZIP", targetType: "deployment", targetId: deploymentId, metadata: { destinationId: row.id, fileCount: result.files.length } })
    return NextResponse.json({ ok: true, deployment_id: deploymentId, published_at: completedAt, files: result.files.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : "ZIP publish failed"
    const failedAt = new Date().toISOString()
    await Promise.all([
      deploymentId
        ? supabaseAdmin.from("event_publish_deployments").update({ status: "failed", error: message, completed_at: failedAt }).eq("id", deploymentId)
        : Promise.resolve(),
      destinationId
        ? supabaseAdmin.from("event_publish_destinations").update({ last_status: "failed", last_error: message, updated_at: failedAt }).eq("id", destinationId).eq("event_id", id)
        : Promise.resolve(),
      supabaseAdmin.storage.from(bucket).remove([stagingPath]),
    ])
    logPublishingEvent("error", "archive-publish.failed", { eventId: id, destinationId, deploymentId, error: message })
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
