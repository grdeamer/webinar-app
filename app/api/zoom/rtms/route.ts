import { verifiedRtmsEvent, rtmsChallenge } from "@/lib/zoom-bridge/rtms-webhook"
import { rtmsConfigured, rtmsReturn } from "@/lib/zoom-bridge/rtms-return"
export const runtime = "nodejs"
export const maxDuration = 20
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
export async function POST(request: Request) {
  const secret = process.env.ZOOM_RTMS_WEBHOOK_SECRET
  if (!secret) return new Response(null, { status: 503, headers })
  if (Number(request.headers.get("content-length")) > 30000) return new Response(null, { status: 413, headers })
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw) > 30000) return new Response(null, { status: 413, headers })
    const timestamp = request.headers.get("x-zm-request-timestamp"), signature = request.headers.get("x-zm-signature")
    const event = verifiedRtmsEvent(raw, timestamp, signature, secret)
    if (event.event === "endpoint.url_validation" && typeof event.payload?.plainToken === "string") return Response.json(rtmsChallenge(event.payload.plainToken, secret), { headers })
    if (!["meeting.rtms_started", "meeting.rtms_stopped", "meeting.rtms_interrupted"].includes(event.event ?? "")) return new Response(null, { status: 204, headers })
    if (!rtmsConfigured()) return new Response(null, { status: 503, headers })
    const result = await rtmsReturn("event", null, { raw, timestamp, signature }, request.signal)
    return new Response(null, { status: result.status.error ? 503 : 204, headers })
  } catch { return new Response(null, { status: 400, headers }) }
}
