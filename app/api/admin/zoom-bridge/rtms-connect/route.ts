import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
export const runtime = "nodejs"
export async function POST(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin" || request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 })
  const clientId = process.env.ZOOM_RTMS_CLIENT_ID
  const origin = process.env.ZOOM_RTMS_APP_ORIGIN
  if (!clientId || origin !== "https://app.jupiter.events") return Response.json({ error: "Zoom app setup is pending" }, { status: 503 })
  const state = randomBytes(32).toString("hex")
  const url = new URL("https://zoom.us/oauth/authorize")
  url.searchParams.set("response_type", "code"); url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", `${origin}/api/admin/zoom-bridge/rtms-connect/callback`)
  url.searchParams.set("state", state)
  const response = NextResponse.redirect(url, 303)
  response.headers.set("Cache-Control", "no-store")
  response.cookies.set("jupiter-rtms-state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/admin/zoom-bridge/rtms-connect" })
  return response
}
