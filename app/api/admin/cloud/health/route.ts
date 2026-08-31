import { NextResponse } from "next/server"
import { getPlatformCloudSnapshot } from "@/lib/cloud/status"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (auth.profile.role !== "admin") return NextResponse.json({ error: "Global administrator access required" }, { status: 403 })

  try {
    return NextResponse.json(await getPlatformCloudSnapshot(), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cloud health unavailable" }, { status: 500 })
  }
}
