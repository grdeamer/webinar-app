import { requireAdmin } from "@/lib/requireAdmin"
import { meetingJoinLink } from "@/lib/zoom-bridge/meeting-link"
import { RETURN_SESSION, serverReturn, serverReturnConfigured } from "@/lib/zoom-bridge/server-return"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 20
const headers = { "Cache-Control": "no-store, private, max-age=0", "X-Content-Type-Options": "nosniff" }
export async function GET(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin" || request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403, headers })
  if (!serverReturnConfigured()) return Response.json({ configured: false, error: "Server monitor installation is not complete." }, { status: 503, headers })
  const url = new URL(request.url), sessionId = url.searchParams.get("sessionId") ?? ""
  if (!RETURN_SESSION.test(sessionId)) return new Response(null, { status: 400, headers })
  try {
    const result = await serverReturn("frame", sessionId, request.signal)
    if (!result.jpeg) return Response.json(result.status, { headers })
    return new Response(new Uint8Array(result.jpeg), { headers: { ...headers, "Content-Type": "image/jpeg", "X-Return-State": result.status.state ?? "joining", "X-Return-Remaining": String(result.status.remainingSeconds ?? 0) } })
  } catch { return Response.json({ error: "Server monitor unavailable. Check that the receiver is running." }, { status: 503, headers }) }
}
export async function POST(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin" || request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403, headers })
  if (!serverReturnConfigured()) return Response.json({ error: "Server monitor installation is not complete." }, { status: 503, headers })
  if (Number(request.headers.get("content-length")) > 4096) return new Response(null, { status: 413, headers })
  try {
    const raw = await request.text()
    if (raw.length > 4096) return new Response(null, { status: 413, headers })
    const body = JSON.parse(raw)
    if (!["start", "stop"].includes(body.action) || !RETURN_SESSION.test(body.sessionId)) return new Response(null, { status: 400, headers })
    const joinUrl = body.action === "start" ? meetingJoinLink(body.joinUrl) : undefined
    const result = await serverReturn(body.action, body.sessionId, request.signal, joinUrl)
    return Response.json(result.status, { status: result.status.error ? 409 : 200, headers })
  } catch { return Response.json({ error: "Monitor request failed. Verify the meeting link and receiver connection." }, { status: 400, headers }) }
}
