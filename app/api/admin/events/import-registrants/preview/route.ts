import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/requireAdmin"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { parseRegistrantCsv, type ParsedRegistrantImportRow } from "@/lib/imports/registrantCsv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type EventRow = {
  id: string
  slug: string
}

type SessionRow = {
  id: string
  event_id: string
  code: string
  title: string
}

function normalizeSessionCode(value: string) {
  return String(value || "").trim().toUpperCase()
}

function normalizeEventSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .slice(0, 200) || "New Event"
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAdmin()
    if (authResult instanceof Response) return authResult

    const form = await req.formData()
    const file = form.get("file")
    const forcedEventId = String(form.get("event_id") || "").trim() || null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
    }

    const csvText = await file.text()
    const parsed = parseRegistrantCsv(csvText)

    if (!parsed.rows.length) {
      return NextResponse.json({ error: "CSV has no rows" }, { status: 400 })
    }

    let eventMap = new Map<string, EventRow>()

    if (forcedEventId) {
      const { data: event, error } = await supabaseAdmin
        .from("events")
        .select("id,slug")
        .eq("id", forcedEventId)
        .maybeSingle()

      if (error || !event) {
        return NextResponse.json({ error: "Provided event_id was not found" }, { status: 400 })
      }

      eventMap.set(normalizeEventSlug(event.slug), event as EventRow)
    } else {
      const eventSlugs = Array.from(
        new Set(parsed.rows.map((r) => normalizeEventSlug(r.eventSlug || "")).filter(Boolean))
      )

      const { data: events, error } = await supabaseAdmin
        .from("events")
        .select("id,slug")
        .in("slug", eventSlugs)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      eventMap = new Map(
        (events || []).map((e) => [normalizeEventSlug(e.slug), e as EventRow])
      )
    }

    const eventIds = Array.from(new Set(Array.from(eventMap.values()).map((e) => e.id)))

    let sessionRows: SessionRow[] = []
    if (eventIds.length) {
      const { data: sessions, error } = await supabaseAdmin
        .from("event_sessions")
        .select("id,event_id,code,title")
        .in("event_id", eventIds)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      sessionRows = (sessions || []) as SessionRow[]
    }

    const sessionMap = new Map<string, SessionRow>()
    for (const session of sessionRows) {
      sessionMap.set(
        `${session.event_id}::${normalizeSessionCode(session.code)}`,
        session
      )
    }

    const seenEventEmail = new Set<string>()
    const eventsToAutoCreateMap = new Map<string, { slug: string; title: string }>()
    const sessionAutoCreateKeys = new Set<string>()

    const previewRows = parsed.rows.map((row: ParsedRegistrantImportRow) => {
      const errors = [...row.errors]

      const normalizedSlug = normalizeEventSlug(row.eventSlug || "")
      const existingEvent =
        forcedEventId
          ? Array.from(eventMap.values())[0] || null
          : normalizedSlug
            ? eventMap.get(normalizedSlug) || null
            : null

      const willAutoCreateEvent =
        !forcedEventId && normalizedSlug && !existingEvent ? true : false

      if (!forcedEventId && !normalizedSlug) {
        errors.push(`Unknown event slug: ${row.eventSlug || "(blank)"}`)
      }

      if (willAutoCreateEvent) {
        eventsToAutoCreateMap.set(normalizedSlug, {
          slug: normalizedSlug,
          title: titleFromSlug(normalizedSlug),
        })
      }

      const dedupeEventKey = existingEvent?.id || (willAutoCreateEvent ? normalizedSlug : "missing")
      const dedupeKey = `${dedupeEventKey}::${row.email}`

      if (row.email) {
        if (seenEventEmail.has(dedupeKey)) {
          errors.push("Duplicate email row for same event in this file")
        } else {
          seenEventEmail.add(dedupeKey)
        }
      }

      const resolvedSessionIds: string[] = []
      const missingSessionCodes: string[] = []

      if (existingEvent) {
        for (const rawCode of row.sessionCodes) {
          const code = normalizeSessionCode(rawCode)
          const key = `${existingEvent.id}::${code}`
          const session = sessionMap.get(key)

          if (session) {
            resolvedSessionIds.push(session.id)
          } else if (code) {
            missingSessionCodes.push(code)
            sessionAutoCreateKeys.add(`${existingEvent.id}::${code}`)
          }
        }
      } else if (willAutoCreateEvent) {
        for (const rawCode of row.sessionCodes) {
          const code = normalizeSessionCode(rawCode)
          if (code) {
            missingSessionCodes.push(code)
            sessionAutoCreateKeys.add(`${normalizedSlug}::${code}`)
          }
        }
      }

      return {
        rowNumber: row.rowNumber,
        eventSlug: row.eventSlug,
        resolvedEventId: existingEvent?.id || null,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        tag: row.tag,
        notes: row.notes,
        sessionCodes: row.sessionCodes,
        resolvedSessionIds,
        missingSessionCodes,
        willAutoCreateEvent,
        autoCreateEventTitle: willAutoCreateEvent ? titleFromSlug(normalizedSlug) : null,
        valid: errors.length === 0,
        errors,
      }
    })

    const validRows = previewRows.filter((r) => r.valid)
    const invalidRows = previewRows.filter((r) => !r.valid)

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: previewRows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        eventsDetected: eventMap.size,
        sessionsToAutoCreate: sessionAutoCreateKeys.size,
        eventsToAutoCreate: eventsToAutoCreateMap.size,
      },
      autoCreate: {
        events: Array.from(eventsToAutoCreateMap.values()),
      },
      rows: previewRows,
    })
  } catch (err: any) {
    console.error("import-registrants preview error:", err)
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    )
  }
}