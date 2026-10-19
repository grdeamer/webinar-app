import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { TABLE } from "@/lib/zoom-bridge/server"
import { SOURCE_TABLE } from "@/lib/zoom-bridge/source"
import { ec2RuntimeConfigured, runtimeStatus, startRuntime, stopRuntime } from "@/lib/zoom-bridge/ec2-runtime"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "no-store", Pragma: "no-cache" }
export async function GET() {
  if ((await requireAdmin()).profile.role !== "admin") return NextResponse.json({ error: "Administrator access required" }, { status: 403, headers })
  try { return NextResponse.json(await runtimeStatus(), { headers }) }
  catch { return NextResponse.json({ error: "Could not read broadcast server status." }, { status: 503, headers }) }
}
async function clearConnections() {
  const revision = randomUUID()
  const results = await Promise.all([
    supabaseAdmin.from(TABLE).update({ desired_running: false, revision }).not("id", "is", null),
    supabaseAdmin.from(SOURCE_TABLE).update({ desired_running: false, revision }).eq("id", "program"),
  ])
  if (results.some(result => result.error)) throw new Error("Could not prepare saved connections for the new session.")
}
export async function POST(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin") return NextResponse.json({ error: "Administrator access required" }, { status: 403, headers })
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403, headers })
  if (!ec2RuntimeConfigured()) return NextResponse.json({ error: "Broadcast server is not configured." }, { status: 503, headers })
  try {
    const body = await request.json()
    if (body.action === "start") return NextResponse.json(await startRuntime(body.minutes, clearConnections), { headers })
    if (body.action === "stop" && body.confirm === true) {
      await clearConnections()
      return NextResponse.json(await stopRuntime(), { headers })
    }
    return NextResponse.json({ error: "Choose Start server, or confirm Stop server." }, { status: 400, headers })
  } catch { return NextResponse.json({ error: "AWS did not confirm the action. Refresh server status before retrying." }, { status: 503, headers }) }
}
