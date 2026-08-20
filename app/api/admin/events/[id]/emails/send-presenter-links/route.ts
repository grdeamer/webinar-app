import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { createEmailCampaign, completeEmailCampaign, recordEmailMessages } from "@/lib/email/campaigns"
import { getAppUrl, getEmailFrom, getResendClient, resendErrorMessage } from "@/lib/email/resend"
import { createPresenterAccessToken, type PresenterAccessSource } from "@/lib/presenterAccess"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

type PresenterRegistrant = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  tag: string | null
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

function fullName(registrant: PresenterRegistrant): string {
  return [registrant.first_name, registrant.last_name].filter(Boolean).join(" ").trim()
}

function presenterLinksHtml({
  eventTitle,
  presenter,
  sessions,
  appUrl,
  eventSlug,
  eventId,
  presenterSource = "registrant",
}: {
  eventTitle: string
  presenter: PresenterRegistrant
  sessions: SessionRow[]
  appUrl: string
  eventSlug: string
  eventId: string
  presenterSource?: PresenterAccessSource
}): string {
  const name = fullName(presenter) || "there"

  const sessionItems = sessions.length
    ? sessions
        .map((session) => {
          const accessToken = createPresenterAccessToken({
            eventId,
            sessionId: session.id,
            presenterId: presenter.id,
            source: presenterSource,
            email: presenter.email.trim().toLowerCase(),
            name: fullName(presenter) || "Presenter",
          })
          const href = `${appUrl}/presenter/${eventSlug}/sessions/${session.id}?access=${encodeURIComponent(accessToken)}`

          return `
            <div style="margin-bottom:18px;padding:14px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;">
              <div style="font-weight:600;font-size:14px;color:#0f172a;">
                ${escapeHtml(session.title)}
              </div>
              ${
                session.code
                  ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">Code: ${escapeHtml(
                      session.code
                    )}</div>`
                  : ""
              }
              <a href="${escapeHtml(
                href
              )}" style="display:inline-block;margin-top:10px;padding:8px 12px;background:#7c3aed;color:white;text-decoration:none;border-radius:6px;font-size:13px;">
                Enter Presenter Room
              </a>
            </div>
          `
        })
        .join("")
    : `<div style="color:#64748b;">No presenter sessions are assigned yet.</div>`

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
      <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">

        <div style="text-align:center;margin-bottom:26px;">
          <div style="width:54px;height:54px;margin:0 auto 14px;border-radius:999px;background:radial-gradient(circle at 30% 25%,#fde68a 0,#f59e0b 34%,#7c2d12 78%);box-shadow:0 0 34px rgba(124,58,237,0.28),0 0 28px rgba(245,158,11,0.24);"></div>
          <div style="font-size:12px;letter-spacing:0.18em;color:#64748b;text-transform:uppercase;">
            Jupiter.events
          </div>
          <h1 style="margin:8px 0 0;font-size:22px;color:#0f172a;">
            Presenter Access
          </h1>
        </div>

        <p style="font-size:14px;color:#0f172a;">
          Hi ${escapeHtml(name)},
        </p>

        <p style="font-size:14px;color:#334155;line-height:1.6;">
          You’ve been set up as a presenter for <strong>${escapeHtml(
            eventTitle
          )}</strong>.
        </p>

        <p style="font-size:14px;color:#334155;line-height:1.6;">
          Use the links below to enter your assigned presenter room(s):
        </p>

        <div style="margin:18px 0;padding:14px;border-radius:10px;background:#f5f3ff;border:1px solid #ddd6fe;color:#4c1d95;font-size:13px;line-height:1.55;">
          <strong>Production note:</strong> Please join at least 15 minutes early so the team can confirm your camera, microphone, screen share, and connection before showtime.
        </div>

        <div style="margin-top:18px;">
          ${sessionItems}
        </div>

        <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          These links are private. Please do not share them.
        </div>

      </div>
    </div>
  `
}

