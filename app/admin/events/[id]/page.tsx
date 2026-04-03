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
  if (raw === "wipe" || raw === "zoom" || raw === "dip_to_black") return raw
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

    const transitionType = readTransitionType(formData.get("transitionType"))
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

  async function goOffAir(formData: FormData) {
    "use server"

    const transitionType = readTransitionType(formData.get("transitionType"))
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

  const liveState = await getEventLiveState(eventId)

  return (
    <MissionControlClient
      liveState={liveState}
      goGeneralSession={goGeneralSession}
      goOffAir={goOffAir}
    />
  )
}