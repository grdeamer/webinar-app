import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { allowEncoder, encoderAddresses, firewallConfigured } from "@/lib/zoom-bridge/encoder-firewall"
import { publicIpv4 } from "@/lib/zoom-bridge/public-ip"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "no-store", Pragma: "no-cache" }
export async function GET(request: Request) {
  if ((await requireAdmin()).profile.role !== "admin") return NextResponse.json({ error: "Administrator access required" }, { status: 403, headers })
  if (new URL(request.url).searchParams.get("detect") === "1") {
    try {
      if (process.env.VERCEL !== "1") throw new Error("Detection is available on the hosted Jupiter site.")
      const ip = publicIpv4(request.headers.get("x-forwarded-for")?.split(",")[0])
      return NextResponse.json({ ip }, { headers })
    } catch { return NextResponse.json({ error: "Could not detect a public IPv4 address. Use the Mac or Windows instructions below." }, { status: 422, headers }) }
  }
  if (!firewallConfigured()) return NextResponse.json({ configured: false, addresses: [] }, { headers })
  try { return NextResponse.json({ configured: true, addresses: await encoderAddresses() }, { headers }) }
  catch { return NextResponse.json({ error: "Could not read the AWS firewall. No rules were changed." }, { status: 503, headers }) }
}
export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (admin.profile.role !== "admin") return NextResponse.json({ error: "Administrator access required" }, { status: 403, headers })
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403, headers })
  let ip: string
  try { const body = await request.json(); ip = publicIpv4(body.ip); if (body.confirm !== true) throw new Error("Confirm the encoder IP before allowing access.") }
  catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "Invalid IP address" }, { status: 400, headers }) }
  if (!firewallConfigured()) return NextResponse.json({ error: "AWS firewall integration is not configured. No rule was changed." }, { status: 503, headers })
  try {
    await allowEncoder(ip)
    console.info("io_encoder_ip_allowed", { actor: admin.user.id, ip, port: 9000 })
    const addresses = await encoderAddresses()
    return NextResponse.json({ configured: true, addresses, applied: addresses.includes(`${ip}/32`), ip }, { headers })
  } catch { return NextResponse.json({ error: "AWS did not confirm the update. Refresh firewall status before retrying." }, { status: 503, headers }) }
}
