import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getAppUrl, getEmailFrom, getResendClient } from "@/lib/email/resend"

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
}: {
  eventTitle: string
  presenter: PresenterRegistrant
  sessions: SessionRow[]
  appUrl: string
  eventSlug: string
}): string {
  const name = fullName(presenter) || "there"

  const sessionItems = sessions.length
    ? sessions
        .map((session) => {
          const href = `${appUrl}/presenter/${eventSlug}/sessions/${session.id}`

          return `
            <li style="margin-bottom:14px;">
              <strong>${escapeHtml(session.title)}</strong>${
                session.code ? ` <span style="color:#64748b;">(${escapeHtml(session.code)})</span>` : ""
              }<br />
              <a href="${escapeHtml(href)}">${escapeHtml(href)}</a>
            </li>
          `
        })
        .join("")
    : `<li>No presenter sessions are assigned yet.</li>`

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h1 style="margin:0 0 16px;">Presenter links for ${escapeHtml(eventTitle)}</h1>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Here are your presenter links for the event.</p>
      <ul>${sessionItems}</ul>
      <p style="color:#64748b;font-size:13px;">
        Please keep these links private. Use them to enter your assigned presenter room(s).
      </p>
    </div>
  `
}

export async function POST(req: Request, context: RouteContext): Promise<Response> {
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const { id: eventId } = await context.params

  const body = (await req.json().catch((): null => null)) as {
    testTo?: string
  } | null
  const testTo = String(body?.testTo || "").trim().toLowerCase()

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
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
        first_name: presenter.first_name || "Test",
        last_name: presenter.last_name || "Presenter",
      }))
    : presenterRows

  if (!targets.length) {
    return NextResponse.json(
      { error: "No presenters found. Mark presenter rows with tag = Presenter." },
      { status: 400 }
    )
  }

  const results: Array<{ email: string; ok: boolean; error?: string }> = []

  for (const presenter of targets) {
    const assignedSessions = (sessionIdsByRegistrantId.get(presenter.id) || [])
      .map((sessionId) => sessionsById.get(sessionId))
      .filter((session): session is SessionRow => Boolean(session))

    try {
      await resend.emails.send({
        from,
        to: presenter.email,
        subject: `${testTo ? "[TEST] " : ""}Presenter links: ${event.title}`,
        html: presenterLinksHtml({
          eventTitle: event.title,
          presenter,
          sessions: assignedSessions,
          appUrl,
          eventSlug: event.slug,
        }),
      })

      results.push({ email: presenter.email, ok: true })
    } catch (error) {
      results.push({
        email: presenter.email,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      })
    }
  }

  return NextResponse.json({
    ok: true,
    test: Boolean(testTo),
    sent: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    presenters: presenterRows.length,
    results,
  })
}