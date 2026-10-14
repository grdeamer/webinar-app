import { NextResponse } from "next/server"
import { verifyVerificationLink } from "@/lib/registration/tokens"
import { POST as register } from "@/app/api/events/[slug]/registration/route"
import { POST as login } from "@/app/api/events/login/route"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const link = verifyVerificationLink(String(body.token ?? ""))
    if (!link) return NextResponse.json({ error: "This verification link is invalid or expired. Return to Jupiter and request another email." }, { status: 400 })
    const forwarded = new Request(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: link.challengeId, code: link.code, email: link.email, slug: link.slug }) })
    return link.action === "register" ? register(forwarded, { params: Promise.resolve({ slug: link.slug! }) }) : login(forwarded)
  } catch { return NextResponse.json({ error: "Unable to verify this link. Return to Jupiter and request another email." }, { status: 400 }) }
}
