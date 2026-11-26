import { requireAdmin } from "@/lib/requireAdmin"
import { RETURN_SESSION } from "@/lib/zoom-bridge/server-return"
import { desktopConfigured, desktopReturn } from "@/lib/zoom-bridge/desktop-return"
import { meetingJoinLink } from "@/lib/zoom-bridge/meeting-link"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 20
const headers = { "Cache-Control": "no-store, private, max-age=0", "X-Content-Type-Options": "nosniff" }

export async function GET(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin" || request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403, headers })
  if (!desktopConfigured()) return Response.json({ configured: false, state: "stopped" }, { headers })
  const params = new URL(request.url).searchParams
  const id = params.get("sessionId")
  const cursor = params.get("after")
  if (id !== null && !RETURN_SESSION.test(id)) return new Response(null, { status: 400, headers })
  if (cursor !== null && (!id || !/^\d{1,3}$/.test(cursor) || Number(cursor) > 900)) return new Response(null, { status: 400, headers })
  try {
    const result = await desktopReturn(cursor !== null ? "audio" : id ? "frame" : "status", id, cursor === null ? {} : { after: Number(cursor) }, request.signal)
    if (result.audio) return new Response(new Uint8Array(result.audio), { headers: {
      ...headers, "Content-Type": "application/octet-stream", "X-Audio-Sequence": String(result.audioSequence),
    } })
    if (!result.jpeg) return Response.json({ configured: true, ...result.status }, { headers })
    return new Response(new Uint8Array(result.jpeg), { headers: { ...headers, "Content-Type": "image/jpeg", "X-Return-State": result.status.state ?? "desktop_ready", "X-Return-Remaining": String(result.status.remainingSeconds ?? 0) } })
  } catch { return Response.json({ error: "Server desktop unavailable. Check the shared server." }, { status: 503, headers }) }
}

export async function POST(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin" || request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403, headers })
  if (!desktopConfigured()) return new Response(null, { status: 503, headers })
  if (Number(request.headers.get("content-length")) > 4096) return new Response(null, { status: 413, headers })
  try {
    const raw = await request.text()
    if (raw.length > 4096) return new Response(null, { status: 413, headers })
    const body = JSON.parse(raw)
    if (!["start", "stop"].includes(body.action) || !RETURN_SESSION.test(body.sessionId)) return new Response(null, { status: 400, headers })
    const result = await desktopReturn(body.action, body.sessionId, body.action === "start" ? { joinUrl: meetingJoinLink(body.joinUrl) } : {}, request.signal)
    return Response.json(result.status, { status: result.status.error ? 409 : 200, headers })
  } catch { return Response.json({ error: "Desktop request failed. Check server status before retrying." }, { status: 400, headers }) }
}
