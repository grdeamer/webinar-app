import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requirePublishingApiAccess } from "@/lib/external-publishing/authorization"
import { loadPublishDestination } from "@/lib/external-publishing/destinations"
import { rollbackArtifacts } from "@/lib/external-publishing/ftpPublisher"
import { logPublishingEvent } from "@/lib/external-publishing/logging"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await requirePublishingApiAccess(id)
  if (access instanceof NextResponse) return access
  const body = await request.json().catch((): null => null)

  const { data: deployment, error } = await supabaseAdmin
    .from("event_publish_deployments")
    .select("id,destination_id,files,backup_path,status")
    .eq("id", String(body?.deployment_id || ""))
    .eq("event_id", id)
    .single()
  if (error || !deployment?.backup_path || !Array.isArray(deployment.files)) {
    return NextResponse.json({ error: error?.message || "Deployment backup is unavailable" }, { status: 400 })
  }

  try {
    const { connection } = await loadPublishDestination(deployment.destination_id, id)
    logPublishingEvent("info", "rollback.started", { eventId: id, deploymentId: deployment.id, destinationId: deployment.destination_id })
    await rollbackArtifacts({ connection, backupPath: deployment.backup_path, files: deployment.files })
    await supabaseAdmin.from("event_publish_deployments").update({ status: "rolled_back", completed_at: new Date().toISOString() }).eq("id", deployment.id)
    logPublishingEvent("info", "rollback.completed", { eventId: id, deploymentId: deployment.id, destinationId: deployment.destination_id })
    return NextResponse.json({ ok: true })
  } catch (rollbackError) {
    const message = rollbackError instanceof Error ? rollbackError.message : "Rollback failed"
    logPublishingEvent("error", "rollback.failed", { eventId: id, deploymentId: deployment.id, destinationId: deployment.destination_id, error: message })
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
