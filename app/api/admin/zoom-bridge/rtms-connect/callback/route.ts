import { timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
export const runtime = "nodejs"
export const maxDuration = 20
export async function GET(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin") return new Response(null, { status: 403 })
  const url = new URL(request.url), code = url.searchParams.get("code"), supplied = url.searchParams.get("state") ?? ""
  const saved = (await cookies()).get("jupiter-rtms-state")?.value ?? ""
  const origin = process.env.ZOOM_RTMS_APP_ORIGIN
  if (origin !== "https://app.jupiter.events") return new Response(null, { status: 503 })
  const response = NextResponse.redirect(`${origin}/admin/jupiter-io/returns?rtms=authorization-failed`, 303)
  response.headers.set("Cache-Control", "no-store")
  response.cookies.set("jupiter-rtms-state", "", { maxAge: 0, path: "/api/admin/zoom-bridge/rtms-connect", httpOnly: true, secure: true, sameSite: "lax" })
  if (!code || code.length > 2048 || !/^[a-f0-9]{64}$/.test(saved) || !/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(saved), Buffer.from(supplied))) return response
  const clientId = process.env.ZOOM_RTMS_CLIENT_ID, secret = process.env.ZOOM_RTMS_CLIENT_SECRET
  if (!clientId || !secret) return response
  try {
    const tokenResponse = await fetch("https://zoom.us/oauth/token", {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: `${origin}/api/admin/zoom-bridge/rtms-connect/callback` }),
    })
    if (!tokenResponse.ok) return response
    // Qualification uses host-approved auto-start and app-signed RTMS connections.
    // No REST control is requested; OAuth access/refresh tokens are not stored.
    await tokenResponse.body?.cancel()
    response.headers.set("Location", `${origin}/admin/jupiter-io/returns?rtms=authorized`)
  } catch { /* Never log authorization codes, tokens, or provider response bodies. */ }
  return response
}
