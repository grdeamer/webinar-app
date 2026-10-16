import { requireAdmin } from "@/lib/requireAdmin"
import { sourceRow } from "@/lib/zoom-bridge/source"
import { liveProgram } from "@/lib/zoom-bridge/live-preview"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 130
const headers = { "Cache-Control": "no-store, private, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Accel-Buffering": "no" }
export async function POST(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin" || request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403, headers })
  const source = await sourceRow()
  if (!source?.desired_running || source.source_kind !== "srt" || source.observed.status !== "receiving" || !source.last_seen || Date.now() - Date.parse(source.last_seen) > 15000) return new Response("No fresh program input", { status: 409, headers })
  return new Response(liveProgram(request.signal), { headers: { ...headers, "Content-Type": "video/mp4" } })
}