export async function POST(req: Request, context: RouteContext): Promise<Response> {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id: eventId } = await context.params

  const body = (await req.json().catch((): null => null)) as {
    testTo?: string
    userId?: string
    registrantId?: string
    requestKey?: string
  } | null
  const testTo = String(body?.testTo || "").trim().toLowerCase()
  const userId = String(body?.userId || "").trim()
  const registrantId = String(body?.registrantId || "").trim()
  const requestKey = String(body?.requestKey || crypto.randomUUID()).trim()

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  if (registrantId) {
    const { data: registrant, error: registrantError } = await supabaseAdmin
      .from("event_registrants")
      .select("id,email,first_name,last_name,tag")
      .eq("id", registrantId)
      .eq("event_id", eventId)
      .maybeSingle()

    if (registrantError) return NextResponse.json({ error: registrantError.message }, { status: 500 })
    if (!registrant) return NextResponse.json({ error: "Person not found" }, { status: 404 })
    if (!String(registrant.tag || "").toLowerCase().includes("presenter")) {
      return NextResponse.json({ error: "Person is not marked as a presenter" }, { status: 400 })
    }

    const { data: assignmentRows, error: assignmentError } = await supabaseAdmin
      .from("event_registrant_sessions")
      .select("session_id")
      .eq("event_id", eventId)
      .eq("registrant_id", registrantId)

    if (assignmentError) return NextResponse.json({ error: assignmentError.message }, { status: 500 })
    const assignedIds = (assignmentRows || []).map((row) => row.session_id).filter(Boolean)
    let assignedSessions: SessionRow[] = []

    if (assignedIds.length) {
      const { data: sessionRows, error: sessionError } = await supabaseAdmin
        .from("event_sessions")
        .select("id,code,title")
        .in("id", assignedIds)
      if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })
      assignedSessions = (sessionRows || []) as SessionRow[]
    }

    const presenter = registrant as PresenterRegistrant
    const resend = getResendClient()
    const response = await resend.emails.send({
      from: getEmailFrom(),
      to: testTo || presenter.email,
      subject: `${testTo ? "[TEST] " : ""}Presenter links: ${event.title}`,
      html: presenterLinksHtml({
        eventTitle: event.title,
        presenter: { ...presenter, email: testTo || presenter.email },
        sessions: assignedSessions,
        appUrl: getAppUrl().replace(/\/$/, ""),
        eventSlug: event.slug,
        eventId,
      }),
    })
    if (response.error || !response.data?.id) {
      return NextResponse.json({ error: resendErrorMessage(response.error), ok: false, sent: 0, failed: 1 }, { status: 502 })
    }

    return NextResponse.json({ ok: true, test: Boolean(testTo), sent: 1, failed: 0, presenters: 1 })
  }

  if (userId) {
    const { data: attendee, error: attendeeError } = await supabaseAdmin
      .from("event_attendees")
      .select("user_id,is_presenter,session_id,email,first_name,last_name")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle()

    if (attendeeError) {
      return NextResponse.json({ error: attendeeError.message }, { status: 500 })
    }

    if (!attendee) {
      return NextResponse.json({ error: "Attendee not found" }, { status: 404 })
    }

    if (!attendee.is_presenter) {
      return NextResponse.json(
        { error: "Registrant is not marked as a presenter." },
        { status: 400 }
      )
    }

    const email = String(attendee.email || "").trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: "Presenter email not found" }, { status: 404 })
    }

    let assignedSessions: SessionRow[] = []

    if (attendee.session_id) {
      const { data: session, error: sessionError } = await supabaseAdmin
        .from("event_sessions")
        .select("id,code,title")
        .eq("id", attendee.session_id)
        .maybeSingle()

      if (sessionError) {
        return NextResponse.json({ error: sessionError.message }, { status: 500 })
      }

      if (session) {
        assignedSessions = [session as SessionRow]
      }
    }

    const resend = getResendClient()
    const from = getEmailFrom()
    const appUrl = getAppUrl().replace(/\/$/, "")

    const presenter: PresenterRegistrant = {
      id: userId,
      email: testTo || email,
      first_name: typeof attendee.first_name === "string" ? attendee.first_name : null,
      last_name: typeof attendee.last_name === "string" ? attendee.last_name : null,
      tag: "Presenter",
    }

    try {
      const response = await resend.emails.send({
        from,
        to: presenter.email,
        subject: `${testTo ? "[TEST] " : ""}Presenter links: ${event.title}`,
        html: presenterLinksHtml({
          eventTitle: event.title,
          presenter,
          sessions: assignedSessions,
          appUrl,
          eventSlug: event.slug,
          eventId,
          presenterSource: "attendee",
        }),
      })
      if (response.error || !response.data?.id) {
        return NextResponse.json({ error: resendErrorMessage(response.error), ok: false, sent: 0, failed: 1 }, { status: 502 })
      }

      return NextResponse.json({
        ok: true,
        test: Boolean(testTo),
        sent: 1,
        failed: 0,
        presenters: 1,
        results: [{ email: presenter.email, ok: true }],
      })
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Unknown email error",
          ok: false,
          sent: 0,
          failed: 1,
          presenters: 1,
          results: [
            {
              email: presenter.email,
              ok: false,
              error: error instanceof Error ? error.message : "Unknown email error",
            },
          ],
        },
        { status: 500 }
      )
    }
  }

  const { data: presenters, error: presentersError } = await supabaseAdmin
    .from("event_registrants")
    .select("id,email,first_name,last_name,tag")
    .eq("event_id", eventId)
    .ilike("tag", "%presenter%")
    .order("email", { ascending: true })

  if (presentersError) {
    return NextResponse.json({ error: presentersError.message }, { status: 500 })
  }

  const presenterRows = (presenters || []) as PresenterRegistrant[]

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

  const resend = getResendClient()
  const from = getEmailFrom()
  const appUrl = getAppUrl().replace(/\/$/, "")

  const targets = testTo
    ? presenterRows.slice(0, 1).map((presenter) => ({
        ...presenter,
        email: testTo,
        first_name: "Test",
        last_name: "Presenter",
      }))
    : presenterRows

  if (!targets.length) {
    return NextResponse.json(
      { error: "No presenters found. Mark presenter rows with tag = Presenter." },
      { status: 400 }
    )
  }

  const campaignId = await createEmailCampaign({
    eventId,
    campaignType: "presenter_access",
    mode: testTo ? "test" : "production",
    requestedBy: authResult.user.id,
    idempotencyKey: `presenter:${testTo ? "test" : "production"}:${eventId}:${requestKey}`,
    recipientCount: targets.length,
  })
  const results: Array<{ email: string; ok: boolean; error?: string; resendEmailId?: string }> = []

  for (const presenter of targets) {
    const assignedSessions = (sessionIdsByRegistrantId.get(presenter.id) || [])
      .map((sessionId) => sessionsById.get(sessionId))
      .filter((session): session is SessionRow => Boolean(session))

    try {
      const response = await resend.emails.send({
        from,
        to: presenter.email,
        subject: `${testTo ? "[TEST] " : ""}Presenter links: ${event.title}`,
        html: presenterLinksHtml({
          eventTitle: event.title,
          presenter,
          sessions: assignedSessions,
          appUrl,
          eventSlug: event.slug,
          eventId,
        }),
      }, { idempotencyKey: `presenter-${eventId}-${requestKey}-${presenter.id}` })

      if (response.error || !response.data?.id) {
        results.push({ email: presenter.email, ok: false, error: resendErrorMessage(response.error) })
      } else {
        results.push({ email: presenter.email, ok: true, resendEmailId: response.data.id })
      }
    } catch (error) {
      results.push({
        email: presenter.email,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      })
    }
  }

  await recordEmailMessages({
    campaignId,
    eventId,
    messages: results.map((result) => ({
      recipientEmail: result.email,
      resendEmailId: result.resendEmailId,
      status: result.ok ? "accepted" : "failed",
      errorMessage: result.error,
    })),
  })
  const accepted = results.filter((result) => result.ok).length
  const failed = results.length - accepted
  await completeEmailCampaign({
    campaignId,
    accepted,
    failed,
    errorSummary: failed ? `${failed} message${failed === 1 ? "" : "s"} rejected by Resend` : undefined,
  })

  return NextResponse.json({
    ok: failed === 0,
    test: Boolean(testTo),
    sent: accepted,
    failed,
    presenters: presenterRows.length,
    results: results.map((result) => ({
      email: result.email,
      ok: result.ok,
      error: result.error,
    })),
  })
}
