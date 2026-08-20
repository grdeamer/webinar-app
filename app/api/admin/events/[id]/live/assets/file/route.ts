import { NextResponse } from "next/server"

import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bucket = "upload"
const signedUrlLifetimeSeconds = 60 * 5

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params
  const auth = await requireEventOperatorAccess(id)
  if (auth instanceof Response) return auth

  const storagePath = new URL(req.url).searchParams.get("path")?.trim() ?? ""
  if (!storagePath.startsWith(`event-live/${id}/`)) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 })
  }

  const { data: asset, error: assetError } = await supabaseAdmin
    .from("event_live_assets")
    .select("id")
    .eq("event_id", id)
    .eq("storage_path", storagePath)
    .maybeSingle()

  if (assetError) {
    return NextResponse.json({ error: assetError.message }, { status: 500 })
  }
  if (!asset) {
    return NextResponse.json({ error: "Asset was not found" }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(storagePath, signedUrlLifetimeSeconds)

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message || "Asset could not be opened" },
      { status: 500 },
    )
  }

  const response = NextResponse.redirect(data.signedUrl, 302)
  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  return response
}
