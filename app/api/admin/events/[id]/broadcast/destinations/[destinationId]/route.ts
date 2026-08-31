import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { encryptBroadcastSecret } from "@/lib/broadcast/credentials"
import { isBroadcastProvider, normalizeBroadcastServerUrl } from "@/lib/broadcast/config"
import { toBroadcastDestination, type BroadcastDestinationRow } from "@/lib/broadcast/data"
import { recordAuditEvent } from "@/lib/cloud/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string; destinationId: string }> }

export async function PATCH(request: Request, context: Params): Promise<Response> {
  const { id, destinationId } = await context.params
  const access = await requireEventOperatorAccess(id)
  if (access instanceof Response) return access

  try {
    const body = await request.json().catch((): null => null) as Record<string, unknown> | null
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body?.provider !== undefined) {
      if (!isBroadcastProvider(body.provider)) return NextResponse.json({ ok: false, error: "Unsupported platform." }, { status: 400 })
      updates.provider = body.provider
    }
    if (body?.label !== undefined) {
      const label = typeof body.label === "string" ? body.label.trim().slice(0, 120) : ""
      if (!label) return NextResponse.json({ ok: false, error: "Destination name is required." }, { status: 400 })
      updates.label = label
    }
    if (body?.serverUrl !== undefined) updates.server_url = normalizeBroadcastServerUrl(body.serverUrl)
    if (body?.streamKey !== undefined && typeof body.streamKey === "string" && body.streamKey.trim()) {
      const streamKey = body.streamKey.trim()
      updates.stream_key_ciphertext = encryptBroadcastSecret(streamKey)
      updates.stream_key_hint = streamKey.slice(-4)
    }
    if (body?.enabled !== undefined) {
      updates.enabled = body.enabled === true
      updates.status = body.enabled === true ? "ready" : "disabled"
    }
    if (body?.reusable !== undefined) updates.reusable = body.reusable === true

    const { data, error } = await supabaseAdmin
      .from("event_broadcast_destinations")
      .update(updates)
      .eq("event_id", access.eventId)
      .eq("id", destinationId)
      .select("id,event_id,provider,label,server_url,stream_key_hint,enabled,reusable,status,last_tested_at,created_at,updated_at")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ ok: false, error: "Destination not found." }, { status: 404 })

    await recordAuditEvent({ eventId: access.eventId, actorId: access.user.id, actorEmail: access.user.email, category: "broadcast", action: "broadcast.destination.updated", summary: `Updated ${data.label}`, targetType: "event_broadcast_destination", targetId: data.id, metadata: { changedFields: Object.keys(updates).filter((key) => key !== "stream_key_ciphertext") } })
    return NextResponse.json({
      ok: true,
      destination: toBroadcastDestination(data as unknown as Omit<BroadcastDestinationRow, "stream_key_ciphertext">),
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Destination could not be updated." }, { status: 400 })
  }
}

export async function DELETE(_request: Request, context: Params): Promise<Response> {
  const { id, destinationId } = await context.params
  const access = await requireEventOperatorAccess(id)
  if (access instanceof Response) return access

  const { data, error } = await supabaseAdmin
    .from("event_broadcast_destinations")
    .delete()
    .eq("event_id", access.eventId)
    .eq("id", destinationId)
    .select("id,label")
    .maybeSingle()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ ok: false, error: "Destination not found." }, { status: 404 })

  await recordAuditEvent({ eventId: access.eventId, actorId: access.user.id, actorEmail: access.user.email, category: "broadcast", action: "broadcast.destination.deleted", summary: `Removed ${data.label}`, targetType: "event_broadcast_destination", targetId: data.id })
  return NextResponse.json({ ok: true })
}
