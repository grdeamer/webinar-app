import { requireAdmin } from "@/lib/requireAdmin"
import { RETURN_SESSION } from "@/lib/zoom-bridge/server-return"
import { rtmsConfigured, rtmsReturn } from "@/lib/zoom-bridge/rtms-return"
import { meetingJoinLink } from "@/lib/zoom-bridge/meeting-link"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 20
const headers = { "Cache-Control": "no-store, private, max-age=0", "X-Content-Type-Options": "nosniff" }
export async function GET(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin" || request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403, headers })
  const url = new URL(request.url)
  if (url.searchParams.get("config") === "1") return Response.json({ configured: rtmsConfigured(), appReady: Boolean(process.env.ZOOM_RTMS_CLIENT_ID && process.env.ZOOM_RTMS_CLIENT_SECRET && process.env.ZOOM_RTMS_APP_ORIGIN === "https://app.jupiter.events") }, { headers })
  const id = url.searchParams.get("sessionId"), kind = url.searchParams.get("kind")
  if (!id || !RETURN_SESSION.test(id) || !["video", "share"].includes(kind ?? "")) return new Response(null, { status: 400, headers })
  try {
    const result = await rtmsReturn("frame", id, { kind }, request.signal)
    if (!result.jpeg) return Response.json(result.status, { headers })
    return new Response(new Uint8Array(result.jpeg), { headers: { ...headers, "Content-Type": "image/jpeg", "X-Return-State": result.status.state ?? "waiting" } })
  } catch { return Response.json({ error: "RTMS receiver unavailable" }, { status: 503, headers }) }
}
export async function POST(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin" || request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403, headers })
  if (Number(request.headers.get("content-length")) > 4096) return new Response(null, { status: 413, headers })
  try {
    const raw = await request.text()
    if (raw.length > 4096) return new Response(null, { status: 413, headers })
    const body = JSON.parse(raw)
    if (!["arm", "stop"].includes(body.action) || !RETURN_SESSION.test(body.sessionId)) return new Response(null, { status: 400, headers })
    const data = body.action === "arm" ? { meetingId: new URL(meetingJoinLink(body.joinUrl)).pathname.split("/")[2] } : {}
    const result = await rtmsReturn(body.action, body.sessionId, data, request.signal)
    return Response.json(result.status, { status: result.status.error ? 409 : 200, headers })
  } catch { return Response.json({ error: "RTMS request failed. Check receiver setup and meeting link." }, { status: 503, headers }) }
}
