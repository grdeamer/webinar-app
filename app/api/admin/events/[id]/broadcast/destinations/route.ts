import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { encryptBroadcastSecret, isBroadcastEncryptionConfigured, maskStreamKey } from "@/lib/broadcast/credentials"
import { isBroadcastProvider, maskBroadcastServerUrl, normalizeBroadcastServerUrl, providerLabels } from "@/lib/broadcast/config"
import { listBroadcastDestinations, toBroadcastDestination, type BroadcastDestinationRow } from "@/lib/broadcast/data"
import { recordAuditEvent } from "@/lib/cloud/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Params): Promise<Response> {
  const { id } = await context.params
  const access = await requireEventOperatorAccess(id)
  if (access instanceof Response) return access

  try {
    return NextResponse.json({
      ok: true,
      encryptionConfigured: isBroadcastEncryptionConfigured(),
      destinations: await listBroadcastDestinations(access.eventId),
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Destinations could not be loaded." }, { status: 500 })
  }
}

export async function POST(request: Request, context: Params): Promise<Response> {
  const { id } = await context.params
  const access = await requireEventOperatorAccess(id)
  if (access instanceof Response) return access

  try {
    const body = await request.json().catch((): null => null) as Record<string, unknown> | null
    if (!isBroadcastProvider(body?.provider)) {
      return NextResponse.json({ ok: false, error: "Choose a supported broadcast platform." }, { status: 400 })
    }

    const provider = body.provider
    const label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 120) : providerLabels[provider]
    const serverUrl = normalizeBroadcastServerUrl(body.serverUrl)
    const streamKey = typeof body.streamKey === "string" ? body.streamKey.trim() : ""
    const ciphertext = encryptBroadcastSecret(streamKey)

    const { data, error } = await supabaseAdmin
      .from("event_broadcast_destinations")
      .insert({
        event_id: access.eventId,
        provider,
        label,
        server_url: serverUrl,
        stream_key_ciphertext: ciphertext,
        stream_key_hint: streamKey.slice(-4),
        enabled: body.enabled !== false,
        reusable: body.reusable === true,
        status: body.enabled === false ? "disabled" : "ready",
        created_by: access.user.id,
        updated_at: new Date().toISOString(),
      })
      .select("id,event_id,provider,label,server_url,stream_key_hint,enabled,reusable,status,last_tested_at,created_at,updated_at")
      .single()
    if (error) throw new Error(error.message)

    await recordAuditEvent({
      eventId: access.eventId,
      actorId: access.user.id,
      actorEmail: access.user.email,
      category: "broadcast",
      action: "broadcast.destination.created",
      summary: `Added ${label} as a broadcast destination`,
      targetType: "event_broadcast_destination",
      targetId: data.id,
      metadata: { provider, serverUrl: maskBroadcastServerUrl(serverUrl), maskedStreamKey: maskStreamKey(streamKey) },
    })

    return NextResponse.json({
      ok: true,
      destination: toBroadcastDestination(data as unknown as Omit<BroadcastDestinationRow, "stream_key_ciphertext">),
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Destination could not be saved." }, { status: 400 })
  }
}
