import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { createSupabaseAdminClient, supabaseAdmin } from "@/lib/supabase/admin"
import { TABLE } from "@/lib/zoom-bridge/server"
import { previewTopic } from "@/lib/zoom-bridge/preview"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60
const headers = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" }
async function roomFor(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin") return null
  const id = new URL(request.url).searchParams.get("id")
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await supabaseAdmin.from(TABLE).select("id").eq("id", id).maybeSingle()
  return error ? null : data
}
export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403, headers })
  const room = await roomFor(request)
  if (!room) return NextResponse.json({ error: "Satellite unavailable" }, { status: 403, headers })
  const { error } = await supabaseAdmin.from(TABLE).update({ preview_until: new Date(Date.now() + 45000).toISOString() }).eq("id", room.id)
  return NextResponse.json({ ok: !error }, { status: error ? 503 : 200, headers })
}
export async function GET(request: Request) {
  const room = await roomFor(request)
  if (!room) return NextResponse.json({ error: "Satellite unavailable" }, { status: 403, headers })
  const client = createSupabaseAdminClient()
  const channel = client.channel(previewTopic(room.id), { config: { private: true } })
  const encoder = new TextEncoder()
  let cleanup = () => {}
  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      function send(event: string, payload: object) {
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`))
      }
      const heartbeat = setInterval(() => send("heartbeat", {}), 10000)
      const deadline = setTimeout(() => cleanup(), 50000)
      cleanup = () => {
        if (closed) return
        closed = true; clearInterval(heartbeat); clearTimeout(deadline)
        request.signal.removeEventListener("abort", cleanup)
        void client.removeChannel(channel); controller.close()
      }
      channel.on("broadcast", { event: "audio" }, ({ payload }) => send("audio", payload))
        .subscribe(status => {
          if (status === "SUBSCRIBED") send("ready", {})
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { send("unavailable", {}); cleanup() }
        })
      request.signal.addEventListener("abort", cleanup, { once: true })
      send("connecting", {})
      if (request.signal.aborted) cleanup()
    },
    cancel() { cleanup() },
  })
  return new Response(stream, { headers: { ...headers, "Content-Type": "text/event-stream", "X-Accel-Buffering": "no" } })
}
