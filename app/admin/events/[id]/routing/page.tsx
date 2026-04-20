import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventRoutingState, upsertEventRoutingState } from "@/lib/app/liveState"
import MissionControlClient from "../MissionControlClient"
import EventAdminNav from "@/components/admin/EventAdminNav"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SessionOption = {
  id: string
  title: string
  kind: "general" | "session"
}

type BreakoutOption = {
  id: string
  title: string
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function clampDuration(value: FormDataEntryValue | null, fallback = 3000) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(800, Math.min(6000, Math.round(n)))
}

function readString(value: FormDataEntryValue | null, fallback = "") {
  const text = String(value ?? "").trim()
  return text || fallback
}

function readTransitionType(value: FormDataEntryValue | null) {
  const raw = String(value ?? "fade").trim()

  if (
    raw === "wipe" ||
    raw === "wipe_left" ||
    raw === "wipe_right" ||
    raw === "zoom" ||
    raw === "zoom_in" ||
    raw === "zoom_out" ||
    raw === "dip_to_black" ||
    raw === "main_stage_arrival"
  ) {
    return raw
  }

  return "fade"
}

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let eventId = id
  let eventSlug = id

  if (!isUuid(id)) {
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select("id,slug")
      .eq("slug", id)
      .maybeSingle()

    if (error || !event?.id) {
      throw new Error("Event not found")
    }

    eventId = event.id
    eventSlug = event.slug
  } else {
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("id,slug")
      .eq("id", id)
      .maybeSingle()

    if (event?.slug) {
      eventSlug = event.slug
    }
  }

  async function goGeneralSession(formData: FormData) {
    "use server"

    const requestedSessionId = String(formData.get("sessionId") || "").trim()
    const rawTransition = formData.get("transitionType")
    let transitionType = readTransitionType(rawTransition)

    if (!rawTransition || rawTransition === "auto") {
      transitionType = "main_stage_arrival"
    }

    const transitionDurationMs = clampDuration(formData.get("transitionDuration"), 3000)
    const customHeadline = readString(formData.get("headline"))
    const customMessage = readString(formData.get("message"))

    let generalSessionId = requestedSessionId
    let generalSessionTitle = "Now Entering Main Stage"

    if (generalSessionId) {
      const { data: selectedSession, error: selectedSessionError } = await supabaseAdmin
        .from("event_sessions")
        .select("id,title")
        .eq("event_id", eventId)
        .eq("id", generalSessionId)
        .maybeSingle()

      if (selectedSessionError) {
        throw new Error(selectedSessionError.message)
      }

      if (!selectedSession?.id) {
        throw new Error("Selected main stage session not found")
      }

      generalSessionId = selectedSession.id
      generalSessionTitle = selectedSession.title || generalSessionTitle
    } else {
      const { data: generalSession, error } = await supabaseAdmin
        .from("event_sessions")
        .select("id,title")
        .eq("event_id", eventId)
        .or("is_general_session.eq.true,session_kind.eq.general")
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      if (!generalSession?.id) {
        throw new Error(
          "No Main Stage session row found. Add a session in event_sessions marked is_general_session=true or session_kind=general."
        )
      }

      generalSessionId = generalSession.id
      generalSessionTitle = generalSession.title || generalSessionTitle
    }

    await upsertEventRoutingState({
      eventId,
      mode: "session_redirect",
      destinationType: "general_session",
      destinationSessionId: generalSessionId,
      headline: customHeadline || generalSessionTitle,
      message: customMessage || "The keynote is beginning now.",
      forceRedirect: true,
      transitionType,
      transitionDurationMs,
    })

    revalidatePath(`/admin/events/${eventSlug}`)
    revalidatePath(`/admin/events/${eventSlug}/routing`)
    revalidatePath(`/events/${eventSlug}`)
    revalidatePath(`/events/${eventSlug}/sessions`)
    revalidatePath(`/events/${eventSlug}/sessions/${generalSessionId}`)
  }

  async function goToSession(formData: FormData) {
    "use server"

    const sessionId = String(formData.get("sessionId") || "").trim()
    if (!sessionId) {
      throw new Error("Missing sessionId")
    }

    const rawTransition = formData.get("transitionType")
    let transitionType = readTransitionType(rawTransition)

    if (!rawTransition || rawTransition === "auto") {
      transitionType = "wipe_left"
    }

    const transitionDurationMs = clampDuration(formData.get("transitionDuration"), 2200)

    await upsertEventRoutingState({
      eventId,
      mode: "session_redirect",
      destinationType: "session",
      destinationSessionId: sessionId,
      headline: readString(formData.get("headline"), "Entering Session"),
      message: readString(formData.get("message"), "Your next session is opening."),
      forceRedirect: true,
      transitionType,
      transitionDurationMs,
    })

    revalidatePath(`/admin/events/${eventSlug}`)
    revalidatePath(`/admin/events/${eventSlug}/routing`)
    revalidatePath(`/events/${eventSlug}`)
    revalidatePath(`/events/${eventSlug}/sessions`)
    revalidatePath(`/events/${eventSlug}/sessions/${sessionId}`)
  }

  async function goToBreakout(formData: FormData) {
    "use server"

    const breakoutId = String(formData.get("breakoutId") || "").trim()
    if (!breakoutId) {
      throw new Error("Missing breakoutId")
    }

    const rawTransition = formData.get("transitionType")
    let transitionType = readTransitionType(rawTransition)

    if (!rawTransition || rawTransition === "auto") {
      transitionType = "wipe_right"
    }

    const transitionDurationMs = clampDuration(formData.get("transitionDuration"), 2200)

    await upsertEventRoutingState({
      eventId,
      mode: "session_redirect",
      destinationType: "session",
      destinationSessionId: breakoutId,
      headline: readString(formData.get("headline"), "Entering Breakout"),
      message: readString(
        formData.get("message"),
        "We’re moving you into a breakout room."
      ),
      forceRedirect: true,
      transitionType,
      transitionDurationMs,
    })

    revalidatePath(`/admin/events/${eventSlug}`)
    revalidatePath(`/admin/events/${eventSlug}/routing`)
    revalidatePath(`/events/${eventSlug}`)
    revalidatePath(`/events/${eventSlug}/breakouts`)
    revalidatePath(`/events/${eventSlug}/sessions/${breakoutId}`)
  }

  async function goOffAir(formData: FormData) {
    "use server"

    const rawTransition = formData.get("transitionType")
    let transitionType = readTransitionType(rawTransition)

    if (!rawTransition || rawTransition === "auto") {
      transitionType = "dip_to_black"
    }

    const transitionDurationMs = clampDuration(formData.get("transitionDuration"), 2600)

    await upsertEventRoutingState({
      eventId,
      mode: "announcement",
      destinationType: null,
      destinationSessionId: null,
      headline: readString(formData.get("headline"), "We’ll Be Right Back"),
      message: readString(
        formData.get("message"),
        "Returning attendees to the event home page."
      ),
      forceRedirect: true,
      transitionType,
      transitionDurationMs,
    })

    revalidatePath(`/admin/events/${eventSlug}`)
    revalidatePath(`/admin/events/${eventSlug}/routing`)
    revalidatePath(`/events/${eventSlug}`)
  }

  async function fireGeneralSessionCue(formData: FormData) {
    "use server"
    await goGeneralSession(formData)
  }

  async function fireSessionCue(formData: FormData) {
    "use server"
    await goToSession(formData)
  }

  async function fireBreakoutCue(formData: FormData) {
    "use server"
    await goToBreakout(formData)
  }

  async function fireOffAirCue(formData: FormData) {
    "use server"
    await goOffAir(formData)
  }

  async function clearTransitionState() {
    "use server"

    const current = await getEventRoutingState(eventId)
    if (!current) return

    await upsertEventRoutingState({
      eventId,
      mode: current.mode,
      activeBreakoutId: current.active_breakout_id,
      destinationType: current.destination_type,
      destinationSessionId: current.destination_session_id,
      headline: current.headline,
      message: current.message,
      forceRedirect: false,
      transitionType: current.transition_type,
      transitionDurationMs: current.transition_duration_ms,
      transitionActive: false,
      transitionStartedAt: null,
      updatedBy: current.updated_by ?? null,
    })

    revalidatePath(`/admin/events/${eventSlug}`)
    revalidatePath(`/admin/events/${eventSlug}/routing`)
    revalidatePath(`/events/${eventSlug}`)

    if (current.destination_session_id) {
      revalidatePath(`/events/${eventSlug}/sessions/${current.destination_session_id}`)
    }
  }

  async function loadRunOfShow() {
    "use server"

    const { data, error } = await supabaseAdmin
      .from("event_run_of_show")
      .select("cues")
      .eq("event_id", eventId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return Array.isArray(data?.cues) ? data.cues : []
  }

  async function saveRunOfShow(cues: unknown[]) {
    "use server"

    const { error } = await supabaseAdmin
      .from("event_run_of_show")
      .upsert(
        {
          event_id: eventId,
          cues,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      )

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`/admin/events/${eventSlug}`)
    revalidatePath(`/admin/events/${eventSlug}/routing`)
  }

  const { data: sessionRows, error: sessionError } = await supabaseAdmin
    .from("event_sessions")
    .select("id,title,is_general_session,session_kind")
    .eq("event_id", eventId)
    .order("title", { ascending: true })

  if (sessionError) {
    throw new Error(sessionError.message)
  }

  const sessionOptions: SessionOption[] = ((sessionRows || []) as any[]).map((row) => ({
    id: String(row.id),
    title: String(row.title || "Untitled Session"),
    kind:
      row?.is_general_session || row?.session_kind === "general"
        ? "general"
        : "session",
  }))

  const generalSessions = sessionOptions
    .filter((session) => session.kind === "general")
    .map(({ id, title }) => ({ id, title }))

  const sessions = sessionOptions
    .filter((session) => session.kind === "session")
    .map(({ id, title }) => ({ id, title }))

  const { data: breakoutRows, error: breakoutError } = await supabaseAdmin
    .from("event_breakouts")
    .select("id,title")
    .eq("event_id", eventId)
    .order("title", { ascending: true })

  if (breakoutError) {
    throw new Error(breakoutError.message)
  }

  const breakouts: BreakoutOption[] = ((breakoutRows || []) as any[]).map((row) => ({
    id: String(row.id),
    title: String(row.title || "Untitled Breakout"),
  }))

  const [liveState, initialRunOfShow] = await Promise.all([
    getEventRoutingState(eventId),
    loadRunOfShow(),
  ])

  return (
    <div className="space-y-6 p-6">
      <EventAdminNav eventId={eventId} />

      <MissionControlClient
        routingState={liveState}
        sessions={sessions}
        breakouts={breakouts}
        generalSessions={generalSessions}
        sessionMap={Object.fromEntries(sessions.map((s) => [s.id, s.title]))}
        breakoutMap={Object.fromEntries(breakouts.map((b) => [b.id, b.title]))}
        generalSessionMap={Object.fromEntries(generalSessions.map((s) => [s.id, s.title]))}
        initialRunOfShow={Array.isArray(initialRunOfShow) ? initialRunOfShow : []}
        saveRunOfShow={saveRunOfShow}
        goGeneralSession={goGeneralSession}
        goToSession={goToSession}
        goToBreakout={goToBreakout}
        goOffAir={goOffAir}
        fireGeneralSessionCue={fireGeneralSessionCue}
        fireSessionCue={fireSessionCue}
        fireBreakoutCue={fireBreakoutCue}
        fireOffAirCue={fireOffAirCue}
        clearTransitionState={clearTransitionState}
      />
    </div>
  )
}