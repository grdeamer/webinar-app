import {presentationMetadata} from '@/lib/producer/presentationMetadata'
import { validateProducerMedia } from "@/lib/producer/mediaAssets"
import { NextResponse } from "next/server"

import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bucket = "upload"
const signedUrlLifetimeSeconds = 60 * 60 * 6

async function withSignedUrl<T extends { storage_path: string; public_url?: string | null }>(
  asset: T
): Promise<T & { signed_url: string | null }> {
  const { data } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(asset.storage_path, signedUrlLifetimeSeconds)

  return {
    ...asset,
    signed_url: data?.signedUrl ?? asset.public_url ?? null,
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id, ["event_admin", "producer"], "producer_room")
  if (auth instanceof Response) return auth

  const { data, error } = await supabaseAdmin
    .from("event_live_assets")
    .select("id, asset_type, label, storage_path, public_url, mime_type, byte_size, metadata, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    assets: await Promise.all((data ?? []).map(withSignedUrl)),
  })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id, ["event_admin", "producer"], "producer_room")
  if (auth instanceof Response) return auth

  const body = await req.json().catch((): null => null)
  const path = String(body?.path || "")
  const label = String(body?.label || "Live asset").trim().slice(0, 255)
  const mimeType = String(body?.mimeType || "application/octet-stream")
  const byteSize = Number(body?.byteSize || 0)
  const assetType = String(body?.assetType || "").slice(0, 30)

  if (!path.startsWith(`event-live/${id}/`)) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 })
  }
  let deck:ReturnType<typeof presentationMetadata>
  try {
    deck=presentationMetadata(body?.deck)
    if(deck&&assetType!=="pdf")throw Error("Slide metadata requires a PDF")
    if (validateProducerMedia(mimeType, byteSize) !== assetType) throw new Error("Asset type does not match its media format")
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid asset type" }, { status: 400 })
  }

  const folder = path.split("/").slice(0, -1).join("/")
  const file = path.split("/").at(-1) || ""
  const { data: objects, error: listError } = await supabaseAdmin.storage
    .from(bucket)
    .list(folder, { search: file, limit: 1 })
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }
  if (!objects?.some((object) => object.name === file)) {
    return NextResponse.json({ error: "Uploaded asset was not found" }, { status: 409 })
  }

  const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  const { data, error } = await supabaseAdmin
    .from("event_live_assets")
    .insert({
      event_id: id,
      asset_type: assetType,
      label,
      storage_path: path,
      public_url: publicData.publicUrl,
      metadata: { holding: body?.holding === true, ...(deck?{deck}:{}) },
      mime_type: mimeType,
      byte_size: byteSize,
      created_by: auth.user.id,
    })
    .select("*")
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ asset: await withSignedUrl(data) })
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id, ["event_admin", "producer"], "producer_room")
  if (auth instanceof Response) return auth

  const body = await req.json().catch((): null => null)
  const assetId = String(body?.assetId || "").trim()

  if (!assetId) {
    return NextResponse.json({ error: "Asset id is required" }, { status: 400 })
  }

  const { data: asset, error: findError } = await supabaseAdmin
    .from("event_live_assets")
    .select("id, storage_path")
    .eq("event_id", id)
    .eq("id", assetId)
    .maybeSingle()

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }
  if (!asset) {
    return NextResponse.json({ error: "Asset was not found" }, { status: 404 })
  }

  const { error: storageError } = await supabaseAdmin.storage
    .from(bucket)
    .remove([asset.storage_path])

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { error: deleteError } = await supabaseAdmin
    .from("event_live_assets")
    .delete()
    .eq("event_id", id)
    .eq("id", assetId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id, ["event_admin", "producer"], "producer_room")
  if (auth instanceof Response) return auth
  const body = await req.json().catch((): null => null)
  if (typeof body?.assetId !== "string" || typeof body?.holding !== "boolean") return NextResponse.json({ error: "Asset and Holding classification required" }, { status: 400 })
  const { data: existing, error: readError } = await supabaseAdmin.from("event_live_assets").select("metadata").eq("id", body.assetId).eq("event_id", id).maybeSingle()
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: "Source not found" }, { status: 404 })
  const { error } = await supabaseAdmin.from("event_live_assets").update({ metadata: { ...existing.metadata, holding: body.holding } }).eq("id", body.assetId).eq("event_id", id)
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ updated: true })
}
