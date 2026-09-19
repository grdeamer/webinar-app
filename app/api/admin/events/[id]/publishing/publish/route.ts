import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requirePublishingApiAccess } from "@/lib/external-publishing/authorization"
import { loadPublishDestination } from "@/lib/external-publishing/destinations"
import { buildLetsPublishArtifacts } from "@/lib/external-publishing/letsTemplate"
import { publishArtifacts } from "@/lib/external-publishing/ftpPublisher"
import { recordAuditEvent } from "@/lib/cloud/audit"
import { logPublishingEvent } from "@/lib/external-publishing/logging"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await requirePublishingApiAccess(id)
  if (access instanceof NextResponse) return access
  const body = await request.json().catch((): null => null)

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,slug")
    .eq("id", id)
    .single()
  if (eventError || !event) return NextResponse.json({ error: eventError?.message || "Event not found" }, { status: 404 })

  let deploymentId: string | null = null
  let destinationId: string | null = null

  try {
    const { row, connection } = await loadPublishDestination(String(body?.destination_id || ""), id)
    destinationId = row.id
    logPublishingEvent("info", "publish.started", { eventId: id, destinationId: row.id })
    const { data: deployment, error: deploymentError } = await supabaseAdmin
      .from("event_publish_deployments")
      .insert({ event_id: id, destination_id: row.id, status: "publishing", created_by: access.user.id })
      .select("id")
      .single()
    if (deploymentError || !deployment) throw new Error(deploymentError?.message || "Could not create deployment")
    deploymentId = deployment.id

    const jupiterOrigin = process.env.NEXT_PUBLIC_SITE_URL || "https://app.jupiter.events"
    const artifacts = await buildLetsPublishArtifacts({ eventSlug: event.slug, jupiterOrigin, eventId: event.id })
    const result = await publishArtifacts({ connection, deploymentId: deployment.id, artifacts })
    const completedAt = new Date().toISOString()

    await Promise.all([
      supabaseAdmin.from("event_publish_deployments").update({ status: "published", files: result.files, backup_path: result.backupPath, completed_at: completedAt }).eq("id", deployment.id),
      supabaseAdmin.from("event_publish_destinations").update({ last_published_at: completedAt, last_status: "published", last_error: null, updated_at: completedAt }).eq("id", row.id),
    ])
    logPublishingEvent("info", "publish.completed", { eventId: id, destinationId: row.id, deploymentId: deployment.id, fileCount: result.files.length })
    await recordAuditEvent({ eventId: id, actorId: access.user.id, actorEmail: access.user.email, category: "delivery", action: "experience.published", summary: "Published the event experience", targetType: "deployment", targetId: deployment.id, metadata: { destinationId: row.id, publicUrl: row.public_url } })

    return NextResponse.json({ ok: true, deployment_id: deployment.id, published_at: completedAt, public_url: row.public_url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed"
    logPublishingEvent("error", "publish.failed", { eventId: id, destinationId, deploymentId, error: message })
    const failedAt = new Date().toISOString()
    await Promise.all([
      deploymentId
        ? supabaseAdmin.from("event_publish_deployments").update({ status: "failed", error: message, completed_at: failedAt }).eq("id", deploymentId)
        : Promise.resolve(),
      destinationId
        ? supabaseAdmin.from("event_publish_destinations").update({ last_status: "failed", last_error: message, updated_at: failedAt }).eq("id", destinationId)
        : Promise.resolve(),
    ])
    await recordAuditEvent({ eventId: id, actorId: access.user.id, actorEmail: access.user.email, category: "delivery", action: "experience.publish_failed", summary: `Event experience publish failed: ${message}`, targetType: "deployment", targetId: deploymentId, metadata: { destinationId } })
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
