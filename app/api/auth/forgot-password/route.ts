import { createHmac } from "node:crypto"
import { NextResponse } from "next/server"
import { requestIp } from "@/lib/districtAccess"
import { sendJupiterPasswordReset } from "@/lib/email/passwordResetDelivery"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const genericMessage = "If an account exists for that email, a secure reset link is on its way."

function digest(kind: "email" | "ip", value: string) {
  const secret = String(process.env.JWT_SECRET || "").trim()
  if (!secret) throw new Error("JWT_SECRET is not configured")
  return createHmac("sha256", secret).update(`password-reset:${kind}:${value}`).digest("hex")
}

async function finish(startedAt: number, response: Response) {
  const delay = 700 - (Date.now() - startedAt)
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
  return response
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const body = await request.json().catch((): null => null)
  const email = String(body?.email || "").trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  try {
    const emailHash = digest("email", email)
    const ipHash = digest("ip", requestIp(request))
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const [emailRate, ipRate] = await Promise.all([
      supabaseAdmin.from("password_reset_requests").select("id", { count: "exact", head: true }).eq("email_hash", emailHash).gte("created_at", oneHourAgo),
      supabaseAdmin.from("password_reset_requests").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", oneHourAgo),
    ])
    if (emailRate.error) throw new Error(emailRate.error.message)
    if (ipRate.error) throw new Error(ipRate.error.message)
    if ((emailRate.count || 0) >= 3 || (ipRate.count || 0) >= 10) {
      return finish(startedAt, NextResponse.json({ error: "Too many reset requests. Please wait before trying again." }, { status: 429 }))
    }

    const { data: profile } = await supabaseAdmin.from("profiles").select("email,full_name,is_active").eq("email", email).maybeSingle()
    const requestRecord = { email_hash: emailHash, ip_hash: ipHash, delivery_status: profile?.email && profile.is_active !== false ? "pending" : "suppressed" }
    const { data: resetRequest, error: insertError } = await supabaseAdmin.from("password_reset_requests").insert(requestRecord).select("id").single()
    if (insertError) throw new Error(insertError.message)

    if (profile?.email && profile.is_active !== false) {
      try {
        const resendId = await sendJupiterPasswordReset({ email: profile.email, name: profile.full_name })
        await supabaseAdmin.from("password_reset_requests").update({ delivery_status: "sent", resend_email_id: resendId }).eq("id", resetRequest.id)
      } catch (deliveryError) {
        console.error("Jupiter password reset delivery failed", deliveryError)
        await supabaseAdmin.from("password_reset_requests").update({ delivery_status: "failed" }).eq("id", resetRequest.id)
      }
    }

    return finish(startedAt, NextResponse.json({ ok: true, message: genericMessage }))
  } catch (error) {
    console.error("Password reset request failed", error)
    return finish(startedAt, NextResponse.json({ error: "Jupiter could not process that request. Please try again." }, { status: 500 }))
  }
}
