import { NextResponse } from "next/server"
import { requireEventOperatorAccess } from "@/lib/eventTeamAccess"
import { getAppUrl } from "@/lib/email/resend"
import {
  createPresenterAccessUrl,
  PRESENTER_LINK_TTL_DAYS,
} from "@/lib/presenterAccess"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

function presenterName(
  person: { first_name?: string | null; last_name?: string | null },
  email: string
): string {
  return [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || email
}

export async function POST(req: Request, context: RouteContext): Promise<Response> {
  const { id: eventId } = await context.params
  const access = await requireEventOperatorAccess(eventId, ["event_admin", "producer"], "people")
  if (access instanceof Response) return access

  const body = (await req.json().catch((): null => null)) as {
    registrantId?: string
    userId?: string
    sessionId?: string
  } | null
  const registrantId = String(body?.registrantId || "").trim()
  const userId = String(body?.userId || "").trim()
  const sessionId = String(body?.sessionId || "").trim()

  if (!sessionId || (!registrantId && !userId)) {
    return NextResponse.json(
      { error: "A presenter and assigned session are required." },
      { status: 400 }
    )
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("event_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 })
  }

  let presenterId = ""
  let source: "registrant" | "attendee" = "registrant"
  let email = ""
  let name = "Presenter"

  if (registrantId) {
    const [{ data: presenter, error: presenterError }, { data: assignment, error: assignmentError }] =
      await Promise.all([
        supabaseAdmin
          .from("event_registrants")
          .select("id,email,first_name,last_name,tag")
          .eq("id", registrantId)
          .eq("event_id", eventId)
          .maybeSingle(),
        supabaseAdmin
          .from("event_registrant_sessions")
          .select("session_id")
          .eq("event_id", eventId)
          .eq("registrant_id", registrantId)
          .eq("session_id", sessionId)
          .maybeSingle(),
      ])

    if (presenterError || assignmentError) {
      return NextResponse.json(
        { error: presenterError?.message || assignmentError?.message },
        { status: 500 }
      )
    }
    if (
      !presenter ||
      !assignment ||
      !String(presenter.tag || "").toLowerCase().includes("presenter")
    ) {
      return NextResponse.json(
        { error: "This presenter is not assigned to that session." },
        { status: 403 }
      )
    }

    presenterId = presenter.id
    email = String(presenter.email || "").trim().toLowerCase()
    name = presenterName(presenter, email)
  } else {
    const { data: presenter, error: presenterError } = await supabaseAdmin
      .from("event_attendees")
      .select("user_id,email,first_name,last_name,is_presenter,session_id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .eq("is_presenter", true)
      .maybeSingle()

    if (presenterError) {
      return NextResponse.json({ error: presenterError.message }, { status: 500 })
    }
    if (!presenter) {
      return NextResponse.json(
        { error: "This presenter is not assigned to that session." },
        { status: 403 }
      )
    }

    presenterId = String(presenter.user_id)
    source = "attendee"
    email = String(presenter.email || access.user.email || "").trim().toLowerCase()
    name = presenterName(presenter, email)
  }

  if (!email) {
    return NextResponse.json({ error: "Presenter email not found." }, { status: 400 })
  }

  return NextResponse.json({
    url: createPresenterAccessUrl({
      appUrl: getAppUrl(),
      eventSlug: access.eventSlug,
      eventId,
      sessionId,
      presenterId,
      source,
      email,
      name,
    }),
    expiresInDays: PRESENTER_LINK_TTL_DAYS,
  })
}
