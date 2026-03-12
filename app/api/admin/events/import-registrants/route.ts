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

function uniqueSessionCodes(codes: string[]) {
  return Array.from(
    new Set((codes || []).map(normalizeSessionCode).filter(Boolean))
  )
}

async function ensureEventSessionsExist(
  eventId: string,
  codes: string[],
  sessionMap: Map<string, SessionRow>
) {
  const normalizedCodes = uniqueSessionCodes(codes)
  if (!normalizedCodes.length) return

  const missingCodes = normalizedCodes.filter((code) => {
    const key = `${eventId}::${code}`
    return !sessionMap.has(key)
  })

  if (!missingCodes.length) return

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("event_sessions")
    .select("id,event_id,code,title")
    .eq("event_id", eventId)
    .in("code", missingCodes)

  if (existingError) {
    throw new Error(existingError.message)
  }

  for (const row of (existingRows || []) as SessionRow[]) {
    sessionMap.set(`${row.event_id}::${normalizeSessionCode(row.code)}`, row)
  }

  const stillMissing = missingCodes.filter((code) => {
    const key = `${eventId}::${code}`
    return !sessionMap.has(key)
  })

  if (!stillMissing.length) return

  const insertRows = stillMissing.map((code) => ({
    event_id: eventId,
    code,
    title: `Session ${code}`,
  }))

  const { data: insertedRows, error: insertError } = await supabaseAdmin
    .from("event_sessions")
    .insert(insertRows)
    .select("id,event_id,code,title")

  if (insertError) {
    throw new Error(insertError.message)
  }

  for (const row of (insertedRows || []) as SessionRow[]) {
    sessionMap.set(`${row.event_id}::${normalizeSessionCode(row.code)}`, row)
  }
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

      eventMap.set(event.slug, event as EventRow)
    } else {
      const eventSlugs = Array.from(
        new Set(parsed.rows.map((r) => r.eventSlug).filter(Boolean) as string[])
      )

      const { data: events, error } = await supabaseAdmin
        .from("events")
        .select("id,slug")
        .in("slug", eventSlugs)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      eventMap = new Map((events || []).map((e) => [e.slug, e as EventRow]))
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

    const prevalidatedRows = parsed.rows.map((row: ParsedRegistrantImportRow) => {
      const errors = [...row.errors]

      const event =
        forcedEventId
          ? Array.from(eventMap.values())[0] || null
          : row.eventSlug
            ? eventMap.get(row.eventSlug) || null
            : null

      if (!event) {
        errors.push(`Unknown event slug: ${row.eventSlug || "(blank)"}`)
      }

      const dedupeKey = event ? `${event.id}::${row.email}` : `missing::${row.email}`
      if (row.email) {
        if (seenEventEmail.has(dedupeKey)) {
          errors.push("Duplicate email row for same event in this file")
        } else {
          seenEventEmail.add(dedupeKey)
        }
      }

      return {
        ...row,
        normalizedSessionCodes: uniqueSessionCodes(row.sessionCodes || []),
        resolvedEventId: event?.id || null,
        errors,
      }
    })

    const earlyInvalidRows = prevalidatedRows.filter((r) => r.errors.length > 0)
    if (earlyInvalidRows.length) {
      return NextResponse.json(
        {
          error: "Import contains invalid rows. Run preview or fix the CSV first.",
          summary: {
            totalRows: prevalidatedRows.length,
            validRows: prevalidatedRows.length - earlyInvalidRows.length,
            invalidRows: earlyInvalidRows.length,
          },
          rowErrors: earlyInvalidRows.map((r) => ({
            rowNumber: r.rowNumber,
            email: r.email,
            errors: r.errors,
          })),
        },
        { status: 400 }
      )
    }

    const eventToCodes = new Map<string, Set<string>>()
    for (const row of prevalidatedRows) {
      const eventId = row.resolvedEventId!
      if (!eventToCodes.has(eventId)) {
        eventToCodes.set(eventId, new Set<string>())
      }
      const bucket = eventToCodes.get(eventId)!
      for (const code of row.normalizedSessionCodes) {
        bucket.add(code)
      }
    }

    for (const [eventId, codeSet] of eventToCodes.entries()) {
      await ensureEventSessionsExist(eventId, Array.from(codeSet), sessionMap)
    }

    const validatedRows = prevalidatedRows.map((row) => {
      const resolvedSessionIds: string[] = []

      if (row.resolvedEventId) {
        for (const code of row.normalizedSessionCodes) {
          const key = `${row.resolvedEventId}::${code}`
          const session = sessionMap.get(key)
          if (session) {
            resolvedSessionIds.push(session.id)
          }
        }
      }

      return {
        ...row,
        resolvedSessionIds,
      }
    })

    let registrantsCreated = 0
    let registrantsUpdated = 0
    let assignmentsWritten = 0
    let sessionsAutoCreated = 0

    {
      const uniqueSessionKeys = new Set<string>()
      for (const row of validatedRows) {
        for (const code of row.normalizedSessionCodes) {
          uniqueSessionKeys.add(`${row.resolvedEventId}::${code}`)
        }
      }

      let existingBefore = 0
      for (const original of sessionRows) {
        const key = `${original.event_id}::${normalizeSessionCode(original.code)}`
        if (uniqueSessionKeys.has(key)) existingBefore++
      }

      let existingAfter = 0
      for (const key of uniqueSessionKeys) {
        if (sessionMap.has(key)) existingAfter++
      }

      sessionsAutoCreated = Math.max(0, existingAfter - existingBefore)
    }

    for (const row of validatedRows) {
      const eventId = row.resolvedEventId!
      const upsertPayload = {
        event_id: eventId,
        email: row.email,
        first_name: row.firstName,
        last_name: row.lastName,
        tag: row.tag,
        notes: row.notes,
      }

      const { data: existingRegistrant } = await supabaseAdmin
        .from("event_registrants")
        .select("id")
        .eq("event_id", eventId)
        .eq("email", row.email)
        .maybeSingle()

      const { data: registrant, error: upsertError } = await supabaseAdmin
        .from("event_registrants")
        .upsert(upsertPayload, { onConflict: "event_id,email" })
        .select("id")
        .single()

      if (upsertError || !registrant?.id) {
        return NextResponse.json(
          {
            error: `Failed to upsert registrant for ${row.email}`,
            details: upsertError?.message || "Unknown error",
            rowNumber: row.rowNumber,
          },
          { status: 400 }
        )
      }

      if (existingRegistrant?.id) registrantsUpdated++
      else registrantsCreated++

      const registrantId = registrant.id

      const { error: deleteError } = await supabaseAdmin
        .from("event_registrant_sessions")
        .delete()
        .eq("registrant_id", registrantId)

      if (deleteError) {
        return NextResponse.json(
          {
            error: `Failed clearing existing session assignments for ${row.email}`,
            details: deleteError.message,
            rowNumber: row.rowNumber,
          },
          { status: 400 }
        )
      }

      if (row.resolvedSessionIds.length) {
        const insertRows = row.resolvedSessionIds.map((sessionId) => ({
          event_id: eventId,
          registrant_id: registrantId,
          session_id: sessionId,
        }))

        const { error: insertError } = await supabaseAdmin
          .from("event_registrant_sessions")
          .insert(insertRows)

        if (insertError) {
          return NextResponse.json(
            {
              error: `Failed inserting session assignments for ${row.email}`,
              details: insertError.message,
              rowNumber: row.rowNumber,
            },
            { status: 400 }
          )
        }

        assignmentsWritten += insertRows.length
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: validatedRows.length,
        registrantsCreated,
        registrantsUpdated,
        assignmentsWritten,
        sessionsAutoCreated,
      },
    })
  } catch (err: any) {
    console.error("import-registrants error:", err)
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    )
  }
}