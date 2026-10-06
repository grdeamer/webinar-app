import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { sourceRow } from "@/lib/zoom-bridge/source"
import { programSnapshot } from "@/lib/zoom-bridge/snapshot"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 15
const headers = { "Cache-Control": "no-store, private", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff" }
export async function POST(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin") return new Response(null, { status: 403, headers })
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403, headers })
  const source = await sourceRow()
  if (!source?.desired_running || source.source_kind !== "srt" || source.observed.status !== "receiving" || !source.last_seen || Date.now() - Date.parse(source.last_seen) > 15000) return NextResponse.json({ error: "No fresh HDMI program available" }, { status: 409, headers })
  try {
    const jpeg = await programSnapshot()
    return new Response(new Uint8Array(jpeg), { headers: { ...headers, "Content-Type": "image/jpeg" } })
  } catch { return NextResponse.json({ error: "Snapshot unavailable. Check that the program is receiving and try again." }, { status: 503, headers }) }
}
