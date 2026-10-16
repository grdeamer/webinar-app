import { requireAdmin } from "@/lib/requireAdmin"
import { rows } from "@/lib/zoom-bridge/server"
import { liveProgram } from "@/lib/zoom-bridge/live-preview"
import { parseMonitorRequest } from "@/lib/zoom-bridge/multiview"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 130
const headers = { "Cache-Control": "no-store, private, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Accel-Buffering": "no" }
export async function POST(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin" || request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403, headers })
  try {
    const body = await request.json()
    const sessionId = body.sessionId
    if (typeof sessionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sessionId)) return new Response(null, { status: 400, headers })
    if (body.stop === true) {
      const reader = liveProgram(request.signal, `satellite-stop ${sessionId}`).getReader()
      while (!(await reader.read()).done) { /* no media on this fixed control command */ }
      return new Response(null, { status: 204, headers })
    }
    const { ids, expanded } = parseMonitorRequest(body)
    const saved = await rows()
    if (ids.some(id => !saved.some(room => room.id === id))) return new Response(null, { status: 404, headers })
    const command = `${expanded ? "satellite-preview" : "satellite-grid"} ${sessionId} ${ids.join(",")}`
    return new Response(liveProgram(request.signal, command), { headers: { ...headers, "Content-Type": "video/mp4" } })
  } catch { return new Response("Invalid monitor selection", { status: 400, headers }) }
}
