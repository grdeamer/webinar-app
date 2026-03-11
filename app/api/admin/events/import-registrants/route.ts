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

export async function POST(req: Request) {
  try {
    await requireAdmin()

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
      sessionMap.set(`${session.event_id}::${String(session.code).toUpperCase()}`, session)
    }

    const seenEventEmail = new Set<string>()
    const validatedRows = parsed.rows.map((row: ParsedRegistrantImportRow) => {
      const errors = [...row.errors]

      const event =
        forcedEventId
          ? Array.from(eventMap.values())[0] || null
          : (row.eventSlug ? eventMap.get(row.eventSlug) || null : null)

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

      const resolvedSessionIds: string[] = []
      const unknownSessionCodes: string[] = []

      if (event) {
        for (const code of row.sessionCodes) {
          const key = `${event.id}::${code}`
          const session = sessionMap.get(key)
          if (!session) {
            unknownSessionCodes.push(code)
          } else {
            resolvedSessionIds.push(session.id)
          }
        }
      }

      if (unknownSessionCodes.length) {
        errors.push(`Unknown session code(s): ${unknownSessionCodes.join(", ")}`)
      }

      return {
        ...row,
        resolvedEventId: event?.id || null,
        resolvedSessionIds,
        errors,
      }
    })

    const invalidRows = validatedRows.filter((r) => r.errors.length > 0)
    if (invalidRows.length) {
      return NextResponse.json(
        {
          error: "Import contains invalid rows. Run preview or fix the CSV first.",
          summary: {
            totalRows: validatedRows.length,
            validRows: validatedRows.length - invalidRows.length,
            invalidRows: invalidRows.length,
          },
          rowErrors: invalidRows.map((r) => ({
            rowNumber: r.rowNumber,
            email: r.email,
            errors: r.errors,
          })),
        },
        { status: 400 }
      )
    }

    let registrantsCreated = 0
    let registrantsUpdated = 0
    let assignmentsWritten = 0

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