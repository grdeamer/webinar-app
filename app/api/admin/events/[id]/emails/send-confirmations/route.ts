import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createEmailCampaign, completeEmailCampaign, recordEmailMessages } from "@/lib/email/campaigns"
import { getAppUrl, getEmailFrom, getResendClient, resendErrorMessage } from "@/lib/email/resend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

type RegistrantRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}

type SessionRow = {
  id: string
  code: string | null
  title: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function fullName(registrant: RegistrantRow): string {
  return [registrant.first_name, registrant.last_name].filter(Boolean).join(" ").trim()
}

function confirmationHtml({
  eventTitle,
  eventUrl,
  registrant,
  sessions,
}: {
  eventTitle: string
  eventUrl: string
  registrant: RegistrantRow
  sessions: SessionRow[]
}): string {
  const name = fullName(registrant) || "there"

  const sessionItems = sessions.length
    ? sessions
        .map(
          (session) =>
            `<li><strong>${escapeHtml(session.title)}</strong>${
              session.code ? ` <span style="color:#64748b;">(${escapeHtml(session.code)})</span>` : ""
            }</li>`
        )
        .join("")
    : `<li>Your event access is confirmed.</li>`

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h1 style="margin:0 0 16px;">You're confirmed for ${escapeHtml(eventTitle)}</h1>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your registration has been confirmed.</p>
      <p><strong>Your sessions:</strong></p>
      <ul>${sessionItems}</ul>
      <p>
        <a href="${escapeHtml(eventUrl)}" style="display:inline-block;background:#0f172a;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;">
          Open Event
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;">Use this same email address when accessing the event.</p>
    </div>
  `
}

export async function POST(req: Request, context: RouteContext): Promise<Response> {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id: eventId } = await context.params
  const url = new URL(req.url)
  const dryRun = url.searchParams.get("dryRun") === "1"
  const body = (await req.json().catch((): null => null)) as {
    testTo?: string
    requestKey?: string
  } | null
  const testTo = String(body?.testTo || "").trim().toLowerCase()
  const requestKey = String(body?.requestKey || crypto.randomUUID()).trim()

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  const { data: registrants, error: registrantsError } = await supabaseAdmin
    .from("event_registrants")
    .select("id,email,first_name,last_name")
    .eq("event_id", eventId)
    .order("email", { ascending: true })

  if (registrantsError) {
    return NextResponse.json({ error: registrantsError.message }, { status: 500 })
  }

  const registrantRows = Array.from(
    new Map(
      ((registrants || []) as RegistrantRow[])
        .filter((registrant) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(registrant.email || "").trim()))
        .map((registrant) => [registrant.email.trim().toLowerCase(), { ...registrant, email: registrant.email.trim().toLowerCase() }])
    ).values()
  )

  const { data: assignments, error: assignmentsError } = await supabaseAdmin
    .from("event_registrant_sessions")
    .select("registrant_id,session_id")
    .eq("event_id", eventId)

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
  }

  const sessionIds = Array.from(
    new Set((assignments || []).map((assignment) => assignment.session_id).filter(Boolean))
  )

  let sessions: SessionRow[] = []

  if (sessionIds.length) {
    const { data: sessionRows, error: sessionsError } = await supabaseAdmin
      .from("event_sessions")
      .select("id,code,title")
      .in("id", sessionIds)

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    sessions = (sessionRows || []) as SessionRow[]
  }

  const sessionsById = new Map(sessions.map((session) => [session.id, session]))
  const sessionIdsByRegistrantId = new Map<string, string[]>()

  for (const assignment of assignments || []) {
    const registrantId = String(assignment.registrant_id || "")
    const sessionId = String(assignment.session_id || "")
    if (!registrantId || !sessionId) continue

    const existing = sessionIdsByRegistrantId.get(registrantId) || []
    existing.push(sessionId)
    sessionIdsByRegistrantId.set(registrantId, existing)
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
      },
      registrants: registrantRows.length,
      assignments: assignments?.length || 0,
    })
  }

  if (testTo) {
    const sampleRegistrant = registrantRows[0]

    if (!sampleRegistrant) {
      return NextResponse.json(
        { error: "No registrants found for this event" },
        { status: 400 }
      )
    }

    const resend = getResendClient()
    const from = getEmailFrom()
    const appUrl = getAppUrl().replace(/\/$/, "")
    const eventUrl = `${appUrl}/events/${event.slug}`

    const campaignId = await createEmailCampaign({
      eventId,
      campaignType: "confirmation",
      mode: "test",
      requestedBy: authResult.user.id,
      idempotencyKey: `confirmation:test:${eventId}:${requestKey}`,
      recipientCount: 1,
    })
    const response = await resend.emails.send({
      from,
      to: testTo,
      subject: `[TEST] Confirmation: ${event.title}`,
      html: confirmationHtml({
        eventTitle: event.title,
        eventUrl,
        registrant: {
          id: sampleRegistrant.id,
          email: testTo,
          first_name: "Test",
          last_name: "Recipient",
        },
        sessions: [],
      }),
    }, { idempotencyKey: `confirmation-test-${eventId}-${requestKey}` })

    if (response.error || !response.data?.id) {
      const message = resendErrorMessage(response.error)
      await recordEmailMessages({ campaignId, eventId, messages: [{ recipientEmail: testTo, status: "failed", errorMessage: message }] })
      await completeEmailCampaign({ campaignId, accepted: 0, failed: 1, errorSummary: message })
      return NextResponse.json({ error: message, ok: false, sent: 0, failed: 1 }, { status: 502 })
    }

    await recordEmailMessages({ campaignId, eventId, messages: [{ recipientEmail: testTo, resendEmailId: response.data.id, status: "accepted" }] })
    await completeEmailCampaign({ campaignId, accepted: 1, failed: 0 })

    return NextResponse.json({
      ok: true,
      test: true,
      sent: 1,
      failed: 0,
      results: [{ email: testTo, ok: true }],
    })
  }

  const resend = getResendClient()
  const from = getEmailFrom()
  const appUrl = getAppUrl().replace(/\/$/, "")
  const eventUrl = `${appUrl}/events/${event.slug}`

  if (!registrantRows.length) {
    return NextResponse.json({ error: "No valid, unique recipient email addresses found" }, { status: 400 })
  }

  const campaignId = await createEmailCampaign({
    eventId,
    campaignType: "confirmation",
    mode: "production",
    requestedBy: authResult.user.id,
    idempotencyKey: `confirmation:production:${eventId}:${requestKey}`,
    recipientCount: registrantRows.length,
  })
  const results: Array<{ email: string; ok: boolean; error?: string }> = []

  for (let offset = 0; offset < registrantRows.length; offset += 100) {
    const chunk = registrantRows.slice(offset, offset + 100)
    const messages = chunk.map((registrant) => {
      const assignedSessions = (sessionIdsByRegistrantId.get(registrant.id) || [])
        .map((sessionId) => sessionsById.get(sessionId))
        .filter((session): session is SessionRow => Boolean(session))
      return {
        from,
        to: registrant.email,
        subject: `Confirmation: ${event.title}`,
        html: confirmationHtml({
          eventTitle: event.title,
          eventUrl,
          registrant,
          sessions: assignedSessions,
        }),
      }
    })
    const response = await resend.batch.send(messages, {
      idempotencyKey: `confirmation-${eventId}-${requestKey}-${offset / 100}`,
      batchValidation: "permissive",
    })
    if (response.error || !response.data) {
      const message = resendErrorMessage(response.error)
      chunk.forEach((registrant) => results.push({ email: registrant.email, ok: false, error: message }))
      continue
    }
    const failures = new Map(response.data.errors.map((failure) => [failure.index, failure.message]))
    chunk.forEach((registrant, index) => {
      const failure = failures.get(index)
      results.push(failure ? { email: registrant.email, ok: false, error: failure } : { email: registrant.email, ok: true })
    })
  }

  await recordEmailMessages({
    campaignId,
    eventId,
    messages: results.map((result) => ({ recipientEmail: result.email, status: result.ok ? "accepted" : "failed", errorMessage: result.error })),
  })
  const sent = results.filter((result) => result.ok).length
  const failed = results.length - sent
  await completeEmailCampaign({ campaignId, accepted: sent, failed, errorSummary: results.find((result) => !result.ok)?.error })

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    results,
  })
}
