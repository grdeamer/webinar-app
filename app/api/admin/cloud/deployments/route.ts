import { NextResponse } from "next/server"
import { getCloudDeployments } from "@/lib/cloud/status"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (auth.profile.role !== "admin") return NextResponse.json({ error: "Global administrator access required" }, { status: 403 })
  return NextResponse.json({ deployments: await getCloudDeployments() }, { headers: { "Cache-Control": "no-store" } })
}
