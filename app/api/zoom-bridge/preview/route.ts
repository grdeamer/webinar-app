import { NextResponse } from "next/server"
import { agentAuthorized, TABLE } from "@/lib/zoom-bridge/server"
import { createSupabaseAdminClient, supabaseAdmin } from "@/lib/supabase/admin"
import { previewTopic, previewLeaseActive } from "@/lib/zoom-bridge/preview"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" }
  if (!agentAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers })
  const id = request.headers.get("x-satellite-id")
  const audio = request.headers.get("content-type") === "application/json"
  if (!id || !/^[0-9a-f-]{36}$/i.test(id) || (!audio && request.headers.get("content-type") !== "image/jpeg")) return new Response(null, { status: 400, headers })
  if (!audio) return new Response(null, { status: 410, headers })
  const declared = Number(request.headers.get("content-length"))
  if (!declared || declared > (audio ? 1024 : 180000)) return new Response(null, { status: 413, headers })
  const { data } = await supabaseAdmin.from(TABLE).select("preview_until,desired_running,observed,last_seen").eq("id", id).maybeSingle()
  if (!data?.desired_running || !previewLeaseActive(data.preview_until) || data.observed?.status !== "joined" || (!audio && !data.observed?.camera) || Date.now() - Date.parse(data.last_seen) > 15000) return new Response(null, { status: 204, headers })
  let payload: object
  if (audio) {
    const level = await request.json()
    if (![level.peak, level.rms].every(v => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1) || typeof level.muted !== "boolean") return new Response(null, { status: 400, headers })
    payload = { peak: level.peak, rms: level.rms, muted: level.muted, sentAt: Date.now() }
  } else {
    const frame = Buffer.from(await request.arrayBuffer())
    if (frame.length > 180000 || frame.length < 4 || frame[0] !== 255 || frame[1] !== 216 || frame.at(-2) !== 255 || frame.at(-1) !== 217) return new Response(null, { status: 400, headers })
    payload = { jpeg: frame.toString("base64"), sentAt: Date.now(), resolution: data.observed.videoResolution }
  }
  const client = createSupabaseAdminClient()
  const channel = client.channel(previewTopic(id), { config: { private: true } })
  try {
    const result = await channel.httpSend(audio ? "audio" : "frame", payload, { timeout: 5000 })
    return new Response(null, { status: result.success ? 204 : 503, headers })
  } finally { await client.removeChannel(channel) }
}
