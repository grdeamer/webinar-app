import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getAppUrl, getEmailFrom, getResendClient } from "@/lib/email/resend"

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

  const { data: registrants, error: registrantsError } = await supabaseAdmin
    .from("event_registrants")
    .select("id,email,first_name,last_name")
    .eq("event_id", eventId)
    .order("email", { ascending: true })

  if (registrantsError) {
    return NextResponse.json({ error: registrantsError.message }, { status: 500 })
  }

  const registrantRows = (registrants || []) as RegistrantRow[]

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

    const assignedSessions = (sessionIdsByRegistrantId.get(sampleRegistrant.id) || [])
      .map((sessionId) => sessionsById.get(sessionId))
      .filter((session): session is SessionRow => Boolean(session))

    const resend = getResendClient()
    const from = getEmailFrom()
    const appUrl = getAppUrl().replace(/\/$/, "")
    const eventUrl = `${appUrl}/events/${event.slug}`

    await resend.emails.send({
      from,
      to: testTo,
      subject: `[TEST] Confirmation: ${event.title}`,
      html: confirmationHtml({
        eventTitle: event.title,
        eventUrl,
        registrant: {
          ...sampleRegistrant,
          email: testTo,
          first_name: sampleRegistrant.first_name || "Test",
          last_name: sampleRegistrant.last_name || "Recipient",
        },
        sessions: assignedSessions,
      }),
    })

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

  const results: Array<{ email: string; ok: boolean; error?: string }> = []

  for (const registrant of registrantRows) {
    const assignedSessions = (sessionIdsByRegistrantId.get(registrant.id) || [])
      .map((sessionId) => sessionsById.get(sessionId))
      .filter((session): session is SessionRow => Boolean(session))

    try {
      await resend.emails.send({
        from,
        to: registrant.email,
        subject: `Confirmation: ${event.title}`,
        html: confirmationHtml({
          eventTitle: event.title,
          eventUrl,
          registrant,
          sessions: assignedSessions,
        }),
      })

      results.push({ email: registrant.email, ok: true })
    } catch (error) {
      results.push({
        email: registrant.email,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      })
    }
  }

  return NextResponse.json({
    ok: true,
    sent: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  })
}