import { NextResponse } from "next/server"
import {
  districtDigest,
  districtDigestMatches,
  getAssignedDistrictSessions,
  isDistrictEmail,
  isDistrictLookupWindowOpen,
  normalizeDistrictEmail,
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

function denied(request: Request, status = 400) {
  return json(
    request,
    { error: "The code is invalid or expired. Request a new code and try again." },
    status
  )
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: publicEventHeaders(request) })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const body = await request.json().catch(() => ({}))
    const email = normalizeDistrictEmail(body?.email)
    const requestId = String(body?.request_id || "").trim()
    const code = String(body?.code || "").replace(/\D/g, "")

    if (!isDistrictEmail(email) || !requestId || !/^\d{6}$/.test(code)) {
      return denied(request)
    }

    const event = await getEventBySlug(slug)
    if (!(await isDistrictLookupWindowOpen(event.id))) {
      return json(
        request,
        { error: "District room lookup is not open right now." },
        409
      )
    }

    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from("event_district_access_challenges")
      .select(
        "id,registrant_id,session_id,email_hash,code_digest,attempts,max_attempts,expires_at,consumed_at,delivery_status"
      )
      .eq("id", requestId)
      .eq("event_id", event.id)
      .maybeSingle()

    if (challengeError) throw new Error(challengeError.message)
    if (
      !challenge ||
      challenge.consumed_at ||
      challenge.delivery_status !== "sent" ||
      challenge.attempts >= challenge.max_attempts ||
      new Date(challenge.expires_at).getTime() <= Date.now()
    ) {
      return denied(request)
    }

    const nextAttempts = challenge.attempts + 1
    const { data: reservedAttempt, error: attemptError } = await supabaseAdmin
      .from("event_district_access_challenges")
      .update({ attempts: nextAttempts })
      .eq("id", challenge.id)
      .eq("attempts", challenge.attempts)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle()

    if (attemptError) throw new Error(attemptError.message)
    if (!reservedAttempt) return denied(request)

    const emailMatches = districtDigestMatches(
      challenge.email_hash,
      districtDigest("email", email)
    )
    const codeMatches = districtDigestMatches(
      challenge.code_digest,
      districtDigest("code", `${requestId}:${code}`)
    )

    if (!emailMatches || !codeMatches) return denied(request)

    const assignment = await getAssignedDistrictSessions(event.id, email)
    if (
      !assignment ||
      assignment.registrantId !== challenge.registrant_id ||
      !assignment.sessions.some((session) => session.id === challenge.session_id)
    ) {
      return denied(request)
    }

    const consumedAt = new Date().toISOString()
    const { data: consumed, error: consumeError } = await supabaseAdmin
      .from("event_district_access_challenges")
      .update({ consumed_at: consumedAt })
      .eq("id", challenge.id)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle()

    if (consumeError) throw new Error(consumeError.message)
    if (!consumed) return denied(request)

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
    const message = error instanceof Error ? error.message : "Unable to verify code"
    const status = message.startsWith("Event not found") ? 404 : 500
    console.error("district access verify error", error)
    return json(request, { error: status === 404 ? message : "Unable to verify the code." }, status)
  }
}
