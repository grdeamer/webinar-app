import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getEventLiveState, upsertEventLiveState } from "@/lib/app/liveState"
import MissionControlClient from "./MissionControlClient"

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
    raw === "dip_to_black"
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

    const rawTransition = formData.get("transitionType")
    let transitionType = readTransitionType(rawTransition)

    if (!rawTransition || rawTransition === "auto") {
      transitionType = "zoom"
    }

    const transitionDurationMs = clampDuration(formData.get("transitionDuration"), 3000)
    const customHeadline = readString(formData.get("headline"))
    const customMessage = readString(formData.get("message"))

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
        "No General Session session row found. Add a session in event_sessions marked is_general_session=true or session_kind=general."
      )
    }

    await upsertEventLiveState({
      eventId,
      mode: "general_session",
      destinationType: "session",
      destinationSessionId: generalSession.id,
      headline: customHeadline || generalSession.title || "Now Entering General Session",
      message: customMessage || "The keynote is beginning now.",
      forceRedirect: true,
      transitionType,
      transitionDurationMs,
    })

    revalidatePath(`/admin/events/${eventSlug}`)
    revalidatePath(`/events/${eventSlug}`)
    revalidatePath(`/events/${eventSlug}/sessions/${generalSession.id}`)
  }

  async function goToSession(formData: FormData) {
    "use server"

    const sessionId = String(formData.get("sessionId") || "")

    if (!sessionId) {
      throw new Error("Missing sessionId")
    }

    const rawTransition = formData.get("transitionType")
    let transitionType = readTransitionType(rawTransition)

    if (!rawTransition || rawTransition === "auto") {
      transitionType = "wipe_left"
    }

    const transitionDurationMs = clampDuration(formData.get("transitionDuration"), 2200)
    const customHeadline = readString(formData.get("headline"))
    const customMessage = readString(formData.get("message"))

    await upsertEventLiveState({
      eventId,
      mode: "session",
      destinationType: "session",
      destinationSessionId: sessionId,
      headline: customHeadline || "Entering Session",
      message: customMessage || "Your next session is opening.",
      forceRedirect: true,
      transitionType,
      transitionDurationMs,
    })

    revalidatePath(`/admin/events/${eventSlug}`)
    revalidatePath(`/events/${eventSlug}`)
    revalidatePath(`/events/${eventSlug}/sessions/${sessionId}`)
  }

  async function goToBreakout(formData: FormData) {
    "use server"

    const breakoutId = String(formData.get("breakoutId") || "")

    if (!breakoutId) {
      throw new Error("Missing breakoutId")
    }

    const rawTransition = formData.get("transitionType")
    let transitionType = readTransitionType(rawTransition)

    if (!rawTransition || rawTransition === "auto") {
      transitionType = "wipe_right"
    }

    const transitionDurationMs = clampDuration(formData.get("transitionDuration"), 2200)
    const customHeadline = readString(formData.get("headline"))
    const customMessage = readString(formData.get("message"))

    await upsertEventLiveState({
      eventId,
      mode: "breakout",
      destinationType: "session",
      destinationSessionId: breakoutId,
      headline: customHeadline || "Entering Breakout",
      message: customMessage || "We’re moving you into a breakout room.",
      forceRedirect: true,
      transitionType,
      transitionDurationMs,
    })

    revalidatePath(`/admin/events/${eventSlug}`)
    revalidatePath(`/events/${eventSlug}`)
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
    const customHeadline = readString(formData.get("headline"))
    const customMessage = readString(formData.get("message"))

    await upsertEventLiveState({
      eventId,
      mode: "off_air",
      destinationType: null,
      destinationSessionId: null,
      headline: customHeadline || "We’ll Be Right Back",
      message: customMessage || "Returning attendees to the event home page.",
      forceRedirect: true,
      transitionType,
      transitionDurationMs,
    })

    revalidatePath(`/admin/events/${eventSlug}`)
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

    const current = await getEventLiveState(eventId)
    if (!current) return

    await upsertEventLiveState({
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
  }

  const { data: sessionRows, error: sessionError } = await supabaseAdmin
    .from("event_sessions")
    .select("id,title,is_general_session,session_kind")
    .eq("event_id", eventId)
    .order("title", { ascending: true })

  if (sessionError) {
    throw new Error(sessionError.message)
  }

  const sessions =
    (sessionRows || [])
      .filter((row: any) => !row?.is_general_session && row?.session_kind !== "general")
      .map((row: any) => ({
        id: String(row.id),
        title: String(row.title || "Untitled Session"),
      })) ?? []

  const { data: breakoutRows, error: breakoutError } = await supabaseAdmin
    .from("event_breakouts")
    .select("id,title")
    .eq("event_id", eventId)
    .order("title", { ascending: true })

  if (breakoutError) {
    throw new Error(breakoutError.message)
  }

  const breakouts =
    (breakoutRows || []).map((row: any) => ({
      id: String(row.id),
      title: String(row.title || "Untitled Breakout"),
    })) ?? []

  const [liveState, initialRunOfShow] = await Promise.all([
    getEventLiveState(eventId),
    loadRunOfShow(),
  ])

  return (
    <MissionControlClient
      liveState={liveState}
      sessions={sessions}
      breakouts={breakouts}
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
  )
}