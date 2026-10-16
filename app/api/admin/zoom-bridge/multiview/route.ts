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
    const { ids, expanded } = parseMonitorRequest(await request.json())
    const saved = await rows()
    if (ids.some(id => !saved.some(room => room.id === id))) return new Response(null, { status: 404, headers })
    const command = `${expanded ? "satellite-preview" : "satellite-grid"} ${ids.join(",")}`
    return new Response(liveProgram(request.signal, command), { headers: { ...headers, "Content-Type": "video/mp4" } })
  } catch { return new Response("Invalid monitor selection", { status: 400, headers }) }
}
