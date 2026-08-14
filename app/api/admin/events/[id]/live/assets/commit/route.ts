import { NextResponse } from "next/server"

import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bucket = "upload"

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id)
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
  if (!["pdf", "image", "video"].includes(assetType)) {
    return NextResponse.json({ error: "Invalid asset type" }, { status: 400 })
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
      mime_type: mimeType,
      byte_size: byteSize,
      created_by: auth.user.id,
    })
    .select("*")
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ asset: data })
}
