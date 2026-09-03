import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import {
  districtDigest,
  getAssignedDistrictSessions,
  isDistrictEmail,
  isDistrictLookupWindowOpen,
  normalizeDistrictEmail,
  requestIp,
} from "@/lib/districtAccess"
import { getEventBySlug } from "@/lib/events"
import { publicEventHeaders } from "@/lib/publicEventCors"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(request: Request, data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: publicEventHeaders(request),
  })
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicEventHeaders(request) })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const startedAt = Date.now()
  try {
    const { slug } = await context.params
    const body = await request.json().catch(() => ({}))
    const email = normalizeDistrictEmail(body?.email)

    if (!isDistrictEmail(email)) {
      return json(request, { error: "Enter a valid email address." }, 400)
    }

    const event = await getEventBySlug(slug)
    if (!(await isDistrictLookupWindowOpen(event.id))) {
      return json(
        request,
        { error: "District room lookup is not open right now." },
        409
      )
    }

    const emailHash = districtDigest("email", email)
    const ipHash = districtDigest("ip", requestIp(request))
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const [emailRate, ipRate] = await Promise.all([
      supabaseAdmin
        .from("event_district_access_challenges")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("email_hash", emailHash)
        .gte("created_at", oneHourAgo),
      supabaseAdmin
        .from("event_district_access_challenges")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("ip_hash", ipHash)
        .gte("created_at", oneHourAgo),
    ])

    if (emailRate.error) throw new Error(emailRate.error.message)
    if (ipRate.error) throw new Error(ipRate.error.message)
    if ((emailRate.count || 0) >= 5 || (ipRate.count || 0) >= 20) {
      return json(
        request,
        { error: "Too many lookup attempts. Please wait before trying again." },
        429
      )
    }

    const assignment = await getAssignedDistrictSessions(event.id, email)
    const requestId = randomUUID()
    const auditToken = randomUUID()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insertError } = await supabaseAdmin
      .from("event_district_access_challenges")
      .insert({
        id: requestId,
        event_id: event.id,
        registrant_id: assignment?.registrantId || null,
        session_id: assignment?.sessions[0]?.id || null,
        email_hash: emailHash,
        ip_hash: ipHash,
        code_digest: districtDigest("code", `${requestId}:${auditToken}`),
        delivery_status: assignment ? "sent" : "suppressed",
        expires_at: expiresAt,
      })

    if (insertError) throw new Error(insertError.message)

    const remainingDelay = 850 - (Date.now() - startedAt)
    if (remainingDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingDelay))
    }

    if (!assignment) {
      return json(request, { error: "We could not find a district room for that email." }, 404)
    }

    return json(request, {
      ok: true,
      district: {
        code: assignment.sessions[0].code,
        name: assignment.sessions[0].title,
        manager: assignment.sessions[0].presenter,
        meeting_link: assignment.sessions[0].external_join_url,
      },
      districts: assignment.sessions.map((session) => ({
        code: session.code,
        name: session.title,
        manager: session.presenter,
        meeting_link: session.external_join_url,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to find a district room"
    const status = message.startsWith("Event not found") ? 404 : 500
    console.error("district access request error", error)
    return json(request, { error: status === 404 ? message : "Unable to find a district room." }, status)
  }
}
