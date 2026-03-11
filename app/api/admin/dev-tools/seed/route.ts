import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/requireAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

function slugify(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function isMissingColumnError(message: string) {
  const m = String(message || "").toLowerCase()
  return m.includes("could not find the") || m.includes("schema cache") || m.includes("column")
}

async function updateWebinarOptionalFieldsSafe(
  webinarId: string,
  fields: Record<string, any>
) {
  const applied: string[] = []
  const skipped: string[] = []

  for (const [key, value] of Object.entries(fields)) {
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      continue
    }

    const { error } = await supabaseAdmin
      .from("webinars")
      .update({ [key]: value })
      .eq("id", webinarId)

    if (error) {
      if (isMissingColumnError(error.message)) {
        skipped.push(key)
        continue
      }
      throw new Error(error.message)
    }

    applied.push(key)
  }

  return { applied, skipped }
}

async function ensureEvent(slug: string, title: string) {
  const normalizedSlug = slugify(slug || "test-event")
  const safeTitle = String(title || "Test Event").trim() || "Test Event"

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("events")
    .select("id,slug,title")
    .eq("slug", normalizedSlug)
    .order("start_at", { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing?.id) return existing

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("events")
    .insert({
      slug: normalizedSlug,
      title: safeTitle,
      description: "Seeded event for portal testing",
    })
    .select("id,slug,title")
    .single()

  if (insertError) throw new Error(insertError.message)
  return inserted
}

async function ensureWebinar(webinarTitle: string) {
  const safeTitle = String(webinarTitle || "Welcome Session").trim() || "Welcome Session"

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("webinars")
    .select("id,title")
    .eq("title", safeTitle)
    .order("webinar_date", { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing?.id) return existing

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("webinars")
    .insert({
      title: safeTitle,
      description: "Seeded webinar session",
    })
    .select("id,title")
    .single()

  if (insertError) throw new Error(insertError.message)
  return inserted
}

async function assignAttendeeToWebinarSafe(webinarId: string, attendeeEmail: string) {
  const email = attendeeEmail.trim().toLowerCase()

  try {
    const { error } = await supabaseAdmin
      .from("event_user_webinars")
      .upsert({ webinar_id: webinarId, email }, { onConflict: "webinar_id,email" })

    if (!error) return { ok: true, mode: "event_user_webinars(webinar_id,email)" }
  } catch {}

  try {
    const { error } = await supabaseAdmin
      .from("user_webinars")
      .upsert({ webinar_id: webinarId, email }, { onConflict: "webinar_id,email" })

    if (!error) return { ok: true, mode: "user_webinars(webinar_id,email)" }
  } catch {}

  return { ok: false, mode: "none" }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAdmin()

    // If requireAdmin returns a Response/NextResponse, return it.
    if (authResult instanceof Response) {
      return authResult
    }

    const body = await req.json().catch(() => ({}))

    const eventSlug = slugify(body?.eventSlug || "test-event")
    const eventTitle = String(body?.eventTitle || "Test Event").trim()
    const userEmail = String(body?.userEmail || "attendee@testevent.com")
      .trim()
      .toLowerCase()
    const webinarTitle = String(body?.webinarTitle || "Welcome Session").trim()

    const posterUrl = String(body?.posterUrl || body?.thumbnailUrl || "").trim()
    const mp4Url = String(body?.mp4Url || body?.playbackMp4Url || "").trim()
    const m3u8Url = String(body?.m3u8Url || body?.playbackM3u8Url || "").trim()
    const speakerNames = String(body?.speakerNames || body?.speaker || "").trim()

    const eventRow = await ensureEvent(eventSlug, eventTitle)
    const webinarRow = await ensureWebinar(webinarTitle)

    const playbackType = m3u8Url ? "hls" : mp4Url ? "mp4" : null

    const optionalUpdateResult = await updateWebinarOptionalFieldsSafe(webinarRow.id, {
      thumbnail_url: posterUrl || null,
      playback_type: playbackType,
      playback_mp4_url: mp4Url || null,
      playback_m3u8_url: m3u8Url || null,
      speaker: speakerNames || null,
      speaker_cards: speakerNames
        ? String(speakerNames)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((name) => ({ name }))
        : null,
    })

    const webinarAssignment = await assignAttendeeToWebinarSafe(webinarRow.id, userEmail)

    return json({
      ok: true,
      event: {
        id: eventRow.id,
        slug: eventRow.slug,
        title: eventRow.title,
      },
      webinar: {
        id: webinarRow.id,
        title: webinarRow.title,
      },
      attendee: {
        email: userEmail,
      },
      optionalFields: optionalUpdateResult,
      assignments: {
        webinar: webinarAssignment,
      },
      links: {
        eventHome: `/events/${eventRow.slug}`,
        lobby: `/events/${eventRow.slug}/lobby`,
      },
    })
  } catch (error: any) {
    return json(
      {
        error: error?.message || "Seed failed",
      },
      500
    )
  }
}